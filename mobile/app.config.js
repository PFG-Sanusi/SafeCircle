export default {
    expo: {
        name: "SafeCircle",
        slug: "safecircle",
        version: "1.0.0",
        orientation: "portrait",
        userInterfaceStyle: "light",
        assetBundlePatterns: [
            "**/*"
        ],
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.yourname.safecircle",
            infoPlist: {
                NSLocationWhenInUseUsageDescription: "SafeCircle needs your location to share it with your safety contacts.",
                NSLocationAlwaysAndWhenInUseUsageDescription: "SafeCircle needs your location in the background to keep you safe.",
                UIBackgroundModes: ["location", "fetch", "remote-notification"]
            }
        },
        android: {
            package: "com.yourname.safecircle",
            permissions: [
                "ACCESS_COARSE_LOCATION",
                "ACCESS_FINE_LOCATION",
                "ACCESS_BACKGROUND_LOCATION",
                "FOREGROUND_SERVICE",
                "VIBRATE",
                "RECEIVE_BOOT_COMPLETED"
            ]
        },
        extra: {
            apiUrl: "http://192.168.43.204:3000"
        },
        plugins: [
            [
                "expo-location",
                {
                    "locationAlwaysAndWhenInUsePermission": "Allow SafeCircle to use your location to keep you safe even when the app is closed."
                }
            ],
            [
                "expo-notifications",
                {
                    "icon": "./assets/icon.png",
                    "color": "#ffffff"
                }
            ]
        ]
    }
};
