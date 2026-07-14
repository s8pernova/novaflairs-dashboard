import type { ExpoConfig } from "expo/config";

const androidGoogleMapsApiKey =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

const plugins: ExpoConfig["plugins"] = [
    [
        "expo-splash-screen",
        {
            backgroundColor: "#0B151B",
            image: "./assets/splash-icon.png",
            imageWidth: 240,
            resizeMode: "contain",
        },
    ],
];

if (androidGoogleMapsApiKey) {
    plugins.push([
        "react-native-maps",
        { androidGoogleMapsApiKey },
    ]);
}

const config: ExpoConfig = {
    name: "NOVAflair Operator",
    slug: "operator-mobile",
    version: "1.0.0",
    orientation: "landscape",
    scheme: "novaflair-operator",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    ios: {
        bundleIdentifier: "com.novaflair.operator",
        supportsTablet: true,
    },
    android: {
        package: "com.novaflair.operator",
        adaptiveIcon: {
            backgroundColor: "#0B151B",
            foregroundImage: "./assets/android-icon-foreground.png",
            backgroundImage: "./assets/android-icon-background.png",
            monochromeImage: "./assets/android-icon-monochrome.png",
        },
        predictiveBackGestureEnabled: false,
    },
    plugins,
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
