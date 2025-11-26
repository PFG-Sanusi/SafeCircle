import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const LocationContext = createContext();

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within LocationProvider');
    }
    return context;
};

export const LocationProvider = ({ children }) => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isTracking, setIsTracking] = useState(false);
    const locationSubscription = useRef(null);

    const startTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                console.warn('Location permission not granted');
                return;
            }

            // Start watching position
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 10000, // Update every 10 seconds
                    distanceInterval: 10 // Or when moved 10 meters
                },
                (location) => {
                    const { latitude, longitude, accuracy, altitude, speed, heading } = location.coords;

                    const locationData = {
                        latitude,
                        longitude,
                        accuracy,
                        altitude,
                        speed,
                        heading: heading || 0
                    };

                    setCurrentLocation(locationData);

                    // Send to server via Socket.IO if connected and user logged in
                    if (socket && user) {
                        socket.emit('location_update', {
                            userId: user.id,
                            ...locationData
                        });
                    }
                }
            );

            setIsTracking(true);
        } catch (error) {
            console.error('Start tracking error:', error);
        }
    };

    const stopTracking = () => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }
        setIsTracking(false);
    };

    const getCurrentLocation = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });

            const { latitude, longitude, accuracy, altitude, speed, heading } = location.coords;

            const locationData = {
                latitude,
                longitude,
                accuracy,
                altitude,
                speed,
                heading: heading || 0
            };

            setCurrentLocation(locationData);
            return locationData;
        } catch (error) {
            console.error('Get current location error:', error);
            return null;
        }
    };

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            stopTracking();
        };
    }, []);

    const value = {
        currentLocation,
        isTracking,
        startTracking,
        stopTracking,
        getCurrentLocation
    };

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
};
