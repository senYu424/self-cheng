const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const getUserId = async () => {
      const user = await db.collection('users').where({ openid }).get();
      return user.data.length > 0 ? user.data[0]._id : null;
    };

    if (action === 'add') {
      const { recordType, amount, category, date, note, paymentMethod, isShared } = event;
      const userId = await getUserId();
      if (!userId) return { success: false, message: '用户未注册' };

      const result = await db.collection('expenses').add({
        data: {
          recordType: recordType || 'expense',
          amount,
          category,
          date: new Date(date),
          note,
          paymentMethod: paymentMethod || '',
          isShared: isShared || false,
          memberId: userId,
          createdBy: userId,
          openid: openid,
          createdAt: db.serverDate()
        }
      });
      return { success: true, data: result };
    }

    if (action === 'list') {
      const userId = await getUserId();
      if (!userId) return { success: true, data: [] };

      const result = await db.collection('expenses')
        .where({ memberId: userId })
        .orderBy('createdAt', 'desc')
        .get();

      const data = result.data.map(item => ({
        ...item,
        recordType: item.recordType || item.type || 'expense'
      }));

      return { success: true, data };
    }

    if (action === 'delete') {
      const { expenseId } = event;
      const userId = await getUserId();
      if (!userId) return { success: false, message: '用户未注册' };

      const record = await db.collection('expenses').doc(expenseId).get();
      if (record.data.memberId !== userId) {
        return { success: false, message: '无权限删除此记录' };
      }

      await db.collection('expenses').doc(expenseId).remove();
      return { success: true };
    }

    return { success: false, message: '未知操作' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
