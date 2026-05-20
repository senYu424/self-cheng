const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { action } = event;

  try {
    if (action === 'init') {
      // 初始化默认分类
      const defaultCategories = [
        { name: '餐饮', icon: '🍔', color: '#FF6B6B', isDefault: true },
        { name: '交通', icon: '🚗', color: '#4ECDC4', isDefault: true },
        { name: '购物', icon: '🛍️', color: '#45B7D1', isDefault: true },
        { name: '娱乐', icon: '🎮', color: '#96CEB4', isDefault: true },
        { name: '教育', icon: '📚', color: '#FFEAA7', isDefault: true },
        { name: '医疗', icon: '💊', color: '#DDA0DD', isDefault: true },
        { name: '住房', icon: '🏠', color: '#98D8C8', isDefault: true },
        { name: '通讯', icon: '📱', color: '#F7DC6F', isDefault: true },
        { name: '其他', icon: '📝', color: '#BB8FCE', isDefault: true }
      ];

      for (const cat of defaultCategories) {
        await db.collection('categories').add({ data: cat });
      }

      return { success: true, message: '分类初始化完成' };
    }

    if (action === 'list') {
      const result = await db.collection('categories').get();
      return { success: true, data: result.data };
    }

    return { success: false, message: '未知操作' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
