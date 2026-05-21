const { showLoginModal, formatDate } = require('../../utils/util');

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
    todayIncome: '0.00',
    monthExpense: '0.00',
    monthIncome: '0.00',
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
      this.syncUserToCloud();
      this.loadExpenseData();
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: { avatarUrl: '', nickName: '', phone: '' },
        todayExpense: '0.00',
        todayIncome: '0.00',
        monthExpense: '0.00',
        monthIncome: '0.00',
        recentExpenses: []
      });
    }
  },

  async syncUserToCloud() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) return;
    try {
      await wx.cloud.callFunction({
        name: 'login',
        data: {
          action: 'login',
          userInfo: userInfo,
          role: userInfo.role || 'parent'
        }
      });
    } catch (e) {
      console.error('同步用户信息失败', e);
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

    let todayExpense = 0;
    let todayIncome = 0;
    let monthExpense = 0;
    let monthIncome = 0;
    const recentList = [];

    expenses.forEach(item => {
      const itemDate = new Date(item.date || item.createdAt);
      const amount = parseFloat(item.amount) || 0;
      const isIncome = item.type === 'income';

      if (itemDate >= today) {
        if (isIncome) todayIncome += amount;
        else todayExpense += amount;
      }

      if (itemDate >= startOfMonth) {
        if (isIncome) monthIncome += amount;
        else monthExpense += amount;
      }

      if (recentList.length < 5) {
        recentList.push({
          category: item.category || '其他',
          amount: amount.toFixed(2),
          type: item.type || 'expense',
          time: formatDate(item.createdAt, 'YYYY-MM-DD HH:mm:ss')
        });
      }
    });

    this.setData({
      todayExpense: todayExpense.toFixed(2),
      todayIncome: todayIncome.toFixed(2),
      monthExpense: monthExpense.toFixed(2),
      monthIncome: monthIncome.toFixed(2),
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
