// 工具函数

function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  });
}

function hideLoading() {
  wx.hideLoading();
}

module.exports = {
  showLoading,
  hideLoading
};
