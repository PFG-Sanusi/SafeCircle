import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import Constants from 'expo-constants';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

export const SocketProvider = ({ children }) => {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        if (user && token) {
            // Initialize socket connection
            const newSocket = io(API_URL, {
                transports: ['websocket'],
                autoConnect: true
            });

            newSocket.on('connect', () => {
                console.log('Socket connected');
                setIsConnected(true);

                // Join with user ID
                newSocket.emit('join', user.id);
            });

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
            });

            newSocket.on('error', (error) => {
                console.error('Socket error:', error);
            });

            socketRef.current = newSocket;
            setSocket(newSocket);

            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                }
            };
        } else {
            // Disconnect socket if user logs out
            if (socketRef.current) {
                socketRef.current.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
        }
    }, [user, token]);

    const value = {
        socket,
        isConnected
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
