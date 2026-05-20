# 家庭记账小程序 - 第一阶段实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现用户登录、角色选择、支出记账（添加/查询）、分类管理、首页概览

**Architecture:** 基于微信小程序原生开发 + 微信云开发（云函数 + 云数据库），使用云数据库集合存储用户、家庭、支出、分类数据

**Tech Stack:** 微信小程序、微信云开发、wx-server-sdk、echarts-for-weixin（后续阶段使用）

---

## 文件结构规划

```
miniprogram/
├── pages/
│   ├── index/           # 现有首页，改造为记账入口
│   ├── home/            # 新建：首页（支出概览）
│   ├── expense/         # 新建：记账页
│   ├── expenseList/     # 新建：支出明细页
│   └── profile/         # 新建：我的页（角色管理）
├── components/          # 已有组件目录
├── app.js               # 修改：云开发初始化
├── app.json             # 修改：页面路由
└── app.wxss             # 修改：全局样式

cloudfunctions/
├── login/               # 新建：用户登录
├── addExpense/          # 新建：添加支出
├── getExpenses/         # 新建：查询支出
├── deleteExpense/       # 新建：删除支出
├── addCategory/         # 新建：添加分类
├── getCategories/       # 新建：获取分类
└── initDefaultData/     # 新建：初始化默认分类
```

---

## Task 1: 创建云数据库集合

**Files:**
- 云开发控制台操作

- [ ] **Step 1: 在云开发控制台创建集合**

在云开发控制台 → 数据库中，创建以下集合：
1. `users` - 用户表
2. `families` - 家庭表
3. `expenses` - 支出表
4. `categories` - 分类表

创建时注意：
- 每个集合创建后，设置权限为「所有用户可读，仅创建者可写」
- 或者先创建，后续通过云函数操作（云函数有管理员权限）

- [ ] **Step 2: 验证集合创建成功**

在云开发控制台中确认4个集合都已创建。

---

## Task 2: 创建 login 云函数

**Files:**
- Create: `cloudfunctions/login/index.js`
- Create: `cloudfunctions/login/package.json`

- [ ] **Step 1: 编写 login 云函数代码**

```javascript
// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  try {
    // 查询用户是否已注册
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    if (userRes.data.length > 0) {
      // 已注册，返回用户信息
      return {
        success: true,
        data: userRes.data[0],
        isNew: false
      }
    }
    
    // 新用户，需要注册
    return {
      success: true,
      data: { openid: OPENID },
      isNew: true,
      message: '请先选择角色'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}
```

