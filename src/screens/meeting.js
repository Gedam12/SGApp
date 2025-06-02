import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AudioService } from '../services/AudioService';
import { TranscriptionService } from '../services/TranscriptionService';
import { v4 as uuidv4 } from 'uuid';

export function MeetingRecordingScreen({ route }) {
    const navigation = useNavigation();
    const { meetingTitle = 'New Meeting' } = route.params || {};

    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [audioChunks, setAudioChunks] = useState([]);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const audioService = useRef(new AudioService());
    const transcriptionService = useRef(new TranscriptionService('your-openai-api-key'));
    const durationInterval = useRef(null);
    const meetingId = useRef(uuidv4());

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }
            if (isRecording) {
                handleStopRecording();
            }
        };
    }, []);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startDurationTimer = () => {
        durationInterval.current = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);
    };

    const stopDurationTimer = () => {
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }
    };

    const handleChunkReady = async (chunk) => {
        console.log('New audio chunk ready:', chunk.id);
        setAudioChunks(prev => [...prev, chunk]);

        // Start transcription for this chunk
        setIsTranscribing(true);
        try {
            const chunkTranscript = await transcriptionService.current.transcribeAudio(chunk.uri);

            // Update chunk with transcript
            const updatedChunk = { ...chunk, transcript: chunkTranscript, transcribed: true };

            // Update chunks list
            setAudioChunks(prev =>
                prev.map(c => c.id === chunk.id ? updatedChunk : c)
            );

            // Add to main transcript
            setTranscript(prev => prev + ' ' + chunkTranscript);

        } catch (error) {
            console.error('Transcription failed for chunk:', error);
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleStartRecording = async () => {
        try {
            console.log('Starting meeting recording...');
            await audioService.current.startRecording(meetingId.current, handleChunkReady);
            setIsRecording(true);
            setDuration(0);
            startDurationTimer();
            setTranscript('');
            setAudioChunks([]);
        } catch (error) {
            console.error('Failed to start recording:', error);
            Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
        }
    };

    const handleStopRecording = async () => {
        try {
            console.log('Stopping meeting recording...');
            const chunks = await audioService.current.stopRecording();
            setIsRecording(false);
            stopDurationTimer();

            Alert.alert(
                'Recording Stopped',
                'Meeting recording has been saved. Would you like to generate a summary?',
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Generate Summary', onPress: () => generateSummary() }
                ]
            );
        } catch (error) {
            console.error('Failed to stop recording:', error);
            Alert.alert('Error', 'Failed to stop recording properly.');
        }
    };

    const generateSummary = () => {
        // Navigate to summary screen or show summary modal
        Alert.alert('Summary', 'Meeting summary generation would happen here with AI.');
    };

    const handleBackPress = () => {
        if (isRecording) {
            Alert.alert(
                'Recording in Progress',
                'Stop recording before leaving this screen?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Stop & Leave',
                        style: 'destructive',
                        onPress: async () => {
                            await handleStopRecording();
                            navigation.goBack();
                        }
                    }
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{meetingTitle}</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Recording Status */}
            <View style={styles.statusContainer}>
                <View style={[styles.statusIndicator, isRecording && styles.recording]} />
                <Text style={styles.statusText}>
                    {isRecording ? 'Recording' : 'Ready to Record'}
                </Text>
                <Text style={styles.duration}>{formatDuration(duration)}</Text>
            </View>

            {/* Transcript Area */}
            <View style={styles.transcriptContainer}>
                <View style={styles.transcriptHeader}>
                    <Text style={styles.transcriptTitle}>Live Transcript</Text>
                    {isTranscribing && (
                        <View style={styles.transcribingIndicator}>
                            <ActivityIndicator size="small" color="#667eea" />
                            <Text style={styles.transcribingText}>Transcribing...</Text>
                        </View>
                    )}
                </View>

                <ScrollView style={styles.transcriptScroll} showsVerticalScrollIndicator={false}>
                    <Text style={styles.transcriptText}>
                        {transcript || 'Transcript will appear here as you speak...'}
                    </Text>
                </ScrollView>
            </View>

            {/* Audio Chunks Info */}
            <View style={styles.chunksContainer}>
                <Text style={styles.chunksTitle}>Audio Segments: {audioChunks.length}</Text>
                <Text style={styles.chunksSubtitle}>
                    {audioChunks.filter(c => c.transcribed).length} transcribed
                </Text>
            </View>

            {/* Controls */}
            <View style={styles.controlsContainer}>
                {!isRecording ? (
                    <TouchableOpacity style={styles.startButton} onPress={handleStartRecording}>
                        <Text style={styles.startButtonText}>🎤 Start Recording</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.stopButton} onPress={handleStopRecording}>
                        <Text style={styles.stopButtonText}>⏹️ Stop Recording</Text>
                    </TouchableOpacity>
                )}
            </View>
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
        padding: 20,
        backgroundColor: '#667eea',
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
        flex: 1,
        textAlign: 'center',
    },
    placeholder: {
        width: 50,
    },
    statusContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statusIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#ccc',
        marginBottom: 10,
    },
    recording: {
        backgroundColor: '#ff4444',
    },
    statusText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    duration: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#667eea',
    },
    transcriptContainer: {
        flex: 1,
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    transcriptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    transcriptTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    transcribingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transcribingText: {
        marginLeft: 5,
        fontSize: 12,
        color: '#667eea',
    },
    transcriptScroll: {
        flex: 1,
    },
    transcriptText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
    },
    chunksContainer: {
        margin: 20,
        marginTop: 0,
        padding: 15,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    chunksTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    chunksSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    controlsContainer: {
        padding: 20,
    },
    startButton: {
        backgroundColor: '#4CAF50',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    startButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    stopButton: {
        backgroundColor: '#ff4444',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    stopButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export class MeetingStorageService {
    static STORAGE_KEY = 'sgapp_meetings';

    // Save a meeting to local storage
    static saveMeeting(meeting) {
        try {
            const meetings = this.getMeetings();
            const newMeeting = {
                id: meeting.id || Date.now().toString(),
                title: meeting.title || 'Untitled Meeting',
                date: new Date().toLocaleDateString(),
                startTime: meeting.startTime || new Date().toISOString(),
                endTime: meeting.endTime || new Date().toISOString(),
                duration: meeting.duration || '0 min',
                transcript: meeting.transcript || '',
                summary: meeting.summary || '',
                participants: meeting.participants || ['You'],
                recordingTime: meeting.recordingTime || 0,
                createdAt: new Date().toISOString()
            };

            meetings.unshift(newMeeting); // Add to beginning of array

            // Keep only last 50 meetings to avoid storage bloat
            if (meetings.length > 50) {
                meetings.splice(50);
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(meetings));
            console.log('Meeting saved:', newMeeting.title);
            return newMeeting;
        } catch (error) {
            console.error('Error saving meeting:', error);
            return null;
        }
    }

    // Get all meetings from local storage
    static getMeetings() {
        try {
            const meetings = localStorage.getItem(this.STORAGE_KEY);
            return meetings ? JSON.parse(meetings) : [];
        } catch (error) {
            console.error('Error loading meetings:', error);
            return [];
        }
    }

    // Get a specific meeting by ID
    static getMeeting(id) {
        try {
            const meetings = this.getMeetings();
            return meetings.find(meeting => meeting.id === id);
        } catch (error) {
            console.error('Error getting meeting:', error);
            return null;
        }
    }

    // Delete a meeting
    static deleteMeeting(id) {
        try {
            const meetings = this.getMeetings();
            const filteredMeetings = meetings.filter(meeting => meeting.id !== id);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredMeetings));
            console.log('Meeting deleted:', id);
            return true;
        } catch (error) {
            console.error('Error deleting meeting:', error);
            return false;
        }
    }

    // Generate AI summary for a meeting
    static generateSummary(transcript, duration, title) {
        if (!transcript) return 'No transcript available for summary.';

        const wordCount = transcript.split(' ').length;
        const sentences = transcript.split('.').filter(s => s.trim().length > 0);

        // Extract key phrases (simple implementation)
        const commonWords = ['meeting', 'discuss', 'team', 'project', 'need', 'will', 'can', 'should'];
        const importantSentences = sentences.filter(sentence =>
            commonWords.some(word => sentence.toLowerCase().includes(word))
        ).slice(0, 3);

        return `Meeting "${title}" recorded for ${duration}. Key discussion points: ${importantSentences.join('. ')}. Total words captured: ${wordCount}.`;
    }

    // Clear all meetings (for testing)
    static clearAllMeetings() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('All meetings cleared');
            return true;
        } catch (error) {
            console.error('Error clearing meetings:', error);
            return false;
        }
    }
}

