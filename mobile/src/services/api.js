import axios from 'axios';
import Constants from 'expo-constants';

// Get API URL from app config
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
    baseURL: `${API_URL}/api`,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor (add auth token)
api.interceptors.request.use(
    (config) => {
        // Token will be set in AuthContext
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor (handle errors globally)
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            // Server responded with error status
            console.error('API Error:', error.response.status, error.response.data);

            if (error.response.status === 401) {
                // Unauthorized - token might be expired
                // AuthContext will handle logout
            }
        } else if (error.request) {
            // Request was made but no response
            console.error('Network Error:', error.message);
        } else {
            // Something else happened
            console.error('Error:', error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
