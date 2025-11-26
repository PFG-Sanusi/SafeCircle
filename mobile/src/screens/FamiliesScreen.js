import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function FamiliesScreen() {
    const [families, setFamilies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [familyName, setFamilyName] = useState('');
    const [familyDescription, setFamilyDescription] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    useEffect(() => {
        fetchFamilies();
    }, []);

    const fetchFamilies = async () => {
        try {
            setLoading(true);
            const response = await api.get('/families');
            setFamilies(response.data.families || []);
        } catch (error) {
            console.error('Fetch families error:', error);
            Alert.alert('Error', 'Failed to load families');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCreateFamily = async () => {
        if (!familyName.trim()) {
            Alert.alert('Error', 'Please enter a family name');
            return;
        }

        try {
            await api.post('/families', {
                name: familyName,
                description: familyDescription
            });
            setModalVisible(false);
            setFamilyName('');
            setFamilyDescription('');
            Alert.alert('Success', 'Family created successfully');
            fetchFamilies();
        } catch (error) {
            Alert.alert('Error', 'Failed to create family');
        }
    };

    const handleJoinFamily = async () => {
        if (!inviteCode.trim()) {
            Alert.alert('Error', 'Please enter an invite code');
            return;
        }

        try {
            await api.post('/families/join', { inviteCode: inviteCode.toUpperCase() });
            setJoinModalVisible(false);
            setInviteCode('');
            Alert.alert('Success', 'Joined family successfully');
            fetchFamilies();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to join family');
        }
    };

    const handleLeaveFamily = (familyId, familyName) => {
        Alert.alert(
            'Leave Family',
            `Are you sure you want to leave "${familyName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/families/${familyId}/leave`);
                            fetchFamilies();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to leave family');
                        }
                    }
                }
            ]
        );
    };

    const renderFamily = ({ item }) => (
        <View style={styles.familyCard}>
            <View style={styles.familyHeader}>
                <View style={styles.familyIcon}>
                    <Ionicons name="home" size={30} color="#FF6B6B" />
                </View>
                <View style={styles.familyInfo}>
                    <Text style={styles.familyName}>{item.name}</Text>
                    {item.description && (
                        <Text style={styles.familyDescription}>{item.description}</Text>
                    )}
                    <Text style={styles.familyRole}>Role: {item.role}</Text>
                </View>
            </View>
            <View style={styles.familyFooter}>
                <View style={styles.inviteCodeContainer}>
                    <Text style={styles.inviteLabel}>Invite Code:</Text>
                    <Text style={styles.inviteCode}>{item.invite_code}</Text>
                </View>
                <TouchableOpacity
                    style={styles.leaveButton}
                    onPress={() => handleLeaveFamily(item.id, item.name)}
                >
                    <Text style={styles.leaveButtonText}>Leave</Text>
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
                <Text style={styles.headerTitle}>Families</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setJoinModalVisible(true)}
                    >
                        <Ionicons name="enter-outline" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={families}
                renderItem={renderFamily}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={fetchFamilies} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="home-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No families yet</Text>
                        <Text style={styles.emptySubtext}>Create or join a family to get started</Text>
                    </View>
                }
            />

            {/* Create Family Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Create Family</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Family Name"
                            value={familyName}
                            onChangeText={setFamilyName}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Description (optional)"
                            value={familyDescription}
                            onChangeText={setFamilyDescription}
                            multiline
                            numberOfLines={3}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.createButton]}
                                onPress={handleCreateFamily}
                            >
                                <Text style={styles.createButtonText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Join Family Modal */}
            <Modal
                visible={joinModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setJoinModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Join Family</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Invite Code"
                            value={inviteCode}
                            onChangeText={setInviteCode}
                            autoCapitalize="characters"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setJoinModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.createButton]}
                                onPress={handleJoinFamily}
                            >
                                <Text style={styles.createButtonText}>Join</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    headerButton: {
        padding: 5,

    },
    list: {
        padding: 15,
    },
    familyCard: {
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
    familyHeader: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    familyIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    familyInfo: {
        flex: 1,
    },
    familyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    familyDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    familyRole: {
        fontSize: 12,
        color: '#FF6B6B',
        fontWeight: '600',
    },
    familyFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    inviteCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inviteLabel: {
        fontSize: 12,
        color: '#666',
        marginRight: 5,
    },
    inviteCode: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF6B6B',
        backgroundColor: '#fff0f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    leaveButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ff4444',
    },
    leaveButtonText: {
        color: '#ff4444',
        fontSize: 14,
        fontWeight: '600',
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
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        width: '85%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    createButton: {
        backgroundColor: '#FF6B6B',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
