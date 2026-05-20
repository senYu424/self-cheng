// API 接口封装

const home = {
  async getStats() {
    // 模拟数据或真实接口调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          studyStats: {
            total: 100,
            completed: 80
          },
          approvalStats: {
            pending: 5,
            approved: 20
          }
        });
      }, 500);
    });
  }
};

module.exports = {
  home
};
