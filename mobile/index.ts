import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';

// Expo Go can emit this dev-only warning when Metro is reached through our
// Cloudflare test tunnel. It does not affect app navigation or API traffic.
// Hide only this known warning; all other warnings/errors remain visible.
LogBox.ignoreLogs([
  'Cannot connect to Expo CLI.',
  'Cannot connect to Expo CLI',
]);

registerRootComponent(App);
