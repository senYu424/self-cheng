# 家庭记账 + 孩子存钱计划 实现方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于微信云开发的家庭记账小程序，支持日常开销记录和孩子通过完成任务获得存钱。

**Architecture:** 使用微信小程序原生开发 + 微信云开发（云函数 + 云数据库）。前端按页面模块化，后端按功能模块设计云函数。

**Tech Stack:** 微信小程序原生框架, 微信云开发, echarts-for-weixin(图表)

---

## 文件结构规划

### 前端页面 (miniprogram/pages/)
```
pages/
├── home/              # 首页 - 支出概览 + 存钱进度
├── expense/           # 记账页 - 添加/编辑支出
├── expenseList/       # 明细页 - 支出列表筛选
├── saving/            # 存钱页 - 目标管理与进度
├── task/              # 任务页 - 任务发布/领取/确认
├── statistics/        # 统计页 - 图表展示
├── profile/           # 我的页 - 设置与成员管理
└── login/             # 登录页 - 角色选择
```

### 云函数 (cloudfunctions/)
```
cloudfunctions/
├── login/             # 用户登录/注册
├── expense/           # 支出相关操作
├── category/          # 分类相关操作
├── saving/            # 存钱目标相关操作
├── task/              # 任务相关操作
└── statistics/        # 统计数据查询
```

### 数据库集合
- `users` - 用户表
- `families` - 家庭表
- `expenses` - 支出表
- `categories` - 分类表
- `savingGoals` - 存钱目标表
- `tasks` - 任务表

---

## 第一阶段：基础架构与登录

### Task 1: 创建登录页和角色选择

**Files:**
- Create: `miniprogram/pages/login/login.js`
- Create: `miniprogram/pages/login/login.json`
- Create: `miniprogram/pages/login/login.wxss`
- Modify: `miniprogram/app.json` - 添加登录页到 pages 列表

**Step 1: 修改 app.json 添加登录页**
```json
{
  "pages": [
    "pages/login/login",
    "pages/expense/expense",
    "pages/expenseList/expenseList",
    "pages/saving/saving",
    "pages/task/task",
    "pages/statistics/statistics",
    "pages/profile/profile"
  ]
}
```

**Step 2: 创建登录页 wxml**
```html
<view class="login-container">
  <view class="logo">
    <text class="title">家庭记账</text>
    <text class="subtitle">记账存钱，从小开始</text>
  </view>
  
  <view class="role-select" wx:if="{{!userInfo}}">
    <view class="role-title">选择您的身份</view>
    <view class="role-options">
      <view class="role-item" bindtap="selectRole" data-role="parent">
        <view class="role-icon">👨‍👩‍👧</view>
        <view class="role-name">我是家长</view>
        <view class="role-desc">管理家庭记账，为孩子发布任务</view>
      </view>
      <view class="role-item" bindtap="selectRole" data-role="child">
        <view class="role-icon">🧒</view>
        <view class="role-name">我是孩子</view>
        <view class="role-desc">完成任务，赚取零花钱</view>
      </view>
    </view>
  </view>
  
  <button wx:if="{{selectedRole}}" class="login-btn" open-type="getUserInfo" bindgetuserinfo="onGetUserInfo">
    微信一键登录
  </button>
</view>
```

**Step 3: 创建登录页 js**
```javascript
Page({
  data: {
    userInfo: null,
    selectedRole: ''
  },
  
  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ selectedRole: role });
  },
  
  onGetUserInfo(e) {
    if (e.detail.userInfo) {
      this.setData({ userInfo: e.detail.userInfo });
      this.login(e.detail.userInfo);
    }
  },
  
  async login(userInfo) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'login',
        data: {
          role: this.data.selectedRole,
          userInfo: userInfo
        }
      });
      
      if (result.result.success) {
        wx.setStorageSync('userInfo', result.result.data);
        wx.switchTab({ url: '/pages/home/home' });
      }
    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  }
});
```

**Step 4: 创建登录页 wxss**
```css
.login-container {
  padding: 60rpx 40rpx;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.logo {
  text-align: center;
  margin-bottom: 80rpx;
}

.title {
  font-size: 48rpx;
  color: #fff;
  font-weight: bold;
  display: block;
}

.subtitle {
  font-size: 28rpx;
  color: rgba(255,255,255,0.8);
  margin-top: 20rpx;
  display: block;
}

.role-select {
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
}

.role-title {
  font-size: 32rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
  color: #333;
}

.role-options {
  display: flex;
  gap: 30rpx;
}

.role-item {
  flex: 1;
  border: 2rpx solid #e0e0e0;
  border-radius: 16rpx;
  padding: 40rpx 20rpx;
  text-align: center;
  transition: all 0.3s;
}

.role-item.active {
  border-color: #667eea;
  background: #f0f4ff;
}

.role-icon {
  font-size: 64rpx;
  margin-bottom: 20rpx;
}

.role-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.role-desc {
  font-size: 24rpx;
  color: #999;
}

.login-btn {
  background: #fff;
  color: #667eea;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: bold;
}
```

