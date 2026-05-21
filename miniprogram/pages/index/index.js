Page({
  data: {
    isLoggedIn: false,
    userInfo: {
      avatarUrl: '',
      nickName: '',
      phone: ''
    },
    currentDate: '',
    todayExpense: '0.00',
    monthExpense: '0.00',
    recentExpenses: []
  },

  onLoad() {
    this.setCurrentDate();
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    if (this.data.isLoggedIn) {
      this.loadExpenseData();
    }
  },

  setCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[now.getDay()];

    this.setData({
      currentDate: `${year}年${month}月${day}日 ${weekDay}`
    });
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.avatarUrl && userInfo.nickName) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
      this.loadExpenseData();
    } else {
      this.setData({ isLoggedIn: false });
    }
  },

  ensureLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.avatarUrl || !userInfo.nickName) {
      wx.navigateTo({ url: '/pages/login/login' });
      return false;
    }
    return true;
  },

  async loadExpenseData() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'expense',
        data: { action: 'list' }
      });

      if (result.result && result.result.success) {
        const expenses = result.result.data;
        this.calculateStats(expenses);
      }
    } catch (error) {
      console.error('加载记账数据失败:', error);
    }
  },

  calculateStats(expenses) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayTotal = 0;
    let monthTotal = 0;
    const recentList = [];

    expenses.forEach(item => {
      const itemDate = new Date(item.date || item.createdAt);
      const amount = parseFloat(item.amount) || 0;

      if (itemDate >= today) {
        todayTotal += amount;
      }

      if (itemDate >= startOfMonth) {
        monthTotal += amount;
      }

      if (recentList.length < 5) {
        recentList.push({
          category: item.category || '其他',
          amount: amount.toFixed(2),
          time: this.formatTime(itemDate)
        });
      }
    });

    this.setData({
      todayExpense: todayTotal.toFixed(2),
      monthExpense: monthTotal.toFixed(2),
      recentExpenses: recentList
    });
  },

  formatTime(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  goToExpense() {
    if (!this.ensureLogin()) return;
    wx.navigateTo({
      url: '/pages/expense/expense'
    });
  },

  goToExpenseList() {
    wx.switchTab({
      url: '/pages/expenseList/expenseList'
    });
  },

  goToSaving() {
    wx.switchTab({
      url: '/pages/saving/saving'
    });
  },

  goToTask() {
    wx.switchTab({
      url: '/pages/task/task'
    });
  }
});
