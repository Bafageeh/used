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
  'app-icon.b64.part06',
];

const assetsDir = path.join(__dirname, 'assets');
const iconPath = path.join(assetsDir, 'icon.png');
const base64 = parts.map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8').trim()).join('');
const iconBuffer = Buffer.from(base64, 'base64');

if (iconBuffer.length < 1000 || iconBuffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
  throw new Error('Invalid app icon data');
}
fs.writeFileSync(iconPath, iconBuffer);

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
