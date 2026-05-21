const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    if (action === 'add') {
      const { title, targetAmount, childId, reward } = event;
      const result = await db.collection('savingGoals').add({
        data: {
          title,
          targetAmount,
          currentAmount: 0,
          childId,
          reward,
          status: 'active',
          _openid: openid,
          createdAt: db.serverDate()
        }
      });
      return { success: true, data: result };
    }

    if (action === 'list') {
      // 只能看到自己关联的存钱目标
      const result = await db.collection('savingGoals')
        .where({ childId: openid })
        .get();
      return { success: true, data: result.data };
    }

    if (action === 'addAmount') {
      const { goalId, amount } = event;
      const goal = await db.collection('savingGoals').doc(goalId).get();
      // 验证权限
      if (goal.data.childId !== openid) {
        return { success: false, message: '无权限操作此存钱目标' };
      }

      const newAmount = goal.data.currentAmount + amount;
      
      await db.collection('savingGoals').doc(goalId).update({
        data: {
          currentAmount: newAmount,
          status: newAmount >= goal.data.targetAmount ? 'completed' : 'active',
          completedAt: newAmount >= goal.data.targetAmount ? db.serverDate() : null
        }
      });
      return { success: true };
    }

    return { success: false, message: '未知操作' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
