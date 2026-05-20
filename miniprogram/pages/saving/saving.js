Page({
  data: {
    savingGoals: [],
    userInfo: null,
    isParent: false
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
      this.setData({ userInfo: null, isParent: false });
      return;
    }
    this.setData({
      userInfo,
      isParent: userInfo.role === 'parent'
    });
    this.loadSavingGoals();
  },

  async loadSavingGoals() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'saving',
        data: { action: 'list' }
      });
      if (result.result.success) {
        const goals = result.result.data.map(item => {
          const progress = item.targetAmount > 0 ? (item.currentAmount / item.targetAmount) * 100 : 0;
          return {
            ...item,
            progressPercent: progress.toFixed(1),
            progressWidth: Math.min(progress, 100)
          };
        });
        this.setData({ savingGoals: goals });
      }
    } catch (error) {
      console.error('获取存钱目标失败:', error);
    }
  },

  goToAddGoal() {
    wx.navigateTo({ url: '/pages/saving/addGoal' });
  }
});
