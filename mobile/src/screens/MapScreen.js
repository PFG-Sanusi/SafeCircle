// src/screens/MapScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Alert,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLocation } from '../context/LocationContext';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ navigation }) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { currentLocation, startTracking, stopTracking } = useLocation();
    
    const [isTracking, setIsTracking] = useState(false);
    const [nearbyUsers, setNearbyUsers] = useState([]);
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [showSOS, setShowSOS] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    
    const mapRef = useRef(null);

    // Initial location setup
    useEffect(() => {
        async function setupLocation() {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Location permission is required');
                    return;
                }

                // Get initial location
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High
                });

                setIsLoadingLocation(false);
                
                // Center map on user location
                if (mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                }

                // Start tracking
                startTracking();
                setIsTracking(true);

            } catch (error) {
                console.error('Location setup error:', error);
                setIsLoadingLocation(false);
            }
        }

        setupLocation();

        return () => {
            stopTracking();
        };
    }, []);

    // Fetch connected users' locations
    useEffect(() => {
        fetchConnectedUsersLocations();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchConnectedUsersLocations, 30000);
        
        return () => clearInterval(interval);
    }, []);

    // Listen for real-time location updates via Socket.IO
    useEffect(() => {
        if (!socket) return;

        socket.on('location_updated', (data) => {
            // Update connected users list with new location
            setConnectedUsers(prev => {
                const updated = prev.map(u => 
                    u.userId === data.userId 
                        ? { ...u, latitude: data.latitude, longitude: data.longitude }
                        : u
                );
                return updated;
            });
        });

        socket.on('sos_received', (data) => {
            Alert.alert(
                '🚨 SOS ALERT',
                `${data.from} needs help!\n\nTap to view location`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'View Location',
                        onPress: () => {
                            if (mapRef.current) {
                                mapRef.current.animateToRegion({
                                    latitude: data.latitude,
                                    longitude: data.longitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                });
                            }
                        }
                    }
                ]
            );
        });

        return () => {
            socket.off('location_updated');
            socket.off('sos_received');
        };
    }, [socket]);

    const fetchConnectedUsersLocations = async () => {
        try {
            const response = await api.get('/locations/connections');
            setConnectedUsers(response.data.locations.map(loc => ({
                userId: loc.user.id,
                name: loc.user.full_name,
                latitude: loc.latitude,
                longitude: loc.longitude,
                profilePicture: loc.user.profile_picture_url,
                timestamp: loc.timestamp
            })));
        } catch (error) {
            console.error('Fetch locations error:', error);
        }
    };

    const handleSOSPress = () => {
        Alert.alert(
            '🚨 Trigger SOS Alert?',
            'This will send an emergency alert with your location to all your emergency contacts.',
            [
                { text: 'Cancel', style: 'cancel', onPress: () => setShowSOS(false) },
                {
                    text: 'SEND SOS',
                    style: 'destructive',
                    onPress: triggerSOS
                }
            ]
        );
    };

    const triggerSOS = async () => {
        try {
            if (!currentLocation) {
                Alert.alert('Error', 'Unable to get your location');
                return;
            }

            setShowSOS(false);

            // Trigger via Socket.IO for instant delivery
            if (socket) {
                socket.emit('sos_alert', {
                    userId: user.id,
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    message: '🚨 EMERGENCY! I need help!'
                });
            }

            // Also trigger via REST API as backup
            await api.post('/sos/trigger', {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                message: '🚨 EMERGENCY! I need help!'
            });

            Alert.alert(
                '✅ SOS Sent',
                'Emergency alert has been sent to your contacts',
                [{ text: 'OK' }]
            );

        } catch (error) {
            console.error('SOS trigger error:', error);
            Alert.alert('Error', 'Failed to send SOS alert. Please try again.');
        }
    };

    const centerOnUser = () => {
        if (currentLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    if (isLoadingLocation) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text style={styles.loadingText}>Loading map...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* OpenStreetMap */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                showsUserLocation
                showsMyLocationButton={false}
                followsUserLocation={isTracking}
                initialRegion={{
                    latitude: currentLocation?.latitude || 6.5244,
                    longitude: currentLocation?.longitude || 3.3792,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                customMapStyle={openStreetMapStyle}
            >
                {/* User's current location marker */}
                {currentLocation && (
                    <Marker
                        coordinate={{
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                        }}
                        title="You"
                        pinColor="#FF6B6B"
                    >
                        <View style={styles.userMarker}>
                            <Ionicons name="person" size={20} color="white" />
                        </View>
                    </Marker>
                )}

                {/* Connected users markers */}
                {connectedUsers.map((user) => (
                    <Marker
                        key={user.userId}
                        coordinate={{
                            latitude: user.latitude,
                            longitude: user.longitude,
                        }}
                        title={user.name}
                        description={`Last updated: ${new Date(user.timestamp).toLocaleTimeString()}`}
                    >
                        <View style={styles.connectedUserMarker}>
                            <Ionicons name="person" size={16} color="white" />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Top Control Panel */}
            <View style={styles.topControls}>
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => navigation.navigate('EmergencyContacts')}
                >
                    <Ionicons name="list" size={24} color="#333" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => navigation.navigate('SOSHistory')}
                >
                    <Ionicons name="time" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {/* Center on User Button */}
            <TouchableOpacity
                style={styles.centerButton}
                onPress={centerOnUser}
            >
                <Ionicons name="locate" size={24} color="#333" />
            </TouchableOpacity>

            {/* SOS Button */}
            <TouchableOpacity
                style={[styles.sosButton, showSOS && styles.sosButtonActive]}
                onPress={handleSOSPress}
                onLongPress={() => setShowSOS(true)}
                activeOpacity={0.8}
            >
                <Text style={styles.sosText}>SOS</Text>
                <Text style={styles.sosSubtext}>HOLD FOR EMERGENCY</Text>
            </TouchableOpacity>

            {/* Status Bar */}
            <View style={styles.statusBar}>
                <View style={styles.statusItem}>
                    <Ionicons 
                        name={isTracking ? "radio-button-on" : "radio-button-off"} 
                        size={12} 
                        color={isTracking ? "#4CAF50" : "#999"} 
                    />
                    <Text style={styles.statusText}>
                        {isTracking ? 'Tracking' : 'Not Tracking'}
                    </Text>
                </View>
                <View style={styles.statusItem}>
                    <Ionicons name="people" size={12} color="#666" />
                    <Text style={styles.statusText}>
                        {connectedUsers.length} online
                    </Text>
                </View>
            </View>
        </View>
    );
}

// OpenStreetMap custom style (minimal)
const openStreetMapStyle = [];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    map: {
        width: width,
        height: height,
    },
    topControls: {
        position: 'absolute',
        top: 50,
        right: 20,
        flexDirection: 'column',
        gap: 10,
    },
    menuButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    centerButton: {
        position: 'absolute',
        bottom: 200,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sosButton: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    sosButtonActive: {
        backgroundColor: '#FF3333',
        transform: [{ scale: 1.1 }],
    },
    sosText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 2,
    },
    sosSubtext: {
        fontSize: 8,
        color: 'white',
        marginTop: 4,
        letterSpacing: 0.5,
    },
    statusBar: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusText: {
        fontSize: 12,
        color: '#666',
    },
    userMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'white',
    },
    connectedUserMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
});