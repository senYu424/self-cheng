const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    if (action === 'add') {
      const { title, description, dueDate, assigneeOpenid, assigneeName, assigneeAvatar, reward, creatorOpenid, creatorName } = event;

      console.log('add task - 接收参数:', JSON.stringify(event));
      console.log('dueDate值:', dueDate, '类型:', typeof dueDate);
      console.log('reward值:', reward, '类型:', typeof reward);

      if (!title) return { success: false, message: '任务名称不能为空' };
      if (!dueDate) return { success: false, message: '截止时间不能为空' };

      const dueDateObj = new Date(dueDate);
      if (isNaN(dueDateObj.getTime())) {
        return { success: false, message: '截止时间格式错误: ' + dueDate };
      }

      const rewardNum = parseFloat(reward);
      const finalReward = isNaN(rewardNum) ? 0 : rewardNum;

      const addData = {
        title: String(title),
        description: String(description || ''),
        dueDate: dueDateObj,
        assigneeOpenid: String(assigneeOpenid || ''),
        assigneeName: String(assigneeName || ''),
        assigneeAvatar: String(assigneeAvatar || ''),
        reward: finalReward,
        creatorOpenid: String(creatorOpenid || openid || ''),
        creatorName: String(creatorName || ''),
        status: 'pending',
        _openid: openid,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      };

      console.log('准备写入数据库:', JSON.stringify(addData));

      const result = await db.collection('tasks').add({ data: addData });
      return { success: true, data: result };
    }

    if (action === 'list') {
      // 只能看到创建者或被分配者为自己的任务
      const result = await db.collection('tasks')
        .where(_.or([
          { creatorOpenid: openid },
          { assigneeOpenid: openid }
        ]))
        .orderBy('createdAt', 'desc')
        .get();
      return { success: true, data: result.data };
    }

    if (action === 'get') {
      const { taskId } = event;
      const result = await db.collection('tasks').doc(taskId).get();
      const task = result.data;
      // 验证权限：只能查看自己创建或被分配的任务
      if (task.creatorOpenid !== openid && task.assigneeOpenid !== openid) {
        return { success: false, message: '无权限查看此任务' };
      }
      return { success: true, data: task };
    }

    if (action === 'update') {
      const { taskId, title, description, dueDate, assigneeOpenid, assigneeName, assigneeAvatar, reward } = event;
      // 验证权限：只能修改自己创建的任务
      const task = await db.collection('tasks').doc(taskId).get();
      if (task.data.creatorOpenid !== openid) {
        return { success: false, message: '无权限修改此任务' };
      }

      await db.collection('tasks').doc(taskId).update({
        data: {
          title,
          description: description || '',
          dueDate: new Date(dueDate),
          assigneeOpenid: assigneeOpenid || '',
          assigneeName: assigneeName || '',
          assigneeAvatar: assigneeAvatar || '',
          reward: reward || 0,
          updatedAt: db.serverDate()
        }
      });
      return { success: true };
    }

    if (action === 'delete') {
      const { taskId } = event;
      // 验证权限：只能删除自己创建的任务
      const task = await db.collection('tasks').doc(taskId).get();
      if (task.data.creatorOpenid !== openid) {
        return { success: false, message: '无权限删除此任务' };
      }

      await db.collection('tasks').doc(taskId).remove();
      return { success: true };
    }

    if (action === 'claim') {
      const { taskId } = event;
      // 验证权限：只能领取分配给自己的任务
      const task = await db.collection('tasks').doc(taskId).get();
      if (task.data.assigneeOpenid !== openid) {
        return { success: false, message: '无权限领取此任务' };
      }

      await db.collection('tasks').doc(taskId).update({
        data: { status: 'inProgress', updatedAt: db.serverDate() }
      });
      return { success: true };
    }

    if (action === 'complete') {
      const { taskId } = event;
      const task = await db.collection('tasks').doc(taskId).get();

      // 验证权限：只能办结分配给自己的任务
      if (task.data.assigneeOpenid !== openid) {
        return { success: false, message: '无权限办结此任务' };
      }

      // 更新任务状态为已完成
      await db.collection('tasks').doc(taskId).update({
        data: {
          status: 'completed',
          completedAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });

      // 将奖励金额存入存钱目标
      const goals = await db.collection('savingGoals')
        .where({ childId: task.data.assigneeOpenid, status: 'active' })
        .get();

      if (goals.data.length > 0) {
        const goal = goals.data[0];
        const newAmount = goal.currentAmount + task.data.reward;
        await db.collection('savingGoals').doc(goal._id).update({
          data: {
            currentAmount: newAmount,
            status: newAmount >= goal.targetAmount ? 'completed' : 'active'
          }
        });
      }

      return { success: true };
    }

    return { success: false, message: '未知操作: ' + action };
  } catch (error) {
    console.error('task云函数错误:', error);
    return { success: false, message: error.message };
  }
};
