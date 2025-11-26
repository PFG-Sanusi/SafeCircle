import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MapScreen from './src/screens/MapScreen';
import ConnectionsScreen from './src/screens/ConnectionsScreen';
import FamiliesScreen from './src/screens/FamiliesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EmergencyContactsScreen from './src/screens/EmergencyContactsScreen';
import SOSHistoryScreen from './src/screens/SOSHistoryScreen';

// Import context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { SocketProvider } from './src/context/SocketContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Main Tab Navigator
function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Map') {
                        iconName = focused ? 'map' : 'map-outline';
                    } else if (route.name === 'Connections') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'Families') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#FF6B6B',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
            })}
        >
            <Tab.Screen name="Map" component={MapScreen} />
            <Tab.Screen name="Connections" component={ConnectionsScreen} />
            <Tab.Screen name="Families" component={FamiliesScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

// Auth Navigator
function AuthNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
}

// App Navigator
function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return null; // Show loading screen
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                <>
                    <Stack.Screen name="MainTabs" component={MainTabs} />
                    <Stack.Screen
                        name="EmergencyContacts"
                        component={EmergencyContactsScreen}
                        options={{ headerShown: true, title: 'Emergency Contacts' }}
                    />
                    <Stack.Screen
                        name="SOSHistory"
                        component={SOSHistoryScreen}
                        options={{ headerShown: true, title: 'SOS History' }}
                    />
                </>
            ) : (
                <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
        </Stack.Navigator>
    );
}

// Main App Component
export default function App() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        async function prepare() {
            try {
                // Request location permissions
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.warn('Location permission not granted');
                }

                // Request notification permissions
                const { status: notifStatus } = await Notifications.requestPermissionsAsync();
                if (notifStatus !== 'granted') {
                    console.warn('Notification permission not granted');
                }

                setIsReady(true);
            } catch (error) {
                console.error('App preparation error:', error);
                setIsReady(true);
            }
        }

        prepare();
    }, []);

    if (!isReady) {
        return null; // Show splash screen
    }

    return (
        <AuthProvider>
            <SocketProvider>
                <LocationProvider>
                    <NavigationContainer>
                        <AppNavigator />
                    </NavigationContainer>
                </LocationProvider>
            </SocketProvider>
        </AuthProvider>
    );
}
