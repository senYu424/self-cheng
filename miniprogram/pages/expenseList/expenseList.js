Page({
  data: {
    expenses: [],
    filter: 'all',
    loading: false
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
      this.setData({ expenses: [] });
      return;
    }
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
          dateStr: this.formatDate(item.date || item.createdAt)
        }));
        // 根据 filter 过滤数据
        const filtered = this.filterByDate(allExpenses, this.data.filter);
        this.setData({ expenses: filtered });
      }
    } catch (error) {
      console.error('获取支出列表失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
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
        const dayOfWeek = today.getDay(); // 0=周日
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
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter });
    this.loadExpenses();
  }
});
