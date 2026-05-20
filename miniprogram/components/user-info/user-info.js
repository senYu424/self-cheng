Component({
  properties: {
    avatarUrl: {
      type: String,
      value: ''
    },
    nickName: {
      type: String,
      value: ''
    }
  },

  data: {
    tempAvatarUrl: '',
    tempNickName: ''
  },

  methods: {
    onChooseAvatar(e) {
      const { avatarUrl } = e.detail;
      console.log('获取到头像:', avatarUrl);
      
      this.setData({ tempAvatarUrl: avatarUrl });
      
      // 如果昵称也已填写，触发事件
      if (this.data.tempNickName) {
        this.triggerEvent('getUserInfo', {
          avatarUrl,
          nickName: this.data.tempNickName
        });
      }
    },

    onNicknameInput(e) {
      const nickName = e.detail.value;
      this.setData({ tempNickName: nickName });
    },

    onNicknameChange(e) {
      const nickName = e.detail.value;
      console.log('获取到昵称:', nickName);
      
      this.setData({ tempNickName: nickName });
      
      // 如果头像也已选择，触发事件
      if (this.data.tempAvatarUrl) {
        this.triggerEvent('getUserInfo', {
          avatarUrl: this.data.tempAvatarUrl,
          nickName
        });
      }
    }
  }
});
