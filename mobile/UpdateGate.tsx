import { useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import App from './App';

type AppUpdateInfo = {
  versionCode: number;
  versionName?: string;
  apkUrl: string;
  force?: boolean;
  minimumVersionCode?: number;
  message?: string;
};

const APP_ID = 'sa.pm.used';
const UPDATE_INFO_URL = 'https://github.com/Bafageeh/used/releases/download/used-latest-apk/version.json';

async function openUpdateUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('تعذر فتح التحديث', 'تعذر فتح رابط التحديث. حاول مرة أخرى بعد قليل.');
  }
}

async function checkForAppUpdate() {
  // The APK updater is Android-only. Skip Expo Go/dev clients and iOS.
  if (Platform.OS !== 'android' || Application.applicationId !== APP_ID) return;

  const currentBuild = Number(Application.nativeBuildVersion || 0);
  if (!Number.isFinite(currentBuild) || currentBuild <= 0) return;

  try {
    const separator = UPDATE_INFO_URL.includes('?') ? '&' : '?';
    const response = await fetch(`${UPDATE_INFO_URL}${separator}t=${Date.now()}`, {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) return;

    const update = (await response.json()) as AppUpdateInfo;
    const latestBuild = Number(update.versionCode || 0);
    const minimumBuild = Number(update.minimumVersionCode || 0);

    if (!Number.isFinite(latestBuild) || latestBuild <= currentBuild || !update.apkUrl) return;

    const mandatory = Boolean(update.force) || (Number.isFinite(minimumBuild) && minimumBuild > 0 && currentBuild < minimumBuild);
    const latestLabel = update.versionName ? ` (${update.versionName})` : '';
    const message = update.message?.trim()
      || `يتوفر إصدار جديد من مستعمل مجاني${latestLabel}. اضغط «تحديث الآن» لتنزيل النسخة الجديدة وتثبيتها.`;

    const buttons = mandatory
      ? [
          {
            text: 'تحديث الآن',
            onPress: () => { void openUpdateUrl(update.apkUrl); },
          },
        ]
      : [
          { text: 'لاحقًا', style: 'cancel' as const },
          {
            text: 'تحديث الآن',
            onPress: () => { void openUpdateUrl(update.apkUrl); },
          },
        ];

    Alert.alert(
      mandatory ? 'تحديث مطلوب' : 'تحديث جديد متوفر',
      message,
      buttons,
      { cancelable: !mandatory },
    );
  } catch {
    // A temporary network/GitHub failure must never prevent the app from opening.
  }
}

export default function UpdateGate() {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    void checkForAppUpdate();
  }, []);

  return <App />;
}
