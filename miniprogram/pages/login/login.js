Page({
  data: {
    tempAvatarUrl: '',
    tempNickName: '',
    phoneNumber: '',
    role: 'parent',
    canLogin: false
  },

  onLoad() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.avatarUrl && userInfo.nickName) {
      // 已登录，直接跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
      return;
    }

    // 未登录，检查是否有临时数据
    const tempAvatarUrl = wx.getStorageSync('tempAvatarUrl') || '';
    const tempNickName = wx.getStorageSync('tempNickName') || '';
    this.setData({
      tempAvatarUrl,
      tempNickName
    });
    this.checkCanLogin();
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('获取到头像:', avatarUrl);
    this.setData({ tempAvatarUrl: avatarUrl });
    wx.setStorageSync('tempAvatarUrl', avatarUrl);
    this.checkCanLogin();
  },

  // 输入昵称
  onNicknameInput(e) {
    const nickName = e.detail.value;
    this.setData({ tempNickName: nickName });
    this.checkCanLogin();
  },

  onNicknameChange(e) {
    const nickName = e.detail.value;
    console.log('昵称变更:', nickName);
    this.setData({ tempNickName: nickName });
    wx.setStorageSync('tempNickName', nickName);
    this.checkCanLogin();
  },

  // 检查是否可以登录
  checkCanLogin() {
    const { tempAvatarUrl, tempNickName } = this.data;
    const canLogin = tempAvatarUrl && tempNickName;
    this.setData({ canLogin });
  },

  // 选择角色
  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    console.log('选择角色:', role);
    this.setData({ role });
  },

  // 输入手机号
  onPhoneInput(e) {
    const phoneNumber = e.detail.value;
    this.setData({ phoneNumber });
  },

  // 执行登录
  async doLogin() {
    const { tempAvatarUrl, tempNickName, phoneNumber, role } = this.data;

    if (!tempAvatarUrl || !tempNickName) {
      wx.showToast({
        title: '请完善头像和昵称',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '登录中...' });

    try {
      const userInfo = {
        avatarUrl: tempAvatarUrl,
        nickName: tempNickName,
        phone: phoneNumber || '',
        role: role
      };

      console.log('传给云函数的userInfo:', userInfo);

      // 调用云函数保存用户信息
      const result = await wx.cloud.callFunction({
        name: 'login',
        data: {
          action: 'login',
          userInfo: userInfo,
          role: role
        }
      });

      console.log('登录云函数返回:', result);

      if (result.result && result.result.success) {
        // 保存到本地
        wx.setStorageSync('userInfo', userInfo);
        // 清除临时数据
        wx.removeStorageSync('tempAvatarUrl');
        wx.removeStorageSync('tempNickName');

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 登录成功后跳转到首页
        wx.switchTab({
          url: '/pages/index/index'
        });
      } else {
        wx.showToast({
          title: result.result.message || '登录失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});
