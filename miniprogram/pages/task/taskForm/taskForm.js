const { formatDate } = require('../../../utils/util');

Page({
  data: {
    isEdit: false,
    readOnly: false,
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
      this.setData({ isEdit: true, taskId: options.id });
      wx.setNavigationBarTitle({ title: '编辑任务' });
      this.loadTaskDetail(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '新建任务' });
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
        const dueDate = formatDate(task.dueDate);

        const readOnly = task.status !== 'pending';
        this.setData({
          taskName: task.title,
          taskDesc: task.description || '',
          dueDate: dueDate,
          reward: String(task.reward || ''),
          assignee: {
            openid: task.assigneeOpenid,
            nickName: task.assigneeName,
            avatarUrl: task.assigneeAvatar
          },
          readOnly
        });
        if (readOnly) {
          wx.setNavigationBarTitle({ title: '任务详情' });
        } else {
          this.checkCanSubmit();
        }
      }
    } catch (error) {
      console.error('获取任务详情失败:', error);
    } finally {
      wx.hideLoading();
    }
  },

  onDateChange(e) {
    if (this.data.readOnly) return;
    this.setData({ dueDate: e.detail.value });
    this.checkCanSubmit();
  },

  onNameInput(e) {
    if (this.data.readOnly) return;
    this.setData({ taskName: e.detail.value });
    this.checkCanSubmit();
  },

  onDescInput(e) {
    if (this.data.readOnly) return;
    this.setData({ taskDesc: e.detail.value });
  },

  onAssigneeChange(e) {
    if (this.data.readOnly) return;
    const index = parseInt(e.detail.value);
    const member = this.data.familyMembers[index];
    this.setData({
      assigneeIndex: index,
      assignee: member
    });
    this.checkCanSubmit();
  },

  onRewardInput(e) {
    if (this.data.readOnly) return;
    this.setData({ reward: e.detail.value });
  },

  checkCanSubmit() {
    const { taskName, dueDate, assignee } = this.data;
    this.setData({
      canSubmit: taskName && dueDate && assignee
    });
  },

  async submitTask() {
    const { readOnly, isEdit, taskId, taskName, taskDesc, dueDate, assignee, reward, creator } = this.data;
    if (readOnly) return;

    if (!taskName || !dueDate || !assignee) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    const loadingText = isEdit ? '保存中...' : '发布中...';
    const successText = isEdit ? '保存成功' : '发布成功';
    wx.showLoading({ title: loadingText });

    try {
      const params = {
        action: isEdit ? 'update' : 'add',
        title: taskName,
        description: taskDesc,
        dueDate: isEdit ? new Date(dueDate) : dueDate,
        assigneeOpenid: assignee.openid,
        assigneeName: assignee.nickname || assignee.nickName,
        assigneeAvatar: assignee.avatarUrl,
        reward: parseFloat(reward) || 0
      };

      if (isEdit) {
        params.taskId = taskId;
      } else {
        params.creatorOpenid = creator.openid || '';
        params.creatorName = creator.nickName;
      }

      const result = await wx.cloud.callFunction({
        name: 'tasks',
        data: params
      });

      if (result.result && result.result.success) {
        wx.showToast({
          title: successText,
          icon: 'success'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.message || (isEdit ? '保存失败' : '发布失败'),
          icon: 'none'
        });
      }
    } catch (error) {
      console.error(isEdit ? '更新任务失败:' : '发布任务失败:', error);
      wx.showToast({
        title: (isEdit ? '保存' : '发布') + '失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});
