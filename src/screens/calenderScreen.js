import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export function CalendarScreen() {
    const navigation = useNavigation();
    const [events, setEvents] = useState([]);

    useEffect(() => {
        // Load mock calendar events
        const mockEvents = [
            {
                id: '1',
                title: 'Team Standup',
                time: '9:00 AM - 9:30 AM',
                date: 'Today',
                location: 'Conference Room A',
            },
            {
                id: '2',
                title: 'Product Strategy Meeting',
                time: '2:00 PM - 3:00 PM',
                date: 'Today',
                location: 'Virtual',
            },
            {
                id: '3',
                title: 'Client Presentation',
                time: '10:00 AM - 11:00 AM',
                date: 'Tomorrow',
                location: 'Main Conference Room',
            },
        ];
        setEvents(mockEvents);
    }, []);

    const startRecording = (event) => {
        alert(`Starting recording for: ${event.title}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Calendar</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.sectionTitle}>Upcoming Meetings</Text>

                {events.map((event) => (
                    <View key={event.id} style={styles.eventCard}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventTime}>{event.time}</Text>
                        <Text style={styles.eventLocation}>📍 {event.location}</Text>

                        <TouchableOpacity
                            style={styles.recordButton}
                            onPress={() => startRecording(event)}
                        >
                            <Text style={styles.recordButtonText}>🎤 Start Recording</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#667eea',
        padding: 20,
        paddingTop: 40,
    },
    backButton: {
        padding: 5,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 50,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    eventCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    eventTime: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    eventLocation: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
    },
    recordButton: {
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    recordButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
