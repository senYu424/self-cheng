const { formatDate } = require('../../utils/util');

Page({
  data: {
    amount: '',
    category: '',
    date: '',
    note: '',
    paymentMethod: 'wechat',
    isShared: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.avatarUrl) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    this.setData({ date: formatDate(new Date()) });
  },

  onAmountInput(e) {
    this.setData({ amount: e.detail.value });
  },

  onCategorySelect(e) {
    this.setData({ category: e.currentTarget.dataset.category });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  onPaymentChange(e) {
    this.setData({ paymentMethod: e.detail.value });
  },

  onSharedChange(e) {
    this.setData({ isShared: e.detail.value });
  },

  async submitExpense() {
    const { amount, category, date, note, paymentMethod, isShared } = this.data;
    if (!amount || !category) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'expense',
        data: {
          action: 'add',
          amount: parseFloat(amount),
          category,
          date: new Date(date),
          note,
          paymentMethod,
          isShared
        }
      });

      if (result.result.success) {
        wx.showToast({ title: '记账成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (error) {
      console.error('记账失败:', error);
      wx.showToast({ title: '记账失败', icon: 'none' });
    }
  }
});
