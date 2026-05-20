Page({
  data: {
    userInfo: null,
    familyMembers: []
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
      this.setData({ userInfo: null });
      return;
    }
    this.setData({ userInfo });
    this.loadFamilyMembers();
  },

  async loadFamilyMembers() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'login',
        data: { action: 'getFamilyMembers' }
      });
      if (result.result.success) {
        console.log(result.result.data);
        this.setData({ familyMembers: result.result.data });
      }
    } catch (error) {
      console.error('获取家庭成员失败:', error);
    }
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后将清除登录信息，是否继续？',
      success: (res) => {
        if (res.confirm) {
          // 清除所有本地存储的用户相关数据
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('tempAvatarUrl');
          wx.removeStorageSync('tempNickName');

          // 重置页面数据
          this.setData({
            userInfo: null,
            familyMembers: []
          });

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });

          // 返回首页（登录页面）
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  }
});
