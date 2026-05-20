# 家庭记账 + 孩子存钱计划 - 设计文档

## 项目概述

基于微信云开发的小程序，实现家庭日常开销记账和孩子通过完成任务获得存钱的功能。

## 核心功能

### 1. 用户系统
- 微信一键登录
- 角色选择：家长 / 孩子
- 家庭成员管理（由家长创建）

### 2. 日常记账
- 记录支出：金额、分类、时间、备注、照片
- 选择支出成员（自己/孩子/家庭共享）
- 支持支付方式标记（微信/支付宝/现金/其他）
- 支出明细列表与筛选

### 3. 存钱计划
- 家长为孩子创建存钱目标（如"买玩具 200元"）
- 显示存钱进度条
- 达成目标后显示奖励

### 4. 任务系统
- 家长发布任务（如"整理房间 +10元"）
- 孩子领取并完成任务
- 家长确认后，奖励金额存入存钱目标
- 任务状态流转：待领取 -> 进行中 -> 待确认 -> 已完成

### 5. 统计图表
- 月度支出趋势（折线图）
- 分类支出占比（饼图）
- 家庭成员支出对比
- 存钱目标完成情况

## 数据库设计

### users（用户表）
```javascript
{
  _id: string,          // 用户ID
  openid: string,       // 微信openid
  nickname: string,     // 昵称
  avatarUrl: string,    // 头像
  role: string,         // 角色: 'parent' | 'child'
  familyId: string,     // 家庭ID
  createdAt: Date,
  updatedAt: Date
}
```

### families（家庭表）
```javascript
{
  _id: string,          // 家庭ID
  name: string,         // 家庭名称
  creatorId: string,    // 创建者ID
  members: string[],    // 成员ID列表
  createdAt: Date
}
```

### expenses（支出表）
```javascript
{
  _id: string,
  amount: number,       // 金额（元）
  category: string,     // 分类ID
  date: Date,           // 支出日期
  memberId: string,     // 支出成员ID
  note: string,         // 备注
  imageUrl: string,     // 小票照片URL
  paymentMethod: string,// 支付方式
  isShared: boolean,    // 是否家庭共享支出
  createdBy: string,    // 记录创建者ID
  createdAt: Date
}
```

### categories（分类表）
```javascript
{
  _id: string,
  name: string,         // 分类名称
  icon: string,         // 图标名称
  color: string,        // 颜色
  isDefault: boolean,   // 是否默认分类
  familyId: string,     // 所属家庭
  createdAt: Date
}
```

### savingGoals（存钱目标表）
```javascript
{
  _id: string,
  title: string,        // 目标名称（如"买玩具"）
  targetAmount: number, // 目标金额
  currentAmount: number,// 当前金额
  childId: string,      // 孩子ID
  reward: string,       // 达成奖励描述
  status: string,       // 状态: 'active' | 'completed'
  completedAt: Date,    // 达成时间
  createdAt: Date
}
```

### tasks（任务表）
```javascript
{
  _id: string,
  title: string,        // 任务名称
  description: string,  // 任务描述
  reward: number,       // 奖励金额
  childId: string,      // 分配给的孩子ID
  parentId: string,     // 发布任务的家长ID
  status: string,       // 状态: 'pending' | 'inProgress' | 'awaitConfirm' | 'completed'
  deadline: Date,       // 截止日期
  completedAt: Date,    // 完成时间
  confirmedAt: Date,    // 确认时间
  createdAt: Date
}
```

## 页面结构

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | pages/home/home | 支出概览 + 存钱进度 |
| 记账页 | pages/expense/expense | 添加/编辑支出 |
| 明细页 | pages/expenseList/expenseList | 支出列表筛选 |
| 存钱页 | pages/saving/saving | 目标管理与进度 |
| 任务页 | pages/task/task | 任务发布/领取/确认 |
| 统计页 | pages/statistics/statistics | 图表展示 |
| 我的页 | pages/profile/profile | 设置与成员管理 |

## 云函数设计

| 云函数 | 功能 |
|--------|------|
| login | 用户登录/注册，返回用户信息 |
| addExpense | 添加支出记录 |
| getExpenses | 查询支出列表（支持筛选） |
| deleteExpense | 删除支出记录 |
| addCategory | 添加分类 |
| getCategories | 获取分类列表 |
| addSavingGoal | 创建存钱目标 |
| getSavingGoals | 获取存钱目标列表 |
| addTask | 发布任务 |
| getTasks | 获取任务列表 |
| completeTask | 孩子完成任务 |
| confirmTask | 家长确认任务，金额存入 |
| getStatistics | 获取统计数据 |

## 技术栈

- **前端**：微信小程序原生开发
- **后端**：微信云开发（云函数 + 云数据库）
- **图表**：echarts-for-weixin
- **UI组件**：微信原生组件 + 自定义组件

## 开发阶段

### 第一阶段：核心基础
- 用户登录与角色选择
- 支出记账（添加/查询/删除）
- 分类管理
- 基础UI布局

### 第二阶段：存钱与任务
- 存钱目标CRUD
- 任务系统完整流程
- 家长/孩子权限控制

### 第三阶段：统计与优化
- echarts图表集成
- 数据可视化
- UI美化与交互优化
