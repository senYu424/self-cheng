const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenid = wxContext.OPENID;
  const fakeOpenid = 'fake_user_openid_999999';

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    // ========== 1. 插入任务测试数据 ==========
    const taskMine = await db.collection('tasks').add({
      data: {
        title: '【我的任务】整理房间',
        description: '这是属于当前登录用户的任务',
        dueDate: tomorrow,
        assigneeOpenid: myOpenid,
        assigneeName: '我自己',
        assigneeAvatar: '',
        reward: 5,
        creatorOpenid: myOpenid,
        creatorName: '我自己',
        status: 'pending',
        _openid: myOpenid,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    const taskOther = await db.collection('tasks').add({
      data: {
        title: '【别人的任务】买菜',
        description: '这条数据属于另一个用户，你不应该看到',
        dueDate: tomorrow,
        assigneeOpenid: fakeOpenid,
        assigneeName: '别人',
        assigneeAvatar: '',
        reward: 10,
        creatorOpenid: fakeOpenid,
        creatorName: '别人',
        status: 'pending',
        _openid: fakeOpenid,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    // ========== 2. 插入记账测试数据 ==========
    // 先查当前用户在 users 表的 _id
    const userRes = await db.collection('users').where({ openid: myOpenid }).get();
    const myUserId = userRes.data.length > 0 ? userRes.data[0]._id : null;

    if (myUserId) {
      await db.collection('expenses').add({
        data: {
          recordType: 'expense',
          amount: 25.5,
          category: '餐饮',
          date: now,
          note: '【我的支出】午餐',
          paymentMethod: 'wechat',
          isShared: false,
          memberId: myUserId,
          createdBy: myUserId,
          _openid: myOpenid,
          createdAt: db.serverDate()
        }
      });

      await db.collection('expenses').add({
        data: {
          recordType: 'expense',
          amount: 100,
          category: '购物',
          date: now,
          note: '【别人的支出】超市采购',
          paymentMethod: 'wechat',
          isShared: false,
          memberId: 'fake_user_id_999999',
          createdBy: 'fake_user_id_999999',
          _openid: fakeOpenid,
          createdAt: db.serverDate()
        }
      });
    }

    // ========== 3. 插入存钱目标测试数据 ==========
    await db.collection('savingGoals').add({
      data: {
        title: '【我的目标】买自行车',
        targetAmount: 500,
        currentAmount: 100,
        childId: myOpenid,
        reward: 0,
        status: 'active',
        _openid: myOpenid,
        createdAt: db.serverDate()
      }
    });

    await db.collection('savingGoals').add({
      data: {
        title: '【别人的目标】旅游基金',
        targetAmount: 3000,
        currentAmount: 500,
        childId: fakeOpenid,
        reward: 0,
        status: 'active',
        _openid: fakeOpenid,
        createdAt: db.serverDate()
      }
    });

    return {
      success: true,
      message: '测试数据插入成功',
      myOpenid,
      inserted: {
        myTask: taskMine._id,
        otherTask: taskOther._id
      }
    };

  } catch (error) {
    return { success: false, message: error.message };
  }
};
