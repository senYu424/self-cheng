Page({
  data: {
    title: '',
    targetAmount: '',
    reward: '',
    childIndex: -1,
    child: null,
    familyMembers: [],
    canSubmit: false
  },

  onLoad() {
    this.loadFamilyMembers();
  },

  async loadFamilyMembers() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'login',
        data: { action: 'getFamilyMembers' }
      });
      if (result.result.success && result.result.data.length > 0) {
        const members = result.result.data
          .filter(item => item.role === 'child')
          .map(item => ({
            openid: item.openid,
            nickName: item.nickname || item.nickName || '未知',
            avatarUrl: item.avatarUrl || ''
          }));
        this.setData({ familyMembers: members });
      }
    } catch (error) {
      console.error('获取家庭成员失败:', error);
    }
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
    this.checkCanSubmit();
  },

  onTargetInput(e) {
    this.setData({ targetAmount: e.detail.value });
    this.checkCanSubmit();
  },

  onRewardInput(e) {
    this.setData({ reward: e.detail.value });
  },

  onChildChange(e) {
    const index = parseInt(e.detail.value);
    const child = this.data.familyMembers[index];
    this.setData({
      childIndex: index,
      child
    });
    this.checkCanSubmit();
  },

  checkCanSubmit() {
    const { title, targetAmount, child } = this.data;
    this.setData({
      canSubmit: !!(title && targetAmount && child)
    });
  },

  async submitGoal() {
    const { title, targetAmount, reward, child } = this.data;
    if (!title || !targetAmount || !child) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '创建中...' });
    try {
      const result = await wx.cloud.callFunction({
        name: 'saving',
        data: {
          action: 'add',
          title,
          targetAmount: parseFloat(targetAmount),
          reward,
          childId: child.openid,
          childName: child.nickName
        }
      });
      if (result.result && result.result.success) {
        wx.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: result.result?.message || '创建失败', icon: 'none' });
      }
    } catch (error) {
      console.error('创建存钱目标失败:', error);
      wx.showToast({ title: '创建失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
