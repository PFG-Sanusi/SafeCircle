import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.43.204:3000';

export default {
    API_URL: apiUrl,
    SOCKET_URL: apiUrl,
    MAP_REFRESH_INTERVAL: 30000, // 30 seconds
    LOCATION_UPDATE_INTERVAL: 10000, // 10 seconds
    LOCATION_DISTANCE_THRESHOLD: 10, // 10 meters
};
