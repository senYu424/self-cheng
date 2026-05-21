const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    if (action === 'login') {
      const { userInfo, role } = event;
      if (!userInfo || !userInfo.nickName) {
        return { success: false, message: '用户信息不完整' };
      }

      const existing = await db.collection('users').where({ openid }).get();

      if (existing.data.length > 0) {
        await db.collection('users').doc(existing.data[0]._id).update({
          data: {
            avatarUrl: userInfo.avatarUrl || '',
            nickName: userInfo.nickName || '',
            nickname: userInfo.nickName || '',
            phone: userInfo.phone || '',
            role: role || userInfo.role || 'parent',
            updatedAt: db.serverDate()
          }
        });
      } else {
        await db.collection('users').add({
          data: {
            openid,
            avatarUrl: userInfo.avatarUrl || '',
            nickName: userInfo.nickName || '',
            nickname: userInfo.nickName || '',
            phone: userInfo.phone || '',
            role: role || userInfo.role || 'parent',
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        });
      }

      return { success: true };
    }

    if (action === 'getFamilyMembers') {
      const result = await db.collection('users').get();
      return { success: true, data: result.data };
    }

    return { success: false, message: '未知操作: ' + action };
  } catch (error) {
    console.error('login 云函数错误:', error);
    return { success: false, message: error.message };
  }
};
