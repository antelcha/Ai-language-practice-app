export default {
  name: "aiApp",
  slug: "aiappppp",
  version: "1.0.0",
  
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  androidStatusBar: {
    backgroundColor: "#ffffff"
  },
  android: {
    package: "co.girgin.aiapp"
  },
  ios: {
    bundleIdentifier: "co.girgin.aiapp"
  },
  assetBundlePatterns: ["**/*"],
  plugins: ["expo-splash-screen"],
  owner: "antelcha",
  extra: {
    eas: {
      projectId: "1d6b362d-12ac-455b-adb6-96952264cd3d"
    }
  }
};
