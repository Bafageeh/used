const fs = require('fs');
const path = require('path');
const appJson = require('./app.json');

const parts = [
  'app-icon.b64.part00',
  'app-icon.b64.part01',
  'app-icon.b64.part02',
  'app-icon.b64.part03',
  'app-icon.b64.part04',
  'app-icon.b64.part05',
];

const assetsDir = path.join(__dirname, 'assets');
const iconPath = path.join(assetsDir, 'icon.png');

try {
  const base64 = parts
    .map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8').trim())
    .join('');
  fs.writeFileSync(iconPath, Buffer.from(base64, 'base64'));
} catch (error) {
  console.warn('Could not materialize app icon:', error.message);
}

const expo = {
  ...appJson.expo,
  icon: './assets/icon.png',
  android: {
    ...appJson.expo.android,
    adaptiveIcon: {
      ...(appJson.expo.android?.adaptiveIcon || {}),
      foregroundImage: './assets/icon.png',
      backgroundColor: '#5B21B6',
    },
  },
};

module.exports = { expo };
