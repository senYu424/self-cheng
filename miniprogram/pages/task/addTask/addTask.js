Page({
  data: {
    creator: {},
    dueDate: '',
    taskName: '',
    taskDesc: '',
    familyMembers: [
      { openid: 'mama', nickName: '妈妈', avatarUrl: '' },
      { openid: 'baba', nickName: '爸爸', avatarUrl: '' },
      { openid: 'yuer', nickName: '鱼儿', avatarUrl: '' }
    ],
    assigneeIndex: -1,
    assignee: null,
    reward: '',
    canSubmit: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({
      creator: userInfo
    });
    this.loadFamilyMembers();
  },

  async loadFamilyMembers() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'login',
        data: { action: 'getFamilyMembers' }
      });
      if (result.result.success && result.result.data.length > 0) {
        const members = result.result.data.map(item => ({
          openid: item.openid,
          nickName: item.nickname || item.nickName || '未知',
          avatarUrl: item.avatarUrl || ''
        }));
        this.setData({ familyMembers: members });
        return;
      }
    } catch (error) {
      console.error('获取家庭成员失败:', error);
    }
  },

  onDateChange(e) {
    this.setData({ dueDate: e.detail.value });
    this.checkCanSubmit();
  },

  onNameInput(e) {
    this.setData({ taskName: e.detail.value });
    this.checkCanSubmit();
  },

  onDescInput(e) {
    this.setData({ taskDesc: e.detail.value });
  },

  onAssigneeChange(e) {
    const index = parseInt(e.detail.value);
    const member = this.data.familyMembers[index];
    this.setData({
      assigneeIndex: index,
      assignee: member
    });
    this.checkCanSubmit();
  },

  onRewardInput(e) {
    this.setData({ reward: e.detail.value });
  },

  checkCanSubmit() {
    const { taskName, dueDate, assignee } = this.data;
    this.setData({
      canSubmit: taskName && dueDate && assignee
    });
  },

  async submitTask() {
    const { taskName, taskDesc, dueDate, assignee, reward, creator } = this.data;

    if (!taskName || !dueDate || !assignee) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '发布中...' });

    try {
      console.log('前端传参 - dueDate:', dueDate, 'assignee:', assignee, 'creator:', creator);

      const result = await wx.cloud.callFunction({
        name: 'tasks',
        data: {
          action: 'add',
          title: taskName,
          description: taskDesc,
          dueDate: dueDate,
          assigneeOpenid: assignee.openid,
          assigneeName: assignee.nickName,
          assigneeAvatar: assignee.avatarUrl,
          reward: parseFloat(reward) || 0,
          creatorOpenid: creator.openid || '',
          creatorName: creator.nickName
        }
      });

      if (result.result && result.result.success) {
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.message || '发布失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('发布任务失败:', error);
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});
