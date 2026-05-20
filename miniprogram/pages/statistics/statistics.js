Page({
  data: {
    monthlyData: [],
    categoryData: [],
    memberData: []
  },

  onLoad() {
    this.loadStatistics();
  },

  async loadStatistics() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'statistics',
        data: { action: 'overview' }
      });
      if (result.result.success) {
        this.setData({
          monthlyData: result.result.monthlyData,
          categoryData: result.result.categoryData,
          memberData: result.result.memberData
        });
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }
});
