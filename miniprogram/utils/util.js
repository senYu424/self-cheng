function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  });
}

function hideLoading() {
  wx.hideLoading();
}

function checkLoginStatus() {
  const userInfo = wx.getStorageSync('userInfo');
  return !!(userInfo && userInfo.avatarUrl);
}

function getUserInfo() {
  const userInfo = wx.getStorageSync('userInfo');
  if (userInfo && userInfo.avatarUrl) {
    return userInfo;
  }
  return null;
}

function showLoginModal(content = '请先登录后再操作') {
  wx.showModal({
    title: '提示',
    content,
    confirmText: '去登录',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        goToLogin();
      }
    }
  });
}

function goToLogin() {
  wx.navigateTo({
    url: '/pages/login/login'
  });
}

function ensureLogin(content) {
  if (!checkLoginStatus()) {
    showLoginModal(content);
    return false;
  }
  return true;
}

function formatDate(date, format = 'YYYY-MM-DD') {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');

  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  if (format === 'MM-DD') {
    return `${month}-${day}`;
  }
  if (format === 'YYYY-MM-DD HH:mm') {
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
  if (format === 'MM-DD HH:mm') {
    return `${month}-${day} ${hour}:${minute}`;
  }
  return `${year}-${month}-${day}`;
}

module.exports = {
  showLoading,
  hideLoading,
  checkLoginStatus,
  getUserInfo,
  showLoginModal,
  goToLogin,
  ensureLogin,
  formatDate
};