---

### Task 2: 创建登录云函数

**Files:**
- Create: `cloudfunctions/login/index.js`
- Create: `cloudfunctions/login/package.json`
- Modify: `cloudbaserc.json` - 添加 login 函数

**Step 1: 创建 login 云函数**
```javascript
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { role, userInfo } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  try {
    // 查询用户是否已存在
    const userRes = await db.collection('users').where({ openid }).get();
    
    if (userRes.data.length > 0) {
      // 更新用户信息
      const user = userRes.data[0];
      await db.collection('users').doc(user._id).update({
        data: {
          nickname: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          updatedAt: db.serverDate()
        }
      });
      
      return {
        success: true,
        data: { ...user, nickname: userInfo.nickName, avatarUrl: userInfo.avatarUrl }
      };
    }
    
    // 创建新用户
    const newUser = {
      openid,
      nickname: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
      role: role,
      familyId: null,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    };
    
    const addRes = await db.collection('users').add({ data: newUser });
    
    return {
      success: true,
      data: { ...newUser, _id: addRes._id }
    };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
};
```

**Step 2: 创建 package.json**
```json
{
  "name": "login",
  "version": "1.0.0",
  "description": "用户登录云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

**Step 3: 安装依赖并部署**
```bash
cd cloudfunctions/login
npm install wx-server-sdk
tcb fn deploy login --force
```

---

### Task 3: 修改 app.js 添加登录状态检查

**Files:**
- Modify: `miniprogram/app.js`

**Step 1: 修改 app.js**
```javascript
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        traceUser: true,
      });
    }
    
    // 检查登录状态
    this.checkLoginStatus();
  },
  
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/login/login' });
    }
  },
  
  globalData: {
    userInfo: null
  }
});
```

---

### Task 4: 创建首页基础结构

**Files:**
- Create: `miniprogram/pages/home/home.js`
- Create: `miniprogram/pages/home/home.json`
- Create: `miniprogram/pages/home/home.wxml`
- Create: `miniprogram/pages/home/home.wxss`

**Step 1: 创建 home.js**
```javascript
Page({
  data: {
    userInfo: null,
    todayExpense: 0,
    monthExpense: 0,
    savingGoals: [],
    recentExpenses: []
  },
  
  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({ userInfo });
    this.loadHomeData();
  },
  
  async loadHomeData() {
    // 加载首页数据
    this.getTodayExpense();
    this.getMonthExpense();
    this.getSavingGoals();
    this.getRecentExpenses();
  },
  
  async getTodayExpense() {
    // TODO: 调用云函数获取今日支出
  },
  
  async getMonthExpense() {
    // TODO: 调用云函数获取本月支出
  },
  
  async getSavingGoals() {
    // TODO: 调用云函数获取存钱目标
  },
  
  async getRecentExpenses() {
    // TODO: 调用云函数获取最近支出
  },
  
  goToExpense() {
    wx.navigateTo({ url: '/pages/expense/expense' });
  },
  
  goToExpenseList() {
    wx.navigateTo({ url: '/pages/expenseList/expenseList' });
  },
  
  goToSaving() {
    wx.navigateTo({ url: '/pages/saving/saving' });
  },
  
  goToTask() {
    wx.navigateTo({ url: '/pages/task/task' });
  }
});
```

**Step 2: 创建 home.wxml**
```html
<view class="home-container">
  <!-- 用户信息 -->
  <view class="user-header">
    <image class="avatar" src="{{userInfo.avatarUrl}}" />
    <view class="user-info">
      <text class="nickname">{{userInfo.nickname}}</text>
      <text class="role">{{userInfo.role === 'parent' ? '家长' : '孩子'}}</text>
    </view>
  </view>
  
  <!-- 今日支出卡片 -->
  <view class="card expense-card">
    <view class="card-title">今日支出</view>
    <view class="card-amount">¥{{todayExpense}}</view>
    <view class="card-subtitle">本月累计 ¥{{monthExpense}}</view>
  </view>
  
  <!-- 快捷操作 -->
  <view class="quick-actions">
    <view class="action-item" bindtap="goToExpense">
      <view class="action-icon">💰</view>
      <text>记一笔</text>
    </view>
    <view class="action-item" bindtap="goToExpenseList">
      <view class="action-icon">📋</view>
      <text>明细</text>
    </view>
    <view class="action-item" bindtap="goToTask">
      <view class="action-icon">✅</view>
      <text>任务</text>
    </view>
    <view class="action-item" bindtap="goToSaving">
      <view class="action-icon">🏦</view>
      <text>存钱</text>
    </view>
  </view>
  
  <!-- 存钱目标进度 -->
  <view class="card" wx:if="{{savingGoals.length > 0}}">
    <view class="card-title">存钱目标</view>
    <view class="goal-item" wx:for="{{savingGoals}}" wx:key="_id">
      <view class="goal-info">
        <text class="goal-title">{{item.title}}</text>
        <text class="goal-amount">¥{{item.currentAmount}}/¥{{item.targetAmount}}</text>
      </view>
      <view class="progress-bar">
        <view class="progress-fill" style="width: {{(item.currentAmount/item.targetAmount)*100}}%"></view>
      </view>
    </view>
  </view>
  
  <!-- 最近支出 -->
  <view class="card">
    <view class="card-title">最近支出</view>
    <view class="expense-item" wx:for="{{recentExpenses}}" wx:key="_id">
      <view class="expense-info">
        <text class="expense-category">{{item.category}}</text>
        <text class="expense-note">{{item.note}}</text>
      </view>
      <text class="expense-amount">-¥{{item.amount}}</text>
    </view>
  </view>
