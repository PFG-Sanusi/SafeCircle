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

export default function EmergencyContactsScreen() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/emergency-contacts');
            setContacts(response.data.contacts || []);
        } catch (error) {
            console.error('Fetch contacts error:', error);
            Alert.alert('Error', 'Failed to load emergency contacts');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAddContact = () => {
        setEditingContact(null);
        setContactName('');
        setContactPhone('');
        setContactEmail('');
        setModalVisible(true);
    };

    const handleEditContact = (contact) => {
        setEditingContact(contact);
        setContactName(contact.contact_name);
        setContactPhone(contact.contact_phone);
        setContactEmail(contact.contact_email || '');
        setModalVisible(true);
    };

    const handleSaveContact = async () => {
        if (!contactName.trim() || !contactPhone.trim()) {
            Alert.alert('Error', 'Name and phone number are required');
            return;
        }

        try {
            if (editingContact) {
                await api.put(`/emergency-contacts/${editingContact.id}`, {
                    contactName,
                    contactPhone,
                    contactEmail
                });
            } else {
                await api.post('/emergency-contacts', {
                    contactName,
                    contactPhone,
                    contactEmail
                });
            }
            setModalVisible(false);
            fetchContacts();
        } catch (error) {
            Alert.alert('Error', 'Failed to save contact');
        }
    };

    const handleDeleteContact = (contactId, contactName) => {
        Alert.alert(
            'Delete Contact',
            `Are you sure you want to delete "${contactName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/emergency-contacts/${contactId}`);
                            fetchContacts();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete contact');
                        }
                    }
                }
            ]
        );
    };

    const renderContact = ({ item, index }) => (
        <View style={styles.contactCard}>
            <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>{index + 1}</Text>
            </View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.contact_name}</Text>
                <Text style={styles.contactPhone}>{item.contact_phone}</Text>
                {item.contact_email && (
                    <Text style={styles.contactEmail}>{item.contact_email}</Text>
                )}
            </View>
            <View style={styles.contactActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditContact(item)}
                >
                    <Ionicons name="pencil" size={20} color="#4CAF50" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteContact(item.id, item.contact_name)}
                >
                    <Ionicons name="trash" size={20} color="#ff4444" />
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
            <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={24} color="#FF6B6B" />
                <Text style={styles.infoText}>
                    These contacts will be notified when you trigger an SOS alert
                </Text>
            </View>

            <FlatList
                data={contacts}
                renderItem={renderContact}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={fetchContacts} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="person-add-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No emergency contacts</Text>
                        <Text style={styles.emptySubtext}>Add contacts to notify in emergencies</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={handleAddContact}>
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Add/Edit Contact Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contact Name *"
                            value={contactName}
                            onChangeText={setContactName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number *"
                            value={contactPhone}
                            onChangeText={setContactPhone}
                            keyboardType="phone-pad"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Email (optional)"
                            value={contactEmail}
                            onChangeText={setContactEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveContact}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
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
    infoCard: {
        backgroundColor: '#fff0f0',
        flexDirection: 'row',
        padding: 15,
        margin: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: '#666',
    },
    list: {
        padding: 15,
        paddingTop: 0,
    },
    contactCard: {
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
    priorityBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    priorityText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    contactPhone: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    contactEmail: {
        fontSize: 12,
        color: '#999',
    },
    contactActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        padding: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
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
    saveButton: {
        backgroundColor: '#FF6B6B',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
