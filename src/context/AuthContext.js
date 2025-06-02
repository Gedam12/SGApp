import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// For web, we'll use localStorage, for mobile we'll use AsyncStorage
const storage = {
    async getItem(key) {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        } else {
            // For mobile, we'd use SecureStore or AsyncStorage
            return null;
        }
    },

    async setItem(key, value) {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
        } else {
            // For mobile, we'd use SecureStore or AsyncStorage
        }
    },

    async removeItem(key) {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
        } else {
            // For mobile, we'd use SecureStore or AsyncStorage
        }
    }
};

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredUser();
    }, []);

    const loadStoredUser = async () => {
        try {
            console.log('Loading stored user...');
            const storedUser = await storage.getItem('user');
            console.log('Stored user:', storedUser);
            if (storedUser) {
                setUser(JSON.parse(storedUser));
                console.log('User loaded from storage');
            }
        } catch (error) {
            console.error('Error loading stored user:', error);
        } finally {
            setLoading(false);
            console.log('Loading complete');
        }
    };

    const signIn = async (email, password) => {
        console.log('signIn called with:', email, password);
        try {
            const mockUser = {
                id: '1',
                email,
                name: email.split('@')[0],
            };

            console.log('About to save user:', mockUser);
            await storage.setItem('user', JSON.stringify(mockUser));
            console.log('User saved, setting state');
            setUser(mockUser);
            console.log('User state set successfully');
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    };

    const signInWithGoogle = async () => {
        console.log('Google sign in called');
        try {
            const mockUser = {
                id: '1',
                email: 'user@gmail.com',
                name: 'Test User',
            };

            console.log('About to save Google user:', mockUser);
            await storage.setItem('user', JSON.stringify(mockUser));
            console.log('Google user saved, setting state');
            setUser(mockUser);
            console.log('Google user state set successfully');
        } catch (error) {
            console.error('Google sign in error:', error);
            throw error;
        }
    };

    const signOut = async () => {
        console.log('Sign out called');
        try {
            await storage.removeItem('user');
            setUser(null);
            console.log('User signed out successfully');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                signIn,
                signInWithGoogle,
                signOut,
                isAuthenticated: !!user
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
