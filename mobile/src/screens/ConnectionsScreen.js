import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function ConnectionsScreen() {
    const [connections, setConnections] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('connections'); // 'connections' or 'pending'

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [connectionsRes, pendingRes] = await Promise.all([
                api.get('/connections?status=accepted'),
                api.get('/connections/pending')
            ]);
            setConnections(connectionsRes.data.connections || []);
            setPendingRequests(pendingRes.data.requests || []);
        } catch (error) {
            console.error('Fetch connections error:', error);
            Alert.alert('Error', 'Failed to load connections');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAccept = async (connectionId) => {
        try {
            await api.put(`/connections/${connectionId}/accept`);
            Alert.alert('Success', 'Connection accepted');
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed to accept connection');
        }
    };

    const handleReject = async (connectionId) => {
        try {
            await api.delete(`/connections/${connectionId}`);
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed to reject connection');
        }
    };

    const handleRemove = async (connectionId) => {
        Alert.alert(
            'Remove Connection',
            'Are you sure you want to remove this connection?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/connections/${connectionId}`);
                            fetchData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove connection');
                        }
                    }
                }
            ]
        );
    };

    const renderConnection = ({ item }) => (
        <View style={styles.connectionCard}>
            <View style={styles.avatarContainer}>
                <Ionicons name="person-circle" size={50} color="#FF6B6B" />
            </View>
            <View style={styles.connectionInfo}>
                <Text style={styles.connectionName}>{item.user.full_name}</Text>
                <Text style={styles.connectionPhone}>{item.user.phone_number}</Text>
            </View>
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(item.id)}
            >
                <Ionicons name="close-circle" size={24} color="#ff4444" />
            </TouchableOpacity>
        </View>
    );

    const renderPendingRequest = ({ item }) => (
        <View style={styles.requestCard}>
            <View style={styles.avatarContainer}>
                <Ionicons name="person-circle" size={50} color="#FFA500" />
            </View>
            <View style={styles.connectionInfo}>
                <Text style={styles.connectionName}>{item.requester.full_name}</Text>
                <Text style={styles.connectionPhone}>{item.requester.phone_number}</Text>
            </View>
            <View style={styles.requestActions}>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAccept(item.id)}
                >
                    <Ionicons name="checkmark" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(item.id)}
                >
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Connections</Text>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'connections' && styles.activeTab]}
                    onPress={() => setActiveTab('connections')}
                >
                    <Text style={[styles.tabText, activeTab === 'connections' && styles.activeTabText]}>
                        My Connections ({connections.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                        Pending ({pendingRequests.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'connections' ? (
                <FlatList
                    data={connections}
                    renderItem={renderConnection}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No connections yet</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={pendingRequests}
                    renderItem={renderPendingRequest}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="mail-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No pending requests</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: '#fff',
        padding: 20,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tab: {
        flex: 1,
        padding: 15,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#FF6B6B',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
    },
    activeTabText: {
        color: '#FF6B6B',
        fontWeight: 'bold',
    },
    list: {
        padding: 15,
    },
    connectionCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    requestCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        alignItems: 'center',
        borderLeftWidth: 3,
        borderLeftColor: '#FFA500',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    avatarContainer: {
        marginRight: 15,
    },
    connectionInfo: {
        flex: 1,
    },
    connectionName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    connectionPhone: {
        fontSize: 14,
        color: '#666',
    },
    removeButton: {
        padding: 5,
    },
    requestActions: {
        flexDirection: 'row',
        gap: 10,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rejectButton: {
        backgroundColor: '#ff4444',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
        color: '#999',
    },
});
