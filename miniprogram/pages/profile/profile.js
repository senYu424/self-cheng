const { goToLogin } = require('../../utils/util');
const { loginMixin } = require('../../utils/pageMixin');

Page({
  data: {
    userInfo: null,
    familyMembers: [],
    isLoggedIn: false
  },

  ...loginMixin,

  onNotLoggedIn() {
    this.setData({ userInfo: null, familyMembers: [] });
  },

  onLoggedIn() {
    this.loadFamilyMembers();
  },

  goToLogin,

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
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('tempAvatarUrl');
          wx.removeStorageSync('tempNickName');

          this.setData({
            userInfo: null,
            familyMembers: []
          });

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });

          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  }
});
