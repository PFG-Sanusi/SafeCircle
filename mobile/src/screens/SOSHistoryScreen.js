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

export default function SOSHistoryScreen() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/sos/alerts');
            setAlerts(response.data.alerts || []);
        } catch (error) {
            console.error('Fetch alerts error:', error);
            Alert.alert('Error', 'Failed to load SOS history');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleResolve = async (alertId) => {
        Alert.alert(
            'Resolve Alert',
            'Mark this SOS alert as resolved?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Resolve',
                    onPress: async () => {
                        try {
                            await api.put(`/sos/alerts/${alertId}/resolve`);
                            Alert.alert('Success', 'Alert marked as resolved');
                            fetchAlerts();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to resolve alert');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return '#ff4444';
            case 'resolved':
                return '#4CAF50';
            case 'false_alarm':
                return '#FFA500';
            default:
                return '#999';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active':
                return 'alert-circle';
            case 'resolved':
                return 'checkmark-circle';
            case 'false_alarm':
                return 'warning';
            default:
                return 'help-circle';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const openMap = (latitude, longitude) => {
        const url = `https://maps.google.com/?q=${latitude},${longitude}`;
        // In a real app, you'd use Linking.openURL(url)
        Alert.alert('Location', `Lat: ${latitude}, Lon: ${longitude}`);
    };

    const renderAlert = ({ item }) => (
        <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Ionicons name={getStatusIcon(item.status)} size={24} color="#fff" />
                </View>
                <View style={styles.alertInfo}>
                    <Text style={styles.alertStatus}>{item.status.toUpperCase()}</Text>
                    <Text style={styles.alertDate}>{formatDate(item.created_at)}</Text>
                </View>
            </View>

            {item.message && (
                <Text style={styles.alertMessage}>{item.message}</Text>
            )}

            <View style={styles.locationContainer}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.locationText}>
                    {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                </Text>
                <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => openMap(item.latitude, item.longitude)}
                >
                    <Ionicons name="map" size={16} color="#FF6B6B" />
                </TouchableOpacity>
            </View>

            {item.status === 'active' && (
                <TouchableOpacity
                    style={styles.resolveButton}
                    onPress={() => handleResolve(item.id)}
                >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                    <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
                </TouchableOpacity>
            )}

            {item.resolved_at && (
                <Text style={styles.resolvedText}>
                    Resolved: {formatDate(item.resolved_at)}
                </Text>
            )}
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
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{alerts.length}</Text>
                    <Text style={styles.statLabel}>Total Alerts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#ff4444' }]}>
                        {alerts.filter(a => a.status === 'active').length}
                    </Text>
                    <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                        {alerts.filter(a => a.status === 'resolved').length}
                    </Text>
                    <Text style={styles.statLabel}>Resolved</Text>
                </View>
            </View>

            <FlatList
                data={alerts}
                renderItem={renderAlert}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={fetchAlerts} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="shield-checkmark-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No SOS alerts</Text>
                        <Text style={styles.emptySubtext}>Your alert history will appear here</Text>
                    </View>
                }
            />
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
    statsCard: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        padding: 20,
        margin: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FF6B6B',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#e0e0e0',
    },
    list: {
        padding: 15,
        paddingTop: 0,
    },
    alertCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    statusBadge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    alertInfo: {
        flex: 1,
    },
    alertStatus: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    alertDate: {
        fontSize: 14,
        color: '#666',
    },
    alertMessage: {
        fontSize: 14,
        color: '#333',
        marginBottom: 10,
        fontStyle: 'italic',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    locationText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
    },
    mapButton: {
        padding: 5,
    },
    resolveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0fff0',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    resolveButtonText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    resolvedText: {
        fontSize: 12,
        color: '#4CAF50',
        marginTop: 10,
        fontStyle: 'italic',
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
    emptySubtext: {
        marginTop: 5,
        fontSize: 14,
        color: '#bbb',
    },
});