</view>
```

**Step 3: 创建 home.wxss**
```css
.home-container {
  padding: 20rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

.user-header {
  display: flex;
  align-items: center;
  padding: 30rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.user-info {
  flex: 1;
}

.nickname {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.role {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.card-amount {
  font-size: 64rpx;
  font-weight: bold;
  color: #ff4757;
}

.card-subtitle {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}

.quick-actions {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.action-item {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx 20rpx;
  text-align: center;
}

.action-icon {
  font-size: 48rpx;
  margin-bottom: 10rpx;
}

.action-item text {
  font-size: 24rpx;
  color: #666;
}

.goal-item {
  margin-bottom: 20rpx;
}

.goal-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.goal-title {
  font-size: 28rpx;
  color: #333;
}

.goal-amount {
  font-size: 24rpx;
  color: #666;
}

.progress-bar {
  height: 12rpx;
  background: #e0e0e0;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 6rpx;
  transition: width 0.3s;
}

.expense-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.expense-item:last-child {
  border-bottom: none;
}

.expense-category {
  font-size: 28rpx;
  color: #333;
  display: block;
}

.expense-note {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

.expense-amount {
  font-size: 32rpx;
  color: #ff4757;
  font-weight: bold;
}
```

---

### Task 5: 创建底部导航栏

**Files:**
- Modify: `miniprogram/app.json`

**Step 1: 添加 tabBar 配置**
```json
{
  "pages": [
    "pages/expense/expense",
    "pages/expenseList/expenseList",
    "pages/saving/saving",
    "pages/task/task",
    "pages/statistics/statistics",
    "pages/profile/profile"
  ],
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#667eea",
    "backgroundColor": "#ffffff",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/tab/home.png",
        "selectedIconPath": "images/tab/home-active.png"
      },
      {
        "pagePath": "pages/expenseList/expenseList",
        "text": "明细",
        "iconPath": "images/tab/list.png",
        "selectedIconPath": "images/tab/list-active.png"
      },
      {
        "pagePath": "pages/saving/saving",
        "text": "存钱",
        "iconPath": "images/tab/saving.png",
        "selectedIconPath": "images/tab/saving-active.png"
      },
      {
        "pagePath": "pages/task/task",
        "text": "任务",
        "iconPath": "images/tab/task.png",
        "selectedIconPath": "images/tab/task-active.png"
      },
      {
        "pagePath": "pages/profile/profile",
        "text": "我的",
        "iconPath": "images/tab/profile.png",
        "selectedIconPath": "images/tab/profile-active.png"
      }
    ]
  }
}
```

---

## 第二阶段：记账功能

### Task 6: 创建记账页

**Files:**
- Create: `miniprogram/pages/expense/expense.js`
- Create: `miniprogram/pages/expense/expense.json`
- Create: `miniprogram/pages/expense/expense.wxml`
- Create: `miniprogram/pages/expense/expense.wxss`

**功能：**
- 输入金额（数字键盘）
- 选择分类（餐饮/交通/购物/娱乐/教育/医疗/其他）
- 选择日期
- 添加备注
- 上传小票照片
- 选择支出成员
- 标记支付方式

---

### Task 7: 创建支出相关云函数

**Files:**
- Create: `cloudfunctions/expense/index.js`
- Create: `cloudfunctions/expense/package.json`

**云函数列表：**
- `addExpense` - 添加支出
- `getExpenses` - 查询支出列表（支持按时间/分类/成员筛选）
- `deleteExpense` - 删除支出

---

### Task 8: 创建明细页

**Files:**
- Create: `miniprogram/pages/expenseList/expenseList.js`
- Create: `miniprogram/pages/expenseList/expenseList.json`
- Create: `miniprogram/pages/expenseList/expenseList.wxml`
- Create: `miniprogram/pages/expenseList/expenseList.wxss`

**功能：**
- 支出列表展示
- 按时间筛选（今日/本周/本月/自定义）
- 按分类筛选
- 按成员筛选
- 滑动删除

---

## 第三阶段：存钱与任务

### Task 9: 创建存钱页

**Files:**
- Create: `miniprogram/pages/saving/saving.js`
- Create: `miniprogram/pages/saving/saving.wxml`
- Create: `miniprogram/pages/saving/saving.wxss`

**功能：**
- 展示当前存钱目标列表
- 显示进度条
- 家长：创建/编辑/删除目标
- 孩子：查看自己的目标
- 达成目标提示

---

### Task 10: 创建任务页

**Files:**
- Create: `miniprogram/pages/task/task.js`
- Create: `miniprogram/pages/task/task.wxml`
- Create: `miniprogram/pages/task/task.wxss`

**功能：**
- 家长：发布任务（标题/描述/奖励金额/截止日期）
- 孩子：查看可领取任务列表
- 孩子：领取任务
- 孩子：标记任务完成
- 家长：确认任务完成，金额自动存入
- 任务状态展示

---

### Task 11: 创建存钱与任务云函数

**Files:**
- Create: `cloudfunctions/saving/index.js`
- Create: `cloudfunctions/task/index.js`

**云函数列表：**
- `addSavingGoal` - 创建存钱目标
- `getSavingGoals` - 获取存钱目标列表
- `addTask` - 发布任务
- `getTasks` - 获取任务列表
- `claimTask` - 领取任务
- `completeTask` - 完成任务
- `confirmTask` - 确认任务（家长）

---

## 第四阶段：统计与优化

### Task 12: 创建统计页

**Files:**
- Create: `miniprogram/pages/statistics/statistics.js`
- Create: `miniprogram/pages/statistics/statistics.wxml`
- Create: `miniprogram/pages/statistics/statistics.wxss`

**功能：**
- 月度支出趋势折线图
- 分类支出占比饼图
- 家庭成员支出对比柱状图
- 存钱目标完成情况

---

### Task 13: 创建统计云函数

**Files:**
- Create: `cloudfunctions/statistics/index.js`

**云函数列表：**
- `getMonthlyTrend` - 获取月度趋势
- `getCategoryStats` - 获取分类统计
- `getMemberStats` - 获取成员统计

---

### Task 14: 创建我的页

**Files:**
- Create: `miniprogram/pages/profile/profile.js`
- Create: `miniprogram/pages/profile/profile.wxml`
- Create: `miniprogram/pages/profile/profile.wxss`

**功能：**
- 个人信息展示
- 家庭成员列表
- 分类管理
- 退出登录

---

## 第五阶段：数据库初始化

### Task 15: 创建默认分类数据

**分类列表：**
- 餐饮 🍔 #FF6B6B
- 交通 🚗 #4ECDC4
- 购物 🛍️ #45B7D1
- 娱乐 🎮 #96CEB4
- 教育 📚 #FFEAA7
- 医疗 💊 #DDA0DD
- 住房 🏠 #98D8C8
- 通讯 📱 #F7DC6F
- 其他 📝 #BB8FCE

---

## 执行建议

**开发顺序：**
1. 先完成 Task 1-5（登录+首页+导航）
2. 再完成 Task 6-8（记账功能）
3. 然后 Task 9-11（存钱+任务）
4. 最后 Task 12-15（统计+优化）

**每个 Task 完成后：**
- 在微信开发者工具中测试
- 确保云函数部署成功
- 验证数据库操作正常
