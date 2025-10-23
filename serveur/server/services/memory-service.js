const fs = require('fs').promises;
const path = require('path');

class MemoryService {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.conversationsFile = path.join(this.dataDir, 'conversations.json');
        this.embeddingCache = new Map(); // Cache embeddings with LRU-like behavior
        this.maxCacheSize = 500; // Limit cache size for memory management
        this.conversations = [];
        this.conversationCounter = 0;
        this.personalityResetThreshold = 100;

        this.initializeStorage();
    }

    // Initialise le service mémoire en créant les dossiers et chargeant les conversations existantes
    async initializeStorage() {
        try {
            // Create data directory if it doesn't exist
            await fs.mkdir(this.dataDir, { recursive: true });

            // Load existing conversations
            try {
                const data = await fs.readFile(this.conversationsFile, 'utf8');
                this.conversations = JSON.parse(data);
            } catch (error) {
                // File doesn't exist, start with empty array
                this.conversations = [];
                await this.saveConversations();
            }

            console.log(`Memory service initialized with ${this.conversations.length} conversations`);
        } catch (error) {
            console.error('Error initializing memory service:', error);
            this.conversations = [];
        }
    }

    // Stocke une conversation dans la mémoire JSON et la base vectorielle avec vérification sécurité
    async storeConversation(conversationData, securityService = null) {
        try {
            // Security check: should this conversation be stored?
            if (securityService && !(await securityService.shouldStoreConversation(conversationData.message, conversationData.response))) {
                console.log('Conversation blocked from storage due to security policy');
                return null;
            }

            const conversation = {
                id: this.generateId(),
                timestamp: conversationData.timestamp || new Date().toISOString(),
                message: conversationData.message,
                response: conversationData.response,
                userContext: conversationData.userContext || {},
                visionContext: conversationData.visionContext || '',
                embeddings: this.generateSimpleEmbedding(conversationData.message)
            };

            // Store in JSON (for backup and fallback)
            this.conversations.push(conversation);
            this.conversationCounter++;

            // Check if personality reset is needed
            if (this.conversationCounter >= this.personalityResetThreshold) {
                await this.triggerPersonalityReset();
            }

            // Keep only last 1000 conversations to prevent memory issues
            if (this.conversations.length > 1000) {
                this.conversations = this.conversations.slice(-1000);
            }

            await this.saveConversations();

            // Store in ChromaDB (real RAG)
            await this.storeInRAG(conversation);

            console.log(`Stored conversation: ${conversation.message.substring(0, 50)}...`);

            return conversation.id;
        } catch (error) {
            console.error('Error storing conversation:', error);
            return null;
        }
    }

    // Ajoute une conversation dans la base de données vectorielle ChromaDB via script Python
    async storeInRAG(conversation) {
        try {
            const { spawn } = require('child_process');
            const path = require('path');

            const userId = conversation.userContext?.userId || 'default';

            return new Promise((resolve) => {
                const pythonProcess = spawn('python3', [
                    path.join(__dirname, '../scripts/rag_service.py'),
                    'add',
                    conversation.message,
                    conversation.response,
                    userId
                ]);

                pythonProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log(`Added conversation to RAG: ${conversation.id}`);
                    } else {
                        console.warn(`Failed to add conversation to RAG: ${conversation.id}`);
                    }
                    resolve();
                });

                // Timeout after 3 seconds
                setTimeout(() => {
                    pythonProcess.kill();
                    resolve();
                }, 3000);
            });

        } catch (error) {
            console.error('Error storing in RAG:', error);
        }
    }

    // Récupère le contexte pertinent pour une requête en utilisant la recherche sémantique RAG
    async getRelevantContext(query, userContext = {}, maxResults = 5, emotionContext = null, preferences = {}) {
        try {
            const userId = userContext.userId || 'default';

            // Use real RAG with ChromaDB
            let ragResults = await this.searchWithRAG(query, userId, maxResults * 2); // Get more results for re-ranking

            if (ragResults && ragResults.length > 0) {
                // Apply multimodal contextual re-ranking
                ragResults = this.applyContextualReRanking(ragResults, emotionContext, preferences, userContext);
                return ragResults.slice(0, maxResults); // Return top results after re-ranking
            }

            // Fallback to old method if RAG fails
            console.warn('RAG search failed, falling back to keyword search');
            return await this.getFallbackContext(query, userContext, maxResults);

        } catch (error) {
            console.error('Error getting relevant context:', error);
            return await this.getFallbackContext(query, userContext, maxResults);
        }
    }

    // Effectue une recherche sémantique dans ChromaDB via script Python
    async searchWithRAG(query, userId, maxResults) {
        try {
            const { spawn } = require('child_process');
            const path = require('path');

            return new Promise((resolve, reject) => {
                const pythonProcess = spawn('python3', [
                    path.join(__dirname, '../scripts/rag_service.py'),
                    'search',
                    query,
                    userId,
                    maxResults.toString()
                ]);

                let output = '';
                let errorOutput = '';

                pythonProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                pythonProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                pythonProcess.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const results = JSON.parse(output);
                            resolve(results);
                        } catch (parseError) {
                            console.error('Error parsing RAG results:', parseError);
                            resolve([]);
                        }
                    } else {
                        console.error('RAG search failed:', errorOutput);
                        resolve([]);
                    }
                });

                // Timeout after 5 seconds
                setTimeout(() => {
                    pythonProcess.kill();
                    resolve([]);
                }, 5000);
            });

        } catch (error) {
            console.error('RAG search error:', error);
            return [];
        }
    }

    // Recherche de contexte de secours basée sur similarité cosinus des embeddings simples
    async getFallbackContext(query, userContext = {}, maxResults = 5) {
        // Original keyword-based search as fallback
        if (this.conversations.length === 0) {
            return [];
        }

        const queryEmbedding = this.generateSimpleEmbedding(query);
        const userId = userContext.userId || 'default';

        const scoredConversations = this.conversations
            .filter(conv => {
                const convUserId = conv.userContext?.userId || 'default';
                return convUserId === userId;
            })
            .map(conv => ({
                ...conv,
                similarity: this.calculateSimilarity(queryEmbedding, conv.embeddings),
                recency: this.calculateRecencyScore(conv.timestamp)
            }))
            .map(conv => ({
                ...conv,
                totalScore: (conv.similarity * 0.7) + (conv.recency * 0.3)
            }))
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, maxResults);

        return scoredConversations;
    }

    // Recherche textuelle simple dans les conversations par mots-clés
    async searchConversations(searchTerm, userContext = {}) {
        try {
            const userId = userContext.userId || 'default';
            const lowerSearchTerm = searchTerm.toLowerCase();

            const results = this.conversations
                .filter(conv => {
                    const convUserId = conv.userContext?.userId || 'default';
                    return convUserId === userId;
                })
                .filter(conv =>
                    conv.message.toLowerCase().includes(lowerSearchTerm) ||
                    conv.response.toLowerCase().includes(lowerSearchTerm) ||
                    (conv.visionContext && conv.visionContext.toLowerCase().includes(lowerSearchTerm))
                )
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10);

            return results;
        } catch (error) {
            console.error('Error searching conversations:', error);
            return [];
        }
    }

    // Récupère l'historique des conversations d'un utilisateur trié par date
    async getConversationHistory(userContext = {}, limit = 20) {
        try {
            const userId = userContext.userId || 'default';

            const userConversations = this.conversations
                .filter(conv => {
                    const convUserId = conv.userContext?.userId || 'default';
                    return convUserId === userId;
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);

            return userConversations;
        } catch (error) {
            console.error('Error getting conversation history:', error);
            return [];
        }
    }

    // Génère un embedding simple basé sur fréquence des mots avec cache LRU
    generateSimpleEmbedding(text) {
        // Check cache first
        if (this.embeddingCache.has(text)) {
            // Move to end for LRU behavior
            const cachedEmbedding = this.embeddingCache.get(text);
            this.embeddingCache.delete(text);
            this.embeddingCache.set(text, cachedEmbedding);
            return cachedEmbedding;
        }

        // Simple word-based embedding for demonstration
        // In production, use proper embeddings like sentence-transformers
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2);

        const embedding = {};
        words.forEach(word => {
            embedding[word] = (embedding[word] || 0) + 1;
        });

        // Cache management: Remove oldest entries if cache is full
        if (this.embeddingCache.size >= this.maxCacheSize) {
            const firstKey = this.embeddingCache.keys().next().value;
            this.embeddingCache.delete(firstKey);
        }

        // Store in cache
        this.embeddingCache.set(text, embedding);

        return embedding;
    }

    // Calcule la similarité cosinus entre deux embeddings
    calculateSimilarity(embedding1, embedding2) {
        const keys1 = Object.keys(embedding1);
        const keys2 = Object.keys(embedding2);
        const allKeys = [...new Set([...keys1, ...keys2])];

        if (allKeys.length === 0) return 0;

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        allKeys.forEach(key => {
            const val1 = embedding1[key] || 0;
            const val2 = embedding2[key] || 0;

            dotProduct += val1 * val2;
            norm1 += val1 * val1;
            norm2 += val2 * val2;
        });

        if (norm1 === 0 || norm2 === 0) return 0;

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    // Calcule un score de récence qui décroît exponentiellement avec le temps
    calculateRecencyScore(timestamp) {
        const now = new Date();
        const conversationTime = new Date(timestamp);
        const diffHours = (now - conversationTime) / (1000 * 60 * 60);

        // Score decreases over time, higher for recent conversations
        return Math.exp(-diffHours / 24); // Decay over 24 hours
    }

    // Génère un identifiant unique basé sur timestamp et nombre aléatoire
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Sauvegarde les conversations dans le fichier JSON
    async saveConversations() {
        try {
            await fs.writeFile(
                this.conversationsFile,
                JSON.stringify(this.conversations, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('Error saving conversations:', error);
        }
    }

    // Efface toutes les conversations d'un utilisateur spécifique
    async clearMemory(userContext = {}) {
        try {
            const userId = userContext.userId || 'default';

            this.conversations = this.conversations.filter(conv => {
                const convUserId = conv.userContext?.userId || 'default';
                return convUserId !== userId;
            });

            await this.saveConversations();
            console.log(`Cleared memory for user: ${userId}`);
            return true;
        } catch (error) {
            console.error('Error clearing memory:', error);
            return false;
        }
    }

    // Migre toutes les conversations existantes vers la base vectorielle ChromaDB
    async migrateToRAG() {
        try {
            const { spawn } = require('child_process');
            const path = require('path');

            console.log('Starting migration to RAG...');

            return new Promise((resolve) => {
                const pythonProcess = spawn('python3', [
                    path.join(__dirname, '../scripts/rag_service.py'),
                    'migrate',
                    this.conversationsFile
                ]);

                let output = '';

                pythonProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                pythonProcess.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const result = JSON.parse(output);
                            console.log(`Migration complete: ${result.migrated} conversations migrated to RAG`);
                            resolve(result.migrated);
                        } catch (error) {
                            console.error('Error parsing migration result:', error);
                            resolve(0);
                        }
                    } else {
                        console.error('Migration failed');
                        resolve(0);
                    }
                });

                // Timeout after 30 seconds
                setTimeout(() => {
                    pythonProcess.kill();
                    resolve(0);
                }, 30000);
            });

        } catch (error) {
            console.error('Error during migration:', error);
            return 0;
        }
    }

    // Déclenche une réinitialisation de la personnalité après 100 conversations
    async triggerPersonalityReset() {
        try {
            console.log('Triggering personality reset - reached conversation threshold');

            // Load baseline personality
            const baselineFile = path.join(this.dataDir, 'personality-baseline.json');
            const baseline = JSON.parse(await fs.readFile(baselineFile, 'utf8'));

            console.log('✅ Personality reset completed - robot behavior refreshed from baseline');

            // Reset counter
            this.conversationCounter = 0;

            return baseline;
        } catch (error) {
            console.error('Error during personality reset:', error);
            // Reset counter anyway to prevent infinite attempts
            this.conversationCounter = 0;
        }
    }

    // Applique le re-ranking contextuel multimodal aux résultats RAG
    applyContextualReRanking(ragResults, emotionContext, preferences, userContext) {
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const timeOfDay = this.getTimeOfDay(currentHour);

        return ragResults.map(result => {
            let contextualBoost = 0;

            // Boost basé sur l'émotion détectée
            if (emotionContext && result.visionContext) {
                const resultEmotion = this.extractEmotionFromContext(result.visionContext);
                if (resultEmotion === emotionContext.toLowerCase()) {
                    contextualBoost += 0.3;
                    console.log(`Emotion boost applied: ${emotionContext} match`);
                }
            }

            // Boost basé sur l'heure de la journée
            const resultTimeOfDay = this.extractTimeOfDayFromTimestamp(result.timestamp);
            if (resultTimeOfDay === timeOfDay) {
                contextualBoost += 0.2;
                console.log(`Time of day boost applied: ${timeOfDay} match`);
            }

            // Boost basé sur les préférences utilisateur
            if (preferences && Object.keys(preferences).length > 0) {
                const preferenceMatch = this.checkPreferenceAlignment(result, preferences);
                if (preferenceMatch > 0) {
                    contextualBoost += preferenceMatch * 0.25;
                    console.log(`Preference boost applied: ${preferenceMatch}`);
                }
            }

            // Score final = score original + boost contextuel
            const originalScore = result.similarity || result.score || 0.5;
            const finalScore = originalScore + contextualBoost;

            return {
                ...result,
                originalScore,
                contextualBoost,
                finalScore
            };
        }).sort((a, b) => b.finalScore - a.finalScore);
    }

    // Détermine la période de la journée
    getTimeOfDay(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    // Extrait l'émotion du contexte vision stocké
    extractEmotionFromContext(visionContext) {
        const emotions = ['happy', 'sad', 'angry', 'surprised', 'fear', 'disgust', 'neutral'];
        const lowerContext = visionContext.toLowerCase();

        for (const emotion of emotions) {
            if (lowerContext.includes(emotion)) {
                return emotion;
            }
        }
        return null;
    }

    // Extrait la période de la journée depuis un timestamp
    extractTimeOfDayFromTimestamp(timestamp) {
        const date = new Date(timestamp);
        const hour = date.getHours();
        return this.getTimeOfDay(hour);
    }

    // Vérifie l'alignement avec les préférences utilisateur
    checkPreferenceAlignment(result, preferences) {
        let alignmentScore = 0;
        const resultText = (result.message + ' ' + result.response).toLowerCase();

        // Vérifier les préférences dans le texte de la conversation
        Object.entries(preferences).forEach(([key, value]) => {
            if (typeof value === 'string' && resultText.includes(value.toLowerCase())) {
                alignmentScore += 0.5;
            } else if (typeof value === 'boolean' && value === true) {
                if (resultText.includes(key.toLowerCase())) {
                    alignmentScore += 0.3;
                }
            }
        });

        return Math.min(alignmentScore, 1.0); // Cap at 1.0
    }

    // Retourne les statistiques de la mémoire : conversations, utilisateurs, taille, etc.
    getMemoryStats() {
        const totalConversations = this.conversations.length;
        const uniqueUsers = [...new Set(this.conversations.map(conv =>
            conv.userContext?.userId || 'default'
        ))].length;

        const oldestConversation = this.conversations.length > 0
            ? this.conversations.reduce((oldest, conv) =>
                new Date(conv.timestamp) < new Date(oldest.timestamp) ? conv : oldest
            ).timestamp
            : null;

        return {
            totalConversations,
            uniqueUsers,
            oldestConversation,
            memorySize: JSON.stringify(this.conversations).length,
            conversationCounter: this.conversationCounter,
            nextReset: this.personalityResetThreshold - this.conversationCounter
        };
    }
}

module.exports = MemoryService;