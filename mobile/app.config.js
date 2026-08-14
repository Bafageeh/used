const appJson = require('./app.json');

const { adaptiveIcon, ...androidConfig } = appJson.expo.android || {};

const expo = {
  ...appJson.expo,
  icon: './assets/icon.png',
  android: {
    ...androidConfig,
    icon: './assets/icon.png',
  },
};

module.exports = { expo };
