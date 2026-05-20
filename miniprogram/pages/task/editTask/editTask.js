Page({
  data: {
    taskId: '',
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

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({ creator: userInfo });

    if (options.id) {
      this.setData({ taskId: options.id });
      this.loadTaskDetail(options.id);
    }

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

  async loadTaskDetail(taskId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const result = await wx.cloud.callFunction({
        name: 'tasks',
        data: { action: 'get', taskId }
      });
      if (result.result && result.result.success) {
        const task = result.result.data;
        const d = new Date(task.dueDate);
        const dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        this.setData({
          taskName: task.title,
          taskDesc: task.description || '',
          dueDate: dueDate,
          reward: String(task.reward || ''),
          assignee: {
            openid: task.assigneeOpenid,
            nickName: task.assigneeName,
            avatarUrl: task.assigneeAvatar
          }
        });
        this.checkCanSubmit();
      }
    } catch (error) {
      console.error('获取任务详情失败:', error);
    } finally {
      wx.hideLoading();
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

  async updateTask() {
    const { taskId, taskName, taskDesc, dueDate, assignee, reward } = this.data;

    if (!taskName || !dueDate || !assignee) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const result = await wx.cloud.callFunction({
        name: 'tasks',
        data: {
          action: 'update',
          taskId,
          title: taskName,
          description: taskDesc,
          dueDate: new Date(dueDate),
          assigneeOpenid: assignee.openid,
          assigneeName: assignee.nickname || assignee.nickName,
          assigneeAvatar: assignee.avatarUrl,
          reward: parseFloat(reward) || 0
        }
      });

      if (result.result && result.result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.message || '保存失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('更新任务失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  deleteTask() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          try {
            const result = await wx.cloud.callFunction({
              name: 'tasks',
              data: {
                action: 'delete',
                taskId: this.data.taskId
              }
            });

            if (result.result && result.result.success) {
              wx.showToast({
                title: '已删除',
                icon: 'success'
              });
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } else {
              wx.showToast({
                title: result.result.message || '删除失败',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('删除任务失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
});