```json
// cloudfunctions/login/package.json
{
  "name": "login",
  "version": "1.0.0",
  "description": "用户登录",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 安装依赖并部署**

```bash
cd cloudfunctions/login
npm install wx-server-sdk
```

在微信开发者工具中，右键 `cloudfunctions/login` → 上传并部署：云端安装依赖

- [ ] **Step 3: 测试云函数**

在小程序前端调用测试：
```javascript
wx.cloud.callFunction({
  name: 'login'
}).then(res => {
  console.log('login result:', res.result)
})
```

---

## Task 3: 创建 register 云函数

**Files:**
- Create: `cloudfunctions/register/index.js`
- Create: `cloudfunctions/register/package.json`

- [ ] **Step 1: 编写 register 云函数代码**

```javascript
// cloudfunctions/register/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { nickname, avatarUrl, role, familyName } = event
  
  try {
    let familyId = ''
    
    if (role === 'parent') {
      // 家长创建新家庭
      const familyRes = await db.collection('families').add({
        data: {
          name: familyName || '我的家庭',
          creatorId: OPENID,
          members: [OPENID],
          createdAt: db.serverDate()
        }
      })
      familyId = familyRes._id
      
      // 初始化默认分类
      await initDefaultCategories(familyId)
    } else {
      // 孩子需要传入家庭ID（由家长分享）
      familyId = event.familyId
      
      // 将孩子加入家庭
      await db.collection('families').doc(familyId).update({
        data: {
          members: db.command.push(OPENID)
        }
      })
    }
    
    // 创建用户
    const userRes = await db.collection('users').add({
      data: {
        openid: OPENID,
        nickname,
        avatarUrl,
        role,
        familyId,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    
    return {
      success: true,
      data: {
        _id: userRes._id,
        openid: OPENID,
        nickname,
        avatarUrl,
        role,
        familyId
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}

async function initDefaultCategories(familyId) {
  const db = cloud.database()
  const defaultCategories = [
    { name: '餐饮', icon: 'food', color: '#FF6B6B', isDefault: true },
    { name: '交通', icon: 'transport', color: '#4ECDC4', isDefault: true },
    { name: '购物', icon: 'shopping', color: '#45B7D1', isDefault: true },
    { name: '娱乐', icon: 'entertainment', color: '#96CEB4', isDefault: true },
    { name: '教育', icon: 'education', color: '#FFEAA7', isDefault: true },
    { name: '医疗', icon: 'medical', color: '#DDA0DD', isDefault: true },
    { name: '住房', icon: 'housing', color: '#98D8C8', isDefault: true },
    { name: '其他', icon: 'other', color: '#CCCCCC', isDefault: true }
  ]
  
  const tasks = defaultCategories.map(cat => 
    db.collection('categories').add({
      data: {
        ...cat,
        familyId,
        createdAt: db.serverDate()
      }
    })
  )
  
  await Promise.all(tasks)
}
```

```json
// cloudfunctions/register/package.json
{
  "name": "register",
  "version": "1.0.0",
  "description": "用户注册",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 安装依赖并部署**

在微信开发者工具中，右键 `cloudfunctions/register` → 上传并部署：云端安装依赖

---

## Task 4: 创建 addExpense 云函数

**Files:**
- Create: `cloudfunctions/addExpense/index.js`
- Create: `cloudfunctions/addExpense/package.json`

- [ ] **Step 1: 编写 addExpense 云函数代码**

```javascript
// cloudfunctions/addExpense/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { amount, category, date, memberId, note, imageUrl, paymentMethod, isShared } = event
  
  try {
    const result = await db.collection('expenses').add({
      data: {
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        memberId: memberId || OPENID,
        note: note || '',
        imageUrl: imageUrl || '',
        paymentMethod: paymentMethod || '其他',
        isShared: isShared || false,
        createdBy: OPENID,
        createdAt: db.serverDate()
      }
    })
    
    return {
      success: true,
      data: { _id: result._id },
      message: '添加成功'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}
```

```json
// cloudfunctions/addExpense/package.json
{
  "name": "addExpense",
  "version": "1.0.0",
  "description": "添加支出",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 安装依赖并部署**

在微信开发者工具中，右键 `cloudfunctions/addExpense` → 上传并部署：云端安装依赖

---

## Task 5: 创建 getExpenses 云函数

**Files:**
- Create: `cloudfunctions/getExpenses/index.js`
- Create: `cloudfunctions/getExpenses/package.json`

- [ ] **Step 1: 编写 getExpenses 云函数代码**

```javascript
// cloudfunctions/getExpenses/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { familyId, memberId, category, startDate, endDate, limit = 50, skip = 0 } = event
  
  try {
    let where = { familyId }
    
    if (memberId) {
      where.memberId = memberId
    }
    if (category) {
      where.category = category
    }
    if (startDate && endDate) {
      where.date = _.gte(new Date(startDate)).and(_.lte(new Date(endDate)))
    }
    
    const result = await db.collection('expenses')
      .where(where)
      .orderBy('date', 'desc')
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取分类信息
    const categoriesRes = await db.collection('categories').where({ familyId }).get()
    const categoryMap = {}
    categoriesRes.data.forEach(cat => {
      categoryMap[cat._id] = cat
    })
    
    // 获取家庭成员信息
    const familyRes = await db.collection('families').doc(familyId).get()
    const members = familyRes.data.members || []
    const usersRes = await db.collection('users').where({
      openid: _.in(members)
    }).get()
    const userMap = {}
    usersRes.data.forEach(user => {
      userMap[user.openid] = user
    })
    
    // 合并数据
    const expenses = result.data.map(item => ({
      ...item,
      categoryName: categoryMap[item.category]?.name || '未知分类',
      categoryColor: categoryMap[item.category]?.color || '#999',
      memberName: userMap[item.memberId]?.nickname || '未知成员'
    }))
    
    return {
      success: true,
      data: expenses,
      total: result.data.length
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}
```

```json
// cloudfunctions/getExpenses/package.json
{
  "name": "getExpenses",
  "version": "1.0.0",
  "description": "查询支出",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 安装依赖并部署**

在微信开发者工具中，右键 `cloudfunctions/getExpenses` → 上传并部署：云端安装依赖

---

## Task 6: 创建 getCategories 云函数

**Files:**
- Create: `cloudfunctions/getCategories/index.js`
- Create: `cloudfunctions/getCategories/package.json`

- [ ] **Step 1: 编写 getCategories 云函数代码**

```javascript
// cloudfunctions/getCategories/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { familyId } = event
  
  try {
    const result = await db.collection('categories').where({
      familyId
    }).orderBy('createdAt', 'asc').get()
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}
```

```json
// cloudfunctions/getCategories/package.json
{
  "name": "getCategories",
  "version": "1.0.0",
  "description": "获取分类",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 安装依赖并部署**

在微信开发者工具中，右键 `cloudfunctions/getCategories` → 上传并部署：云端安装依赖

---

## Task 7: 修改 app.js 添加全局状态管理

**Files:**
- Modify: `miniprogram/app.js`

- [ ] **Step 1: 修改 app.js**

```javascript
// miniprogram/app.js
App({
  globalData: {
    userInfo: null,
    familyInfo: null,
    isLoggedIn: false
  },
  
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'liwen-test-0307-d2fomy65028e2f19',
        traceUser: true
      })
    }
    
    // 自动登录
    this.autoLogin()
  },
  
  autoLogin: function () {
    wx.cloud.callFunction({
      name: 'login'
    }).then(res => {
      if (res.result.success && !res.result.isNew) {
        this.globalData.userInfo = res.result.data
        this.globalData.isLoggedIn = true
        
        // 获取家庭信息
        return this.getFamilyInfo(res.result.data.familyId)
      }
    }).then(familyRes => {
      if (familyRes) {
        this.globalData.familyInfo = familyRes
      }
    }).catch(err => {
      console.error('自动登录失败:', err)
    })
  },
  
  getFamilyInfo: function (familyId) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()
      db.collection('families').doc(familyId).get().then(res => {
        resolve(res.data)
      }).catch(reject)
    })
  }
})
```

---

## Task 8: 修改 app.json 添加新页面路由

**Files:**
- Modify: `miniprogram/app.json`

- [ ] **Step 1: 修改 app.json**

```json
{
  "pages": [
    "pages/home/home",
    "pages/index/index",
    "pages/expense/expense",
    "pages/expenseList/expenseList",
    "pages/profile/profile",
    "pages/chatBot/chatBot",
    "pages/foodBuy/foodBuy"
  ],
  "window": {
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "家庭记账",
    "backgroundColor": "#eeeeee",
    "backgroundTextStyle": "light",
    "enablePullDownRefresh": true
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#07c160",
    "backgroundColor": "#ffffff",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/home/home",
        "text": "首页",
        "iconPath": "imgs/home.png",
        "selectedIconPath": "imgs/home-active.png"
      },
      {
        "pagePath": "pages/expense/expense",
        "text": "记账",
        "iconPath": "imgs/add.png",
        "selectedIconPath": "imgs/add-active.png"
      },
      {
        "pagePath": "pages/expenseList/expenseList",
        "text": "明细",
        "iconPath": "imgs/list.png",
        "selectedIconPath": "imgs/list-active.png"
      },
      {
        "pagePath": "pages/profile/profile",
        "text": "我的",
        "iconPath": "imgs/profile.png",
        "selectedIconPath": "imgs/profile-active.png"
      }
    ]
  },
  "sitemapLocation": "sitemap.json",
  "style": "v2",
  "lazyCodeLoading": "requiredComponents"
}
```

注意：需要准备 tabBar 图标文件（可以先用现有图标替代）

---

## Task 9: 创建首页 (pages/home/home)

**Files:**
- Create: `miniprogram/pages/home/home.js`
- Create: `miniprogram/pages/home/home.wxml`
- Create: `miniprogram/pages/home/home.wxss`
- Create: `miniprogram/pages/home/home.json`

- [ ] **Step 1: 创建 home.js**

```javascript
// miniprogram/pages/home/home.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    todayAmount: 0,
    monthAmount: 0,
    recentExpenses: [],
    isLoading: true
  },

  onLoad: function () {
    this.checkLogin()
  },

  onShow: function () {
    if (app.globalData.isLoggedIn) {
      this.loadData()
    }
  },

  checkLogin: function () {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/index/index'
      })
      return
    }
    this.setData({ userInfo })
    this.loadData()
  },

  loadData: function () {
    this.setData({ isLoading: true })
    this.loadTodayExpenses()
    this.loadMonthExpenses()
    this.loadRecentExpenses()
  },

  loadTodayExpenses: function () {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const db = wx.cloud.database()
    const _ = db.command
    
    db.collection('expenses').where({
      date: _.gte(today),
      familyId: app.globalData.userInfo.familyId
    }).get().then(res => {
      const amount = res.data.reduce((sum, item) => sum + item.amount, 0)
      this.setData({ todayAmount: amount.toFixed(2) })
    })
  },

  loadMonthExpenses: function () {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const db = wx.cloud.database()
    const _ = db.command
    
    db.collection('expenses').where({
      date: _.gte(monthStart),
      familyId: app.globalData.userInfo.familyId
    }).get().then(res => {
      const amount = res.data.reduce((sum, item) => sum + item.amount, 0)
      this.setData({ monthAmount: amount.toFixed(2), isLoading: false })
    })
  },

  loadRecentExpenses: function () {
    wx.cloud.callFunction({
      name: 'getExpenses',
      data: {
        familyId: app.globalData.userInfo.familyId,
        limit: 5
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({ recentExpenses: res.result.data })
      }
    })
  },

  goToExpense: function () {
    wx.switchTab({
      url: '/pages/expense/expense'
    })
  },

  goToList: function () {
    wx.switchTab({
      url: '/pages/expenseList/expenseList'
    })
  }
})
```

- [ ] **Step 2: 创建 home.wxml**

```html
<!-- miniprogram/pages/home/home.wxml -->
<view class="container">
  <!-- 用户信息 -->
  <view class="user-card">
    <image class="avatar" src="{{userInfo.avatarUrl || '/imgs/default-avatar.png'}}" />
    <view class="user-info">
      <text class="nickname">{{userInfo.nickname || '用户'}}</text>
      <text class="role">{{userInfo.role === 'parent' ? '家长' : '孩子'}}</text>
    </view>
  </view>

  <!-- 支出概览 -->
  <view class="summary-card">
    <view class="summary-item">
      <text class="summary-label">今日支出</text>
      <text class="summary-amount">¥{{todayAmount}}</text>
    </view>
    <view class="divider"></view>
    <view class="summary-item">
      <text class="summary-label">本月支出</text>
      <text class="summary-amount">¥{{monthAmount}}</text>
    </view>
  </view>

  <!-- 快捷操作 -->
  <view class="quick-actions">
    <view class="action-btn primary" bindtap="goToExpense">
      <text class="action-icon">+</text>
      <text class="action-text">记一笔</text>
    </view>
    <view class="action-btn" bindtap="goToList">
      <text class="action-icon">📋</text>
      <text class="action-text">查看明细</text>
    </view>
  </view>

  <!-- 最近支出 -->
  <view class="recent-section">
    <view class="section-header">
      <text class="section-title">最近支出</text>
      <text class="section-more" bindtap="goToList">查看更多 ></text>
    </view>
    
    <view class="expense-list" wx:if="{{recentExpenses.length > 0}}">
      <view class="expense-item" wx:for="{{recentExpenses}}" wx:key="_id">
        <view class="expense-left">
          <view class="category-tag" style="background-color: {{item.categoryColor}}20; color: {{item.categoryColor}};">
            {{item.categoryName}}
          </view>
          <text class="expense-note">{{item.note || '无备注'}}</text>
        </view>
        <view class="expense-right">
          <text class="expense-amount">-¥{{item.amount}}</text>
          <text class="expense-date">{{item.date}}</text>
        </view>
      </view>
    </view>
    
    <view class="empty-state" wx:else>
      <text>暂无支出记录</text>
    </view>
  </view>
