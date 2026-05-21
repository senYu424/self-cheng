const { checkLoginStatus, getUserInfo, showLoginModal, formatDate } = require('../../utils/util');

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
    this.checkLogin();
  },

  onShow() {
    this.checkLogin();
  },

  setCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[now.getDay()];

    this.setData({
      currentDate: `${year}年${month}月${day}日 ${weekDay}`
    });
  },

  checkLogin() {
    const isLoggedIn = checkLoginStatus();
    this.setData({ isLoggedIn });
    if (isLoggedIn) {
      const userInfo = getUserInfo();
      this.setData({ userInfo });
      this.loadExpenseData();
    }
  },

  ensureLogin() {
    if (!checkLoginStatus()) {
      showLoginModal('请先登录后再记账');
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
          time: formatDate(item.createdAt, 'YYYY-MM-DD HH:mm:ss')
        });
      }
    });

    this.setData({
      todayExpense: todayTotal.toFixed(2),
      monthExpense: monthTotal.toFixed(2),
      recentExpenses: recentList
    });
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
