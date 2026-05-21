const { checkLoginStatus, getUserInfo } = require('./util');

const loginMixin = {
  onLoad() {
    this.checkLogin();
  },

  onShow() {
    this.checkLogin();
  },

  checkLogin() {
    const isLoggedIn = checkLoginStatus();
    this.setData({ isLoggedIn });
    if (!isLoggedIn) {
      this.onNotLoggedIn();
      return;
    }
    const userInfo = getUserInfo();
    this.setData({ userInfo });
    this.onLoggedIn(userInfo);
  },

  onNotLoggedIn() {
    // 子类可覆盖此方法处理未登录状态
  },

  onLoggedIn(userInfo) {
    // 子类可覆盖此方法处理已登录状态
    if (this.loadData) {
      this.loadData();
    }
  }
};

module.exports = {
  loginMixin
};
