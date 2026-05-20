const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    if (action === 'add') {
      const { amount, category, date, note, paymentMethod, isShared } = event;
      const user = await db.collection('users').where({ openid }).get();
      const userId = user.data[0]._id;

      const result = await db.collection('expenses').add({
        data: {
          amount,
          category,
          date: new Date(date),
          note,
          paymentMethod,
          isShared,
          memberId: userId,
          createdBy: userId,
          createdAt: db.serverDate()
        }
      });
      return { success: true, data: result };
    }

    if (action === 'list') {
      const result = await db.collection('expenses')
        .orderBy('createdAt', 'desc')
        .get();
      return { success: true, data: result.data };
    }

    if (action === 'delete') {
      const { expenseId } = event;
      await db.collection('expenses').doc(expenseId).remove();
      return { success: true };
    }

    return { success: false, message: '未知操作' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
