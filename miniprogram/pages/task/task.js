Page({
  data: {
    tasks: [],
    userInfo: null,
    isParent: false,
    activeTab: 'all'
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    this.checkLogin();
  },

  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.avatarUrl) {
      wx.hideTabBar();
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 1500);
      return;
    }
    wx.showTabBar();
    this.setData({
      userInfo,
      isParent: userInfo.role === 'parent'
    });
    this.loadTasks();
  },

  async loadTasks() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'tasks',
        data: { action: 'list' }
      });
      if (result.result.success) {
        const statusMap = {
          pending: '待领取',
          inProgress: '进行中',
          awaitConfirm: '待确认',
          completed: '已完成'
        };
        const tasks = result.result.data.map(item => ({
          ...item,
          statusText: statusMap[item.status] || item.status
        }));
        this.setData({ tasks });
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  async claimTask(e) {
    const taskId = e.currentTarget.dataset.id;
    try {
      const result = await wx.cloud.callFunction({
        name: 'tasks',
        data: { action: 'claim', taskId }
      });
      if (result.result.success) {
        wx.showToast({ title: '领取成功', icon: 'success' });
        this.loadTasks();
      }
    } catch (error) {
      console.error('领取任务失败:', error);
    }
  },

  async completeTask(e) {
    const taskId = e.currentTarget.dataset.id;
    try {
      const result = await wx.cloud.callFunction({
        name: 'tasks',
        data: { action: 'complete', taskId }
      });
      if (result.result.success) {
        wx.showToast({ title: '已办结，奖励已存入', icon: 'success' });
        this.loadTasks();
      }
    } catch (error) {
      console.error('完成任务失败:', error);
    }
  },

  goToAddTask() {
    wx.navigateTo({ url: '/pages/task/addTask/addTask' });
  },

  goToEditTask(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/task/editTask/editTask?id=' + taskId });
  }
});
