module.exports = {
  expo: {
    name: "SHEELVO",
    slug: "sheelvo",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.sheelvo.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.sheelvo.app",
      versionCode: 1,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO"
      ]
    },
    web: {
      favicon: "./assets/favicon.png",
      meta: {
        "Content-Security-Policy": {
          "http-equiv": "Content-Security-Policy",
          content: "default-src 'self' data: https: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        }
      }
    },
    plugins: [
      "expo-document-picker",
      "expo-image-picker",
      "expo-updates"
    ],
    extra: {
      eas: {
        projectId: "7de59560-0e5d-4452-901b-7d5fa9a053e8"
      }
    },
    owner: "mikehooper",
    updates: {
      url: "https://u.expo.dev/7de59560-0e5d-4452-901b-7d5fa9a053e8"
    },
    runtimeVersion: {
      policy: "appVersion"
    }
  }
}; 