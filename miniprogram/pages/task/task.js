const { ensureLogin, formatDate } = require('../../utils/util');
const { loginMixin } = require('../../utils/pageMixin');

Page({
  data: {
    tasks: [],
    userInfo: null,
    isParent: false,
    activeTab: 'all'
  },

  ...loginMixin,

  onNotLoggedIn() {
    this.setData({ userInfo: null, isParent: false });
  },

  onLoggedIn(userInfo) {
    this.setData({ isParent: userInfo.role === 'parent' });
    this.loadTasks();
  },

  async loadTasks() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'tasks',
        data: { action: 'list' }
      });
      console.log('loadTasks result:', result);
      if (result.result.success) {
        const statusMap = {
          pending: '待领取',
          inProgress: '进行中',
          awaitConfirm: '待确认',
          completed: '已完成'
        };
        const tasks = result.result.data.map(item => ({
          ...item,
          statusText: statusMap[item.status] || item.status,
          completedAt: formatDate(item.completedAt, 'MM-DD'),
          translateX: 0
        }));
        console.log('loadTasks tasks:', tasks);
        this.setData({ tasks: tasks || [] });
      } else {
        console.log('loadTasks success false:', result.result);
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
        const tasks = this.data.tasks.map(task => {
          if (task._id === taskId) {
            return { ...task, status: 'completed', statusText: '已完成' };
          }
          return task;
        });
        this.setData({ tasks });
      }
    } catch (error) {
      console.error('完成任务失败:', error);
    }
  },

  goToAddTask() {
    if (!ensureLogin('请先登录后再发布任务')) return;
    wx.navigateTo({ url: '/pages/task/taskForm/taskForm' });
  },

  goToLogin() {
    wx.showModal({
      title: '提示',
      content: '是否前往登录？',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/login' });
        }
      }
    });
  },

  goToEditTask(e) {
    e.stopPropagation();
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/task/taskForm/taskForm?id=' + taskId });
  },

  goToTaskDetail(e) {
    const taskId = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    if (status !== 'pending') {
      wx.navigateTo({ url: '/pages/task/taskForm/taskForm?id=' + taskId });
    }
  },

  handleTouchStart(e) {
    this.startX = e.touches[0].pageX;
    const index = e.currentTarget.dataset.index;
    const tasks = this.data.tasks.map((t, i) => {
      if (i === index) return { ...t, transition: '' };
      return { ...t, transition: 'transition: transform 0.3s ease;' };
    });
    this.setData({ tasks });
  },

  handleTouchMove(e) {
    const moveX = e.touches[0].pageX;
    const deltaX = moveX - this.startX;
    const index = e.currentTarget.dataset.index;

    if (deltaX > 0) return;

    const deleteWidth = 140;
    let translateX = deltaX;
    if (translateX < -deleteWidth) translateX = -deleteWidth;

    const tasks = this.data.tasks.map((t, i) => {
      if (i === index) return { ...t, translateX };
      return t;
    });
    this.setData({ tasks });
  },

  handleTouchEnd(e) {
    const index = e.currentTarget.dataset.index;
    const task = this.data.tasks[index];
    const deleteWidth = 140;
    let translateX = 0;

    if (task.translateX < -deleteWidth / 2) {
      translateX = -deleteWidth;
    }

    const tasks = this.data.tasks.map((t, i) => {
      if (i === index) {
        return { ...t, translateX, transition: 'transition: transform 0.3s ease;' };
      }
      return { ...t, translateX: 0, transition: 'transition: transform 0.3s ease;' };
    });
    this.setData({ tasks });
  },

  async deleteTask(e) {
    e.stopPropagation();
    const taskId = e.currentTarget.dataset.id;
    const res = await wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？'
    });
    if (!res.confirm) return;

    wx.showLoading({ title: '删除中...' });
    try {
      const result = await wx.cloud.callFunction({
        name: 'tasks',
        data: { action: 'delete', taskId }
      });
      if (result.result && result.result.success) {
        wx.showToast({ title: '已删除', icon: 'success' });
        const tasks = this.data.tasks.filter(t => t._id !== taskId);
        this.setData({ tasks });
      } else {
        wx.showToast({ title: result.result.message || '删除失败', icon: 'none' });
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      wx.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