// Add state for real meetings data
const [realMeetings, setRealMeetings] = useState([]);

// Add useEffect to load real meetings when Past Meetings modal opens
useEffect(() => {
    if (showPastMeetings) {
        const meetings = MeetingStorageService.getMeetings();
        setRealMeetings(meetings);
        console.log('Loaded meetings:', meetings.length);
    }
}, [showPastMeetings]);

// Update the Past Meetings Modal JSX:
{/* Real Past Meetings Modal */ }
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
                            {/* Meeting Header */}
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

                            {/* AI Generated Summary */}
                            {meeting.summary && (
                                <View style={styles.summarySection}>
                                    <Text style={styles.summaryTitle}>🤖 AI Summary</Text>
                                    <Text style={styles.summaryText}>{meeting.summary}</Text>
                                </View>
                            )}

                            {/* Transcript Preview */}
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

                            {/* Action Buttons */}
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

                            {/* Meeting Stats */}
                            <View style={styles.meetingStatsRow}>
                                <Text style={styles.statItem}>🕐 Started: {new Date(meeting.startTime).toLocaleTimeString()}</Text>
                                <Text style={styles.statItem}>✅ Ended: {new Date(meeting.endTime).toLocaleTimeString()}</Text>
                            </View>
                        </View>
                    ))}

                    {/* Overall Stats */}
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
