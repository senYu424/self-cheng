const { showLoginModal, formatDate } = require('../../utils/util');
const { loginMixin } = require('../../utils/pageMixin');

Page({
  data: {
    expenses: [],
    filter: 'all',
    loading: false,
    isLoggedIn: false
  },

  ...loginMixin,

  onNotLoggedIn() {
    this.setData({ expenses: [] });
  },

  onLoggedIn() {
    this.loadExpenses();
  },

  async loadExpenses() {
    this.setData({ loading: true });
    try {
      const result = await wx.cloud.callFunction({
        name: 'expense',
        data: { action: 'list' }
      });
      if (result.result.success) {
        let allExpenses = result.result.data.map(item => ({
          ...item,
          dateStr: formatDate(item.date || item.createdAt, 'YYYY-MM-DD HH:mm')
        }));
        const filtered = this.filterByDate(allExpenses, this.data.filter);
        this.setData({ expenses: filtered });
      }
    } catch (error) {
      console.error('获取支出列表失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  filterByDate(expenses, filter) {
    if (filter === 'all') return expenses;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return expenses.filter(item => {
      const itemDate = new Date(item.date || item.createdAt);

      if (filter === 'today') {
        return itemDate >= today;
      }

      if (filter === 'week') {
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        return itemDate >= startOfWeek;
      }

      if (filter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return itemDate >= startOfMonth;
      }

      return true;
    });
  },

  onFilterChange(e) {
    if (!this.data.isLoggedIn) {
      showLoginModal('请先登录后再查看明细');
      return;
    }
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter });
    this.loadExpenses();
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
  }
});
