const fs = require('fs').promises;
const path = require('path');

class PreferencesService {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.preferencesFile = path.join(this.dataDir, 'preferences.json');
        this.userPreferences = {};

        this.initializePreferences();
    }

    async initializePreferences() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });

            try {
                const data = await fs.readFile(this.preferencesFile, 'utf8');
                this.userPreferences = JSON.parse(data);
            } catch (error) {
                this.userPreferences = {};
                await this.savePreferences();
            }

            console.log(`Preferences service initialized for ${Object.keys(this.userPreferences).length} users`);
        } catch (error) {
            console.error('Error initializing preferences service:', error);
            this.userPreferences = {};
        }
    }

    async extractAndStorePreferences(userMessage, botResponse, userId = 'default') {
        try {
            const preferences = this.extractPreferencesFromText(userMessage, botResponse);

            if (preferences.length > 0) {
                await this.storeUserPreferences(userId, preferences);
                console.log(`Extracted ${preferences.length} preferences for user ${userId}`);
            }
        } catch (error) {
            console.error('Error extracting preferences:', error);
        }
    }

    extractPreferencesFromText(userMessage, botResponse) {
        const preferences = [];
        const lowerMessage = userMessage.toLowerCase();

        // Pattern matching for preferences
        const patterns = [
            // Likes/Dislikes
            { pattern: /i like ([^,.!?]+)/gi, type: 'like' },
            { pattern: /i love ([^,.!?]+)/gi, type: 'love' },
            { pattern: /i enjoy ([^,.!?]+)/gi, type: 'like' },
            { pattern: /i prefer ([^,.!?]+)/gi, type: 'prefer' },
            { pattern: /i hate ([^,.!?]+)/gi, type: 'dislike' },
            { pattern: /i don't like ([^,.!?]+)/gi, type: 'dislike' },
            { pattern: /i dislike ([^,.!?]+)/gi, type: 'dislike' },

            // Activities
            { pattern: /i usually ([^,.!?]+)/gi, type: 'habit' },
            { pattern: /i always ([^,.!?]+)/gi, type: 'habit' },
            { pattern: /every day i ([^,.!?]+)/gi, type: 'routine' },
            { pattern: /my favorite ([^,.!?]+) is ([^,.!?]+)/gi, type: 'favorite' },

            // Personal info
            { pattern: /my name is ([^,.!?]+)/gi, type: 'name' },
            { pattern: /call me ([^,.!?]+)/gi, type: 'name' },
            { pattern: /i am (\d+) years old/gi, type: 'age' },
            { pattern: /i work as a ([^,.!?]+)/gi, type: 'job' },
            { pattern: /i live in ([^,.!?]+)/gi, type: 'location' }
        ];

        patterns.forEach(({ pattern, type }) => {
            let match;
            while ((match = pattern.exec(userMessage)) !== null) {
                let value = match[1].trim();

                // Special handling for favorites
                if (type === 'favorite' && match[2]) {
                    value = { category: match[1].trim(), item: match[2].trim() };
                }

                preferences.push({
                    type,
                    value,
                    confidence: this.calculateConfidence(match[0]),
                    extractedAt: new Date().toISOString(),
                    source: 'conversation'
                });
            }
        });

        // Extract implicit preferences from context
        const contextualPreferences = this.extractContextualPreferences(userMessage, botResponse);
        preferences.push(...contextualPreferences);

        return preferences;
    }

    extractContextualPreferences(userMessage, botResponse) {
        const preferences = [];
        const lowerMessage = userMessage.toLowerCase();

        // Time preferences
        if (lowerMessage.includes('morning') || lowerMessage.includes('early')) {
            preferences.push({
                type: 'time_preference',
                value: 'morning_person',
                confidence: 0.6,
                extractedAt: new Date().toISOString(),
                source: 'contextual'
            });
        }

        if (lowerMessage.includes('night') || lowerMessage.includes('late')) {
            preferences.push({
                type: 'time_preference',
                value: 'night_person',
                confidence: 0.6,
                extractedAt: new Date().toISOString(),
                source: 'contextual'
            });
        }

        // Communication style
        if (lowerMessage.length > 100) {
            preferences.push({
                type: 'communication_style',
                value: 'detailed',
                confidence: 0.5,
                extractedAt: new Date().toISOString(),
                source: 'behavioral'
            });
        }

        if (lowerMessage.length < 20) {
            preferences.push({
                type: 'communication_style',
                value: 'brief',
                confidence: 0.5,
                extractedAt: new Date().toISOString(),
                source: 'behavioral'
            });
        }

        return preferences;
    }

    calculateConfidence(extractedText) {
        // Simple confidence calculation based on certainty words
        const certaintyWords = ['really', 'absolutely', 'definitely', 'always', 'never'];
        const uncertaintyWords = ['maybe', 'sometimes', 'perhaps', 'might'];

        const text = extractedText.toLowerCase();

        if (certaintyWords.some(word => text.includes(word))) {
            return 0.9;
        }

        if (uncertaintyWords.some(word => text.includes(word))) {
            return 0.4;
        }

        return 0.7; // Default confidence
    }

    async storeUserPreferences(userId, newPreferences) {
        try {
            if (!this.userPreferences[userId]) {
                this.userPreferences[userId] = {
                    userId,
                    createdAt: new Date().toISOString(),
                    preferences: {}
                };
            }

            const userPrefs = this.userPreferences[userId].preferences;

            newPreferences.forEach(pref => {
                const key = `${pref.type}_${this.hashValue(pref.value)}`;

                if (!userPrefs[key] || userPrefs[key].confidence < pref.confidence) {
                    userPrefs[key] = pref;
                }
            });

            this.userPreferences[userId].updatedAt = new Date().toISOString();
            await this.savePreferences();

        } catch (error) {
            console.error('Error storing user preferences:', error);
        }
    }

    async getUserPreferences(userId = 'default') {
        try {
            const userPrefs = this.userPreferences[userId];

            if (!userPrefs) {
                return {};
            }

            // Convert preferences to a more usable format
            const formattedPrefs = {};
            Object.values(userPrefs.preferences).forEach(pref => {
                if (!formattedPrefs[pref.type]) {
                    formattedPrefs[pref.type] = [];
                }
                formattedPrefs[pref.type].push(pref);
            });

            // Sort by confidence and recency
            Object.keys(formattedPrefs).forEach(type => {
                formattedPrefs[type].sort((a, b) => {
                    const scoreA = a.confidence * this.getRecencyScore(a.extractedAt);
                    const scoreB = b.confidence * this.getRecencyScore(b.extractedAt);
                    return scoreB - scoreA;
                });
            });

            return formattedPrefs;
        } catch (error) {
            console.error('Error getting user preferences:', error);
            return {};
        }
    }

    getRecencyScore(timestamp) {
        const now = new Date();
        const prefTime = new Date(timestamp);
        const diffDays = (now - prefTime) / (1000 * 60 * 60 * 24);

        // Recent preferences are more relevant
        return Math.exp(-diffDays / 30); // Decay over 30 days
    }

    async updatePreference(userId, type, value, confidence = 0.8) {
        try {
            const preference = {
                type,
                value,
                confidence,
                extractedAt: new Date().toISOString(),
                source: 'manual'
            };

            await this.storeUserPreferences(userId, [preference]);
            return true;
        } catch (error) {
            console.error('Error updating preference:', error);
            return false;
        }
    }

    async removePreference(userId, type, value) {
        try {
            if (!this.userPreferences[userId]) {
                return false;
            }

            const key = `${type}_${this.hashValue(value)}`;
            delete this.userPreferences[userId].preferences[key];

            this.userPreferences[userId].updatedAt = new Date().toISOString();
            await this.savePreferences();

            return true;
        } catch (error) {
            console.error('Error removing preference:', error);
            return false;
        }
    }

    hashValue(value) {
        // Simple hash function for creating keys
        if (typeof value === 'object') {
            value = JSON.stringify(value);
        }
        return value.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    async savePreferences() {
        try {
            await fs.writeFile(
                this.preferencesFile,
                JSON.stringify(this.userPreferences, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    getPreferencesStats() {
        const userCount = Object.keys(this.userPreferences).length;
        let totalPreferences = 0;

        Object.values(this.userPreferences).forEach(user => {
            totalPreferences += Object.keys(user.preferences || {}).length;
        });

        return {
            userCount,
            totalPreferences,
            averagePreferencesPerUser: userCount > 0 ? Math.round(totalPreferences / userCount) : 0
        };
    }

    async clearUserPreferences(userId) {
        try {
            if (this.userPreferences[userId]) {
                delete this.userPreferences[userId];
                await this.savePreferences();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error clearing user preferences:', error);
            return false;
        }
    }
}

module.exports = PreferencesService;