</view>
```

- [ ] **Step 3: 创建 home.wxss**

```css
/* miniprogram/pages/home/home.wxss */
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.user-card {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 30rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.user-info {
  flex: 1;
}

.nickname {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
  display: block;
}

.role {
  font-size: 24rpx;
  color: #07c160;
  margin-top: 8rpx;
  display: block;
}

.summary-card {
  display: flex;
  background: linear-gradient(135deg, #07c160, #10b981);
  padding: 40rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.summary-item {
  flex: 1;
  text-align: center;
}

.divider {
  width: 2rpx;
  background: rgba(255,255,255,0.3);
}

.summary-label {
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
  display: block;
  margin-bottom: 10rpx;
}

.summary-amount {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
}

.quick-actions {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.action-btn {
  flex: 1;
  background: #fff;
  padding: 30rpx;
  border-radius: 16rpx;
  text-align: center;
}

.action-btn.primary {
  background: #07c160;
}

.action-icon {
  font-size: 48rpx;
  display: block;
  margin-bottom: 10rpx;
}

.action-text {
  font-size: 28rpx;
  color: #333;
}

.action-btn.primary .action-text {
  color: #fff;
}

.recent-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
}

.section-more {
  font-size: 24rpx;
  color: #07c160;
}

.expense-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.expense-left {
  flex: 1;
}

.category-tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  margin-bottom: 8rpx;
}

.expense-note {
  font-size: 28rpx;
  color: #666;
  display: block;
}

.expense-right {
  text-align: right;
}

.expense-amount {
  font-size: 32rpx;
  color: #ff4d4f;
  font-weight: 500;
  display: block;
}

.expense-date {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

.empty-state {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
```

- [ ] **Step 4: 创建 home.json**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "首页"
}
```

---

## Task 10: 创建记账页 (pages/expense/expense)

**Files:**
- Create: `miniprogram/pages/expense/expense.js`
- Create: `miniprogram/pages/expense/expense.wxml`
- Create: `miniprogram/pages/expense/expense.wxss`
- Create: `miniprogram/pages/expense/expense.json`

- [ ] **Step 1: 创建 expense.js**

```javascript
// miniprogram/pages/expense/expense.js
const app = getApp()

Page({
  data: {
    amount: '',
    category: '',
    categories: [],
    note: '',
    date: '',
    paymentMethod: '微信',
    paymentMethods: ['微信', '支付宝', '现金', '其他'],
    isShared: false,
    familyMembers: [],
    selectedMember: '',
    isSubmitting: false
  },

  onLoad: function () {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    this.setData({ date: dateStr })
    this.loadCategories()
    this.loadFamilyMembers()
  },

  loadCategories: function () {
    const userInfo = app.globalData.userInfo
    if (!userInfo) return
    
    wx.cloud.callFunction({
      name: 'getCategories',
      data: { familyId: userInfo.familyId }
    }).then(res => {
      if (res.result.success) {
        this.setData({ 
          categories: res.result.data,
          category: res.result.data[0]?._id || ''
        })
      }
    })
  },

  loadFamilyMembers: function () {
    const userInfo = app.globalData.userInfo
    if (!userInfo || !userInfo.familyId) return
    
    const db = wx.cloud.database()
    db.collection('families').doc(userInfo.familyId).get().then(res => {
      const members = res.data.members || []
      return db.collection('users').where({
        openid: db.command.in(members)
      }).get()
    }).then(res => {
      this.setData({ 
        familyMembers: res.data,
        selectedMember: userInfo.openid
      })
    })
  },

  onAmountInput: function (e) {
    this.setData({ amount: e.detail.value })
  },

  onCategoryChange: function (e) {
    const index = e.detail.value
    this.setData({ category: this.data.categories[index]._id })
  },

  onNoteInput: function (e) {
    this.setData({ note: e.detail.value })
  },

  onDateChange: function (e) {
    this.setData({ date: e.detail.value })
  },

  onPaymentChange: function (e) {
    const index = e.detail.value
    this.setData({ paymentMethod: this.data.paymentMethods[index] })
  },

  onMemberChange: function (e) {
    const index = e.detail.value
    this.setData({ selectedMember: this.data.familyMembers[index].openid })
  },

  onSharedChange: function (e) {
    this.setData({ isShared: e.detail.value })
  },

  submitExpense: function () {
    const { amount, category, note, date, paymentMethod, selectedMember, isShared } = this.data
    
    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    
    if (!category) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    
    this.setData({ isSubmitting: true })
    
    wx.cloud.callFunction({
      name: 'addExpense',
      data: {
        amount: parseFloat(amount),
        category,
        date,
        memberId: selectedMember,
        note,
        paymentMethod,
        isShared
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.resetForm()
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }).finally(() => {
      this.setData({ isSubmitting: false })
    })
  },

  resetForm: function () {
    const today = new Date()
    this.setData({
      amount: '',
      note: '',
      date: today.toISOString().split('T')[0],
      isShared: false
    })
  }
})
```

- [ ] **Step 2: 创建 expense.wxml**

```html
<!-- miniprogram/pages/expense/expense.wxml -->
<view class="container">
  <view class="form-card">
    <!-- 金额输入 -->
    <view class="form-item">
      <text class="form-label">金额</text>
      <view class="amount-input">
        <text class="currency">¥</text>
        <input 
          type="digit" 
          placeholder="0.00" 
          value="{{amount}}"
          bindinput="onAmountInput"
        />
      </view>
    </view>

    <!-- 分类选择 -->
    <view class="form-item">
      <text class="form-label">分类</text>
      <picker bindchange="onCategoryChange" value="0" range="{{categories}}" range-key="name">
        <view class="picker">
          {{categories[0]?.name || '请选择分类'}}
          <text class="arrow">></text>
        </view>
      </picker>
    </view>

    <!-- 支出成员 -->
    <view class="form-item">
      <text class="form-label">支出成员</text>
      <picker bindchange="onMemberChange" value="0" range="{{familyMembers}}" range-key="nickname">
        <view class="picker">
          {{familyMembers[0]?.nickname || '请选择成员'}}
          <text class="arrow">></text>
        </view>
      </picker>
    </view>

    <!-- 日期 -->
    <view class="form-item">
      <text class="form-label">日期</text>
      <picker mode="date" value="{{date}}" bindchange="onDateChange">
        <view class="picker">
          {{date}}
          <text class="arrow">></text>
        </view>
      </picker>
    </view>

    <!-- 支付方式 -->
    <view class="form-item">
      <text class="form-label">支付方式</text>
      <picker bindchange="onPaymentChange" value="0" range="{{paymentMethods}}">
        <view class="picker">
          {{paymentMethod}}
          <text class="arrow">></text>
        </view>
      </picker>
    </view>

    <!-- 家庭共享 -->
    <view class="form-item switch-item">
      <text class="form-label">家庭共享支出</text>
      <switch checked="{{isShared}}" bindchange="onSharedChange" />
    </view>

    <!-- 备注 -->
    <view class="form-item">
      <text class="form-label">备注</text>
      <textarea 
        placeholder="添加备注..." 
        value="{{note}}"
        bindinput="onNoteInput"
        maxlength="200"
      />
    </view>
  </view>

  <!-- 提交按钮 -->
  <button 
    class="submit-btn" 
    type="primary" 
    bindtap="submitExpense"
    loading="{{isSubmitting}}"
  >
    {{isSubmitting ? '保存中...' : '保存'}}
  </button>
</view>
```

- [ ] **Step 3: 创建 expense.wxss**

```css
/* miniprogram/pages/expense/expense.wxss */
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 0 30rpx;
  margin-bottom: 30rpx;
}

.form-item {
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.amount-input {
  display: flex;
  align-items: center;
}

.currency {
  font-size: 48rpx;
  color: #333;
  margin-right: 16rpx;
  font-weight: 500;
}

.amount-input input {
  flex: 1;
  font-size: 48rpx;
  color: #333;
  height: 80rpx;
}

.picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 32rpx;
  color: #333;
}

.arrow {
  color: #999;
  font-size: 28rpx;
}

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-item .form-label {
  margin-bottom: 0;
}

textarea {
  width: 100%;
  height: 160rpx;
  font-size: 28rpx;
  color: #333;
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.submit-btn {
  margin-top: 40rpx;
  background: #07c160;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  height: 96rpx;
  line-height: 96rpx;
}

.submit-btn::after {
  border: none;
}
```

- [ ] **Step 4: 创建 expense.json**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "记一笔"
}
```

---

## Task 11: 创建支出明细页 (pages/expenseList/expenseList)

**Files:**
- Create: `miniprogram/pages/expenseList/expenseList.js`
- Create: `miniprogram/pages/expenseList/expenseList.wxml`
- Create: `miniprogram/pages/expenseList/expenseList.wxss`
- Create: `miniprogram/pages/expenseList/expenseList.json`

- [ ] **Step 1: 创建 expenseList.js**

```javascript
// miniprogram/pages/expenseList/expenseList.js
const app = getApp()

Page({
  data: {
    expenses: [],
    categories: [],
    familyMembers: [],
    selectedCategory: '',
    selectedMember: '',
    totalAmount: 0,
    isLoading: false,
    hasMore: true,
    skip: 0,
    limit: 20
  },

  onLoad: function () {
    this.loadCategories()
    this.loadFamilyMembers()
    this.loadExpenses()
  },

  onPullDownRefresh: function () {
    this.setData({ skip: 0, expenses: [] })
    this.loadExpenses().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom: function () {
    if (this.data.hasMore) {
      this.loadExpenses()
    }
  },

  loadCategories: function () {
    const userInfo = app.globalData.userInfo
    if (!userInfo) return
    
    wx.cloud.callFunction({
      name: 'getCategories',
      data: { familyId: userInfo.familyId }
    }).then(res => {
      if (res.result.success) {
        this.setData({ categories: res.result.data })
      }
    })
  },

  loadFamilyMembers: function () {
    const userInfo = app.globalData.userInfo
    if (!userInfo || !userInfo.familyId) return
    
    const db = wx.cloud.database()
    db.collection('families').doc(userInfo.familyId).get().then(res => {
      const members = res.data.members || []
      return db.collection('users').where({
        openid: db.command.in(members)
      }).get()
    }).then(res => {
      this.setData({ familyMembers: res.data })
    })
  },

  loadExpenses: function () {
    const { skip, limit, selectedCategory, selectedMember } = this.data
    const userInfo = app.globalData.userInfo
    
    if (!userInfo) return Promise.resolve()
    
    this.setData({ isLoading: true })
    
    const data = {
      familyId: userInfo.familyId,
      limit,
      skip
    }
    
    if (selectedCategory) data.category = selectedCategory
    if (selectedMember