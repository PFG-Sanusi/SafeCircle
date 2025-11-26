import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load stored auth data on mount
    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('token');
            const storedUser = await AsyncStorage.getItem('user');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            }
        } catch (error) {
            console.error('Load auth error:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (phoneNumber, password) => {
        try {
            const response = await api.post('/auth/login', {
                phoneNumber,
                password
            });

            const { user: userData, token: authToken } = response.data;

            setUser(userData);
            setToken(authToken);

            // Store auth data
            await AsyncStorage.setItem('token', authToken);
            await AsyncStorage.setItem('user', JSON.stringify(userData));

            // Set default header
            api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const register = async (phoneNumber, fullName, email, password) => {
        try {
            const response = await api.post('/auth/register', {
                phoneNumber,
                fullName,
                email,
                password
            });

            const { user: userData, token: authToken } = response.data;

            setUser(userData);
            setToken(authToken);

            // Store auth data
            await AsyncStorage.setItem('token', authToken);
            await AsyncStorage.setItem('user', JSON.stringify(userData));

            // Set default header
            api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

            return { success: true };
        } catch (error) {
            console.error('Register error:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Registration failed'
            };
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local state regardless of API call result
            setUser(null);
            setToken(null);
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            delete api.defaults.headers.common['Authorization'];
        }
    };

    const updateFCMToken = async (fcmToken) => {
        try {
            await api.post('/auth/update-fcm-token', { fcmToken });
        } catch (error) {
            console.error('Update FCM token error:', error);
        }
    };

    const value = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateFCMToken
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
