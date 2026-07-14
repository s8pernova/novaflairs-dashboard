import type { ExpoConfig } from "expo/config";

const androidGoogleMapsApiKey =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

const config: ExpoConfig = {
    name: "operator-mobile",
    slug: "operator-mobile",
    version: "1.0.0",
    orientation: "landscape",
    scheme: "novaflair-operator",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
        bundleIdentifier: "com.novaflair.operator",
        supportsTablet: true,
    },
    android: {
        package: "com.novaflair.operator",
        adaptiveIcon: {
            backgroundColor: "#E6F4FE",
            foregroundImage: "./assets/android-icon-foreground.png",
            backgroundImage: "./assets/android-icon-background.png",
            monochromeImage: "./assets/android-icon-monochrome.png",
        },
        predictiveBackGestureEnabled: false,
    },
    plugins: androidGoogleMapsApiKey
        ? [
              [
                  "react-native-maps",
                  { androidGoogleMapsApiKey },
              ],
          ]
        : [],
    extra: {
        eas: {
            projectId: "b825bae5-f594-41b1-a4c3-d70f5393bd3f",
        },
    },
    web: {
        favicon: "./assets/favicon.png",
    },
};

export default config;
