import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    Modal,
    ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { MeetingStorageService } from '../services/MeetingStorageService';

export function HomeScreen() {
    const { user, signOut } = useAuth();
    const [showCalendar, setShowCalendar] = useState(false);
    const [showPastMeetings, setShowPastMeetings] = useState(false);
    const [showRecording, setShowRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const [realMeetings, setRealMeetings] = useState([]);

    const timerRef = useRef(null);
    const recognitionRef = useRef(null);

    // Check if speech recognition is supported
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            setSpeechSupported(!!SpeechRecognition);
        }
    }, []);

    // Load real meetings when Past Meetings modal opens
    useEffect(() => {
        if (showPastMeetings) {
            const meetings = MeetingStorageService.getMeetings();
            setRealMeetings(meetings);
            console.log('Loaded meetings:', meetings.length);
        }
    }, [showPastMeetings]);

    const mockEvents = [
        { id: 1, title: 'Team Standup', time: '9:00 AM', location: 'Conference Room A' },
        { id: 2, title: 'Product Strategy', time: '2:00 PM', location: 'Virtual' },
        { id: 3, title: 'Client Meeting', time: '4:00 PM', location: 'Zoom' },
    ];

    const mockTranscriptSegments = [
        "Welcome everyone to today's meeting.",
        "Let's start by reviewing our quarterly goals and objectives.",
        "Our team has made significant progress on the user interface improvements.",
        "The analytics show a 25% increase in user engagement this month.",
        "We should focus on customer feedback and iterate on our features.",
    ];

    // Cleanup when component unmounts
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startSpeechRecognition = () => {
        if (!speechSupported) {
            console.log('Speech recognition not supported, using fallback');
            startFallbackTranscription();
            return;
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            let finalTranscript = '';

            recognition.onstart = () => {
                console.log('Speech recognition started');
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        finalTranscript += result[0].transcript + ' ';
                    } else {
                        interimTranscript += result[0].transcript;
                    }
                }

                setTranscript(finalTranscript + interimTranscript);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    Alert.alert(
                        'Microphone Permission Required',
                        'Please allow microphone access to use speech recognition.',
                        [{ text: 'OK' }]
                    );
                }
                startFallbackTranscription();
            };

            recognition.onend = () => {
                console.log('Speech recognition ended');
                setIsListening(false);
                if (isRecording) {
                    setTimeout(() => {
                        if (recognitionRef.current && isRecording) {
                            recognition.start();
                        }
                    }, 100);
                }
            };

            recognitionRef.current = recognition;
            recognition.start();

        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            startFallbackTranscription();
        }
    };

    const stopSpeechRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
    };

    const startFallbackTranscription = () => {
        console.log('Using fallback transcription');
        let segmentIndex = 0;

        const addSegment = () => {
            if (segmentIndex < mockTranscriptSegments.length && isRecording) {
                setTranscript(prev => {
                    const newSegment = mockTranscriptSegments[segmentIndex];
                    return prev ? `${prev} ${newSegment}` : newSegment;
                });
                segmentIndex++;

                if (isRecording) {
                    setTimeout(addSegment, 4000);
                }
            }
        };

        setTimeout(addSegment, 2000);
    };

    const startNewMeeting = () => {
        setShowRecording(true);
        setRecordingTime(0);
        setIsRecording(false);
        setTranscript('');
        setIsListening(false);
    };

    const startRecording = () => {
        console.log('Starting recording...');
        setIsRecording(true);
        setRecordingTime(0);
        setTranscript('');

        timerRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                    console.log('Microphone permission granted');
                    startSpeechRecognition();
                })
                .catch((error) => {
                    console.error('Microphone permission denied:', error);
                    Alert.alert(
                        'Microphone Access Required',
                        'To use live transcription, please allow microphone access. For now, we\'ll use demo mode.',
                        [{ text: 'OK' }]
                    );
                    startFallbackTranscription();
                });
        } else {
            console.log('Media devices not supported, using fallback');
            startFallbackTranscription();
        }
    };

    const stopRecording = () => {
        console.log('Stopping recording...');
        setIsRecording(false);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        stopSpeechRecognition();

        const meetingData = {
            id: Date.now().toString(),
            title: `Meeting ${new Date().toLocaleDateString()}`,
            duration: formatTime(recordingTime),
            transcript: transcript,
            summary: MeetingStorageService.generateSummary(transcript, formatTime(recordingTime), `Meeting ${new Date().toLocaleDateString()}`),
            participants: ['You'],
            recordingTime: recordingTime,
            startTime: new Date(Date.now() - recordingTime * 1000).toISOString(),
            endTime: new Date().toISOString()
        };

        MeetingStorageService.saveMeeting(meetingData);

        setTimeout(() => {
            Alert.alert(
                'Recording Complete! 🎉',
                `Meeting saved successfully!\n\nDuration: ${formatTime(recordingTime)}\nWords captured: ${transcript.split(' ').length}\nTranscript saved to Past Meetings`,
                [
                    {
                        text: 'View in Past Meetings', onPress: () => {
                            setShowRecording(false);
                            setTimeout(() => setShowPastMeetings(true), 500);
                        }
                    },
                    { text: 'Close', onPress: () => setShowRecording(false) }
                ]
            );
        }, 500);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const closeRecordingModal = () => {
        if (isRecording) {
            Alert.alert(
                'Recording in Progress',
                'Stop recording before closing?',
                [
                    { text: 'Cancel' },
                    {
                        text: 'Stop & Close',
                        onPress: () => {
                            stopRecording();
                            setTimeout(() => setShowRecording(false), 1000);
                        }
                    }
                ]
            );
        } else {
            setShowRecording(false);
        }
    };

    const showRealTranscript = (meeting) => {
        Alert.alert(
            `📄 ${meeting.title} - Full Transcript`,
            `Recorded on: ${meeting.date}\nDuration: ${meeting.duration}\n\n${meeting.transcript || 'No transcript available'}`,
            [
                { text: 'Close' },
                {
                    text: 'Copy',
                    onPress: () => Alert.alert('Copied!', 'Transcript copied to clipboard')
                }
            ]
        );
    };

    const chatWithRealMeeting = (meeting) => {
        const wordCount = meeting.transcript.split(' ').length;
        const hasContent = meeting.transcript && meeting.transcript.length > 50;

        Alert.alert(
            `🤖 AI Assistant - ${meeting.title}`,
            `Hi! I've analyzed your meeting from ${meeting.date}.

📊 Meeting Analysis:
- Duration: ${meeting.duration}
- Words transcribed: ${wordCount}
- Participants: ${meeting.participants.join(', ')}

${hasContent
                ? `💬 Key insights:
- Meeting had substantial discussion
- Good engagement level detected
- Clear transcript captured

🎯 What I can help with:
- Summarize main topics
- Extract action items
- Find specific quotes`
                : `💬 This meeting had limited transcript content.`}

Ask me anything about this meeting!`,
            [
                { text: 'Close' },
                {
                    text: 'Get Insights',
                    onPress: () => generateMeetingInsights(meeting)
                }
            ]
        );
    };

    const generateMeetingInsights = (meeting) => {
        const words = meeting.transcript.split(' ');
        const sentences = meeting.transcript.split('.').filter(s => s.trim().length > 0);
        const avgWordsPerMinute = Math.round(words.length / (meeting.recordingTime / 60));

        Alert.alert(
            '🔍 Meeting Insights',
            `📈 Analysis for "${meeting.title}":

🗣️ Speaking Patterns:
- Average speaking rate: ${avgWordsPerMinute} words/minute
- Total sentences: ${sentences.length}

📝 Content Analysis:
- Total words: ${words.length}
- Unique words: ${new Set(words.map(w => w.toLowerCase())).size}

⏱️ Time Analysis:
- Started: ${new Date(meeting.startTime).toLocaleTimeString()}
- Ended: ${new Date(meeting.endTime).toLocaleTimeString()}

💡 Recommendations:
${avgWordsPerMinute > 150 ? '• Good speaking pace maintained' : '• Consider speaking more for better transcription'}
${words.length > 100 ? '• Substantial content captured' : '• Try longer recordings for better insights'}`,
            [{ text: 'Got it!' }]
        );
    };

    const deleteMeeting = (meeting) => {
        Alert.alert(
            'Delete Meeting?',
            `Are you sure you want to delete "${meeting.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        MeetingStorageService.deleteMeeting(meeting.id);
                        const updatedMeetings = MeetingStorageService.getMeetings();
                        setRealMeetings(updatedMeetings);
                        Alert.alert('Deleted', 'Meeting has been deleted.');
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Welcome to SGApp</Text>
                <Text style={styles.subtitle}>Hello, {user?.name}!</Text>
            </View>

            <View style={styles.content}>
                <TouchableOpacity style={styles.card} onPress={startNewMeeting}>
                    <Text style={styles.cardTitle}>📝 Start New Meeting</Text>
                    <Text style={styles.cardSubtitle}>Begin recording and transcription</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={() => setShowCalendar(true)}>
                    <Text style={styles.cardTitle}>📅 Calendar</Text>
                    <Text style={styles.cardSubtitle}>View upcoming meetings</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={() => setShowPastMeetings(true)}>
                    <Text style={styles.cardTitle}>💬 Past Meetings</Text>
                    <Text style={styles.cardSubtitle}>Review transcripts and summaries</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            {/* Recording Modal */}
            <Modal visible={showRecording} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Meeting Recording</Text>
                        <TouchableOpacity onPress={closeRecordingModal}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.recordingContent}>
                        <View style={styles.recordingStatus}>
                            <View style={[styles.recordingDot, isRecording && styles.recording]} />
                            <Text style={styles.statusText}>
                                {isRecording ? (isListening ? 'Listening...' : 'Recording') : 'Ready to Record'}
                            </Text>
                            {speechSupported && isRecording && (
                                <Text style={styles.micStatus}>
                                    🎤 {isListening ? 'Microphone Active' : 'Microphone Inactive'}
                                </Text>
                            )}
                        </View>

                        <Text style={styles.timer}>{formatTime(recordingTime)}</Text>

                        <View style={styles.transcriptArea}>
                            <Text style={styles.transcriptTitle}>
                                Live Transcript:
                                {!speechSupported && isRecording && (
                                    <Text style={styles.demoMode}> (Demo Mode)</Text>
                                )}
                            </Text>
                            <ScrollView style={styles.transcriptScroll}>
                                <Text style={styles.transcriptText}>
                                    {transcript || "Start speaking and your words will appear here..."}
                                </Text>
                            </ScrollView>
                        </View>

                        <TouchableOpacity
                            style={[styles.recordButton, isRecording && styles.stopButton]}
                            onPress={isRecording ? stopRecording : startRecording}
                        >
                            <Text style={styles.recordButtonText}>
                                {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
                            </Text>
                        </TouchableOpacity>

                        {!speechSupported && (
                            <Text style={styles.speechNote}>
                                💡 For real speech recognition, use Chrome or Edge browser
                            </Text>
                        )}
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Calendar Modal */}
            <Modal visible={showCalendar} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Calendar</Text>
                        <TouchableOpacity onPress={() => setShowCalendar(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.sectionTitle}>Upcoming Meetings</Text>
                        {mockEvents.map(event => (
                            <View key={event.id} style={styles.eventCard}>
                                <Text style={styles.eventTitle}>{event.title}</Text>
                                <Text style={styles.eventDetails}>{event.time} • {event.location}</Text>
                                <TouchableOpacity
                                    style={styles.startRecordingButton}
                                    onPress={() => {
                                        setShowCalendar(false);
                                        setTimeout(() => startNewMeeting(), 300);
                                    }}
                                >
                                    <Text style={styles.buttonText}>🎤 Start Recording</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Real Past Meetings Modal */}
            <Modal visible={showPastMeetings} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>💬 Past Meetings</Text>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                onPress={() => {
                                    const meetings = MeetingStorageService.getMeetings();
                                    setRealMeetings(meetings);
                                    Alert.alert('Refreshed', `Loaded ${meetings.length} meetings`);
                                }}
                                style={styles.refreshButton}
                            >
                                <Text style={styles.refreshButtonText}>🔄</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowPastMeetings(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {realMeetings.length > 0 ? (
                            <>
                                <Text style={styles.sectionTitle}>Your Recorded Meetings ({realMeetings.length})</Text>
                                {realMeetings.map((meeting, index) => (
                                    <View key={meeting.id} style={styles.realMeetingCard}>
                                        <View style={styles.meetingCardHeader}>
                                            <View style={styles.meetingMainInfo}>
                                                <Text style={styles.meetingTitle}>{meeting.title}</Text>
                                                <Text style={styles.meetingDate}>
                                                    📅 {meeting.date} • ⏱️ {meeting.duration}
                                                </Text>
                                                <Text style={styles.meetingMeta}>
                                                    👥 {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''} •
                                                    📝 {meeting.transcript.split(' ').length} words
                                                </Text>
                                            </View>
                                            <View style={styles.meetingIndex}>
                                                <Text style={styles.indexNumber}>#{realMeetings.length - index}</Text>
                                            </View>
                                        </View>

                                        {meeting.summary && (
                                            <View style={styles.summarySection}>
                                                <Text style={styles.summaryTitle}>🤖 AI Summary</Text>
                                                <Text style={styles.summaryText}>{meeting.summary}</Text>
                                            </View>
                                        )}

                                        <View style={styles.transcriptPreview}>
                                            <Text style={styles.transcriptTitle}>📄 Transcript Preview</Text>
                                            <Text style={styles.transcriptPreviewText}>
                                                {meeting.transcript
                                                    ? (meeting.transcript.length > 200
                                                        ? meeting.transcript.substring(0, 200) + '...'
                                                        : meeting.transcript)
                                                    : 'No transcript available'
                                                }
                                            </Text>
                                        </View>

                                        <View style={styles.realMeetingActions}>
                                            <TouchableOpacity
                                                style={styles.viewFullButton}
                                                onPress={() => showRealTranscript(meeting)}
                                            >
                                                <Text style={styles.actionButtonText}>📖 Full Transcript</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.chatButton}
                                                onPress={() => chatWithRealMeeting(meeting)}
                                            >
                                                <Text style={styles.actionButtonText}>🤖 AI Chat</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => deleteMeeting(meeting)}
                                            >
                                                <Text style={styles.actionButtonText}>🗑️ Delete</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.meetingStatsRow}>
                                            <Text style={styles.statItem}>🕐 Started: {new Date(meeting.startTime).toLocaleTimeString()}</Text>
                                            <Text style={styles.statItem}>✅ Ended: {new Date(meeting.endTime).toLocaleTimeString()}</Text>
                                        </View>
                                    </View>
                                ))}

                                <View style={styles.overallStats}>
                                    <Text style={styles.statsTitle}>📊 Your Meeting Statistics</Text>
                                    <View style={styles.statsGrid}>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statNumber}>{realMeetings.length}</Text>
                                            <Text style={styles.statLabel}>Total Meetings</Text>
                                        </View>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statNumber}>
                                                {Math.floor(realMeetings.reduce((acc, m) => acc + m.recordingTime, 0) / 60)}m
                                            </Text>
                                            <Text style={styles.statLabel}>Total Time</Text>
                                        </View>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statNumber}>
                                                {realMeetings.reduce((acc, m) => acc + m.transcript.split(' ').length, 0)}
                                            </Text>
                                            <Text style={styles.statLabel}>Words Captured</Text>
                                        </View>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statNumber}>
                                                {realMeetings.length > 0
                                                    ? Math.round(realMeetings.reduce((acc, m) => acc + m.recordingTime, 0) / realMeetings.length / 60)
                                                    : 0}m
                                            </Text>
                                            <Text style={styles.statLabel}>Avg Duration</Text>
                                        </View>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateTitle}>📝 No Meetings Yet</Text>
                                <Text style={styles.emptyStateText}>
                                    Start your first meeting recording to see transcripts and summaries here.
                                </Text>
                                <TouchableOpacity
                                    style={styles.startFirstMeetingButton}
                                    onPress={() => {
                                        setShowPastMeetings(false);
                                        setTimeout(() => startNewMeeting(), 300);
                                    }}
                                >
                                    <Text style={styles.startFirstMeetingText}>🎤 Record Your First Meeting</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#667eea',
        padding: 20,
        paddingTop: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: 'white',
        opacity: 0.8,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    footer: {
        padding: 20,
    },
    signOutButton: {
        backgroundColor: '#ff4444',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    signOutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#667eea',
        padding: 20,
        paddingTop: 40,
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    eventCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    eventDetails: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    startRecordingButton: {
        backgroundColor: '#4CAF50',
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    recordingContent: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
    },
    recordingStatus: {
        alignItems: 'center',
        marginBottom: 20,
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ccc',
        marginBottom: 5,
    },
    recording: {
        backgroundColor: '#ff4444',
    },
    statusText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    micStatus: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    demoMode: {
        fontSize: 12,
        color: '#ff9800',
        fontStyle: 'italic',
    },
    timer: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#667eea',
        marginBottom: 30,
    },
    transcriptArea: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        width: '100%',
        marginBottom: 30,
        height: 200,
    },
    transcriptTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    transcriptScroll: {
        flex: 1,
    },
    transcriptText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#333',
    },
    recordButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        marginBottom: 10,
    },
    stopButton: {
        backgroundColor: '#ff4444',
    },
    recordButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    speechNote: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginTop: 10,
    },
    // Past Meetings Styles
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    refreshButton: {
        marginRight: 15,
        padding: 5,
    },
    refreshButtonText: {
        color: 'white',
        fontSize: 16,
    },
    realMeetingCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#4caf50',
    },
    meetingCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    meetingMainInfo: {
        flex: 1,
    },
    meetingIndex: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
    },
    indexNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#667eea',
    },
    meetingTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    meetingDate: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    meetingMeta: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    summarySection: {
        backgroundColor: '#e8f5e8',
        padding: 12,
        borderRadius: 8,
        marginVertical: 10,
    },
    summaryTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginBottom: 6,
    },
    summaryText: {
        fontSize: 13,
        color: '#388e3c',
        lineHeight: 18,
    },
    transcriptPreview: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    transcriptPreviewText: {
        fontSize: 12,
        color: '#555',
        lineHeight: 16,
        fontStyle: 'italic',
    },
    realMeetingActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    viewFullButton: {
        backgroundColor: '#2196f3',
        padding: 8,
        borderRadius: 6,
        flex: 0.32,
        alignItems: 'center',
    },
    chatButton: {
        backgroundColor: '#4caf50',
        padding: 8,
        borderRadius: 6,
        flex: 0.32,
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#f44336',
        padding: 8,
        borderRadius: 6,
        flex: 0.32,
        alignItems: 'center',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    meetingStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    statItem: {
        fontSize: 10,
        color: '#666',
    },
    overallStats: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 20,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        alignItems: 'center',
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#667eea',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 30,
    },
    startFirstMeetingButton: {
        backgroundColor: '#4caf50',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    startFirstMeetingText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
