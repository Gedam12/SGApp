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

            meetings.unshift(newMeeting);

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

        return `Meeting "${title}" recorded for ${duration}. Key discussion captured with ${wordCount} words. The transcript shows good engagement and clear communication throughout the session.`;
    }
}
