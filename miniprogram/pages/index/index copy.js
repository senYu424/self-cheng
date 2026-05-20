Page({
  data: {
    isLoggedIn: false,
    userInfo: {
      avatarUrl: '',
      nickName: ''
    },
    currentDate: '',
    todayExpense: '0.00',
    monthExpense: '0.00',
    recentExpenses: [],
    tempAvatarUrl: '',
  },

  onLoad() {
    this.setCurrentDate();
    this.checkLoginStatus();
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.loadExpenseData();
    }
  },

  // 设置当前日期
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

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const tempAvatarUrl = wx.getStorageSync('tempAvatarUrl');
    this.setData({
      tempAvatarUrl: tempAvatarUrl
    });

    if (userInfo && userInfo.avatarUrl) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
      this.loadExpenseData();
    }
  },

  // 加载记账数据
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

  // 计算统计数据
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

      // 今日支出
      if (itemDate >= today) {
        todayTotal += amount;
      }

      // 本月支出
      if (itemDate >= startOfMonth) {
        monthTotal += amount;
      }

      // 最近5条记录
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

  // 格式化时间
  formatTime(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  // 获取微信用户信息
  getWeChatInfo() {
    console.log('开始获取微信用户信息...');

    wx.getUserProfile({
      desc: '用于完善个人资料',
      success: (res) => {
        console.log('wx.getUserProfile 返回数据:', res);
        console.log('userInfo:', res.userInfo);

        // 检查返回的数据结构
        if (!res.userInfo) {
          console.error('userInfo 为空');
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          });
          return;
        }

        // 优先使用 nickName，如果不存在则使用 nickname
        const nickName = res.userInfo.nickName || res.userInfo.nickname || '微信用户';
        const avatarUrl = res.userInfo.avatarUrl || '';

        console.log('提取的昵称:', nickName);
        console.log('提取的头像:', avatarUrl);

        const userInfo = {
          avatarUrl: avatarUrl,
          nickName: nickName,
          gender: res.userInfo.gender || 0
        };

        wx.setStorageSync('userInfo', userInfo);

        this.setData({
          isLoggedIn: true,
          userInfo: userInfo
        });

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 加载记账数据
        this.loadExpenseData();
      },
      fail: (err) => {
        console.error('获取微信信息失败:', err);
        wx.showToast({
          title: '需要授权才能使用',
          icon: 'none'
        });
      }
    });
  },
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('获取到头像444:', avatarUrl);

    this.setData({ tempAvatarUrl: avatarUrl });
    wx.setStorageSync('tempAvatarUrl', avatarUrl);

    // 如果昵称也已填写，触发事件
    // if (this.data.tempNickName) {
    //   this.triggerEvent('getUserInfo', {
    //     avatarUrl,
    //     nickName: this.data.tempNickName
    //   });
    // }
  },
  onNicknameInput(e) {
    const nickName = e.detail.value;
    this.setData({ tempNickName: nickName });
  },

  onNicknameChange(e) {
    const nickName = e.detail.value;
    console.log('获取到昵称:', nickName);

    this.setData({ tempNickName: nickName });

    // 如果头像也已选择，触发事件
    if (this.data.tempAvatarUrl) {
      this.triggerEvent('getUserInfo', {
        avatarUrl: this.data.tempAvatarUrl,
        nickName
      });
    }
  },

  // 跳转到记账页面
  goToExpense() {
    wx.navigateTo({
      url: '/pages/expense/expense'
    });
  },

  // 跳转到明细页面
  goToExpenseList() {
    wx.switchTab({
      url: '/pages/expenseList/expenseList'
    });
  },

  // 跳转到存钱页面
  goToSaving() {
    wx.switchTab({
      url: '/pages/saving/saving'
    });
  },

  // 跳转到任务页面
  goToTask() {
    wx.switchTab({
      url: '/pages/task/task'
    });
  }
});
