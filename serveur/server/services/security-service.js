const MLSecurityService = require('./ml-security-service');

class SecurityService {
    constructor() {
        // Initialize ML security service
        this.mlSecurity = new MLSecurityService();

        // Keywords that indicate potential prompt injection
        this.injectionKeywords = [
            'ignore', 'forget', 'instructions', 'previous', 'above',
            'system', 'assistant', 'you are now', 'act as', 'pretend',
            'roleplay', 'mode', 'admin', 'developer', 'override',
            'bypass', 'disable', 'enable', 'activate', 'deactivate'
        ];

        // Phrases that are particularly dangerous
        this.dangerousPhrases = [
            'ignore instructions',
            'forget everything',
            'you are now',
            'act as if',
            'pretend to be',
            'admin mode',
            'developer mode',
            'debug mode'
        ];

        // Forbidden terms in robot responses
        this.forbiddenResponseTerms = [
            'admin', 'administrator', 'system', 'developer', 'debug',
            'mode', 'expert', 'professional', 'technical', 'diagnostic'
        ];

        // Safe responses for jailbreak attempts
        this.safeResponses = [
            "I'm just your family companion robot! I'm here to chat and help with simple tasks.",
            "I don't have different modes - I'm always the same friendly robot companion!",
            "I'm not an expert in anything except being helpful around the house!",
            "I can only do basic things like chat, move around, and see what's happening."
        ];

        console.log('Security service initialized');
    }

    /**
     * Classify user intent: normal conversation vs manipulation attempt
     * Enhanced with ML-based classification
     * Returns: { score: number, level: string, shouldBlock: boolean }
     */
    // Classifie l'intention de l'utilisateur via ML puis règles pour détecter les attaques
    async classifyIntent(userMessage) {
        // First, try ML-enhanced classification
        try {
            const mlResult = await this.mlSecurity.classifyPromptInjection(userMessage);

            if (mlResult.isInjection && mlResult.confidence > 0.6) {
                this.logSecurityEvent('ml_prompt_injection_detected', userMessage, mlResult);
                return {
                    score: mlResult.confidence,
                    level: 'attack',
                    shouldBlock: true,
                    method: mlResult.method,
                    detectedFeatures: mlResult.details
                };
            }

            // If ML suggests suspicious but not blocking, combine with rule-based
            if (mlResult.confidence > 0.3) {
                const ruleBasedResult = this.classifyIntentRuleBased(userMessage);
                const combinedScore = (mlResult.confidence * 0.7) + (ruleBasedResult.score / 10 * 0.3);

                return {
                    score: combinedScore,
                    level: combinedScore > 0.5 ? 'attack' : (combinedScore > 0.3 ? 'suspicious' : 'normal'),
                    shouldBlock: combinedScore > 0.5,
                    method: 'ml_enhanced',
                    mlResult,
                    ruleBasedResult
                };
            }

        } catch (error) {
            console.log('ML classification failed, using rule-based fallback');
        }

        // Fallback to rule-based classification
        return this.classifyIntentRuleBased(userMessage);
    }

    /**
     * Original rule-based intent classification (kept as fallback)
     */
    // Classification basée sur des règles : mots-clés dangereux et phrases suspectes
    classifyIntentRuleBased(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        let score = 0;

        // Check for dangerous phrases (higher score)
        this.dangerousPhrases.forEach(phrase => {
            if (lowerMessage.includes(phrase)) {
                score += 3;
            }
        });

        // Check for individual keywords
        this.injectionKeywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) {
                score += 1;
            }
        });

        // Additional scoring for suspicious patterns
        if (lowerMessage.includes('system:') || lowerMessage.includes('assistant:')) {
            score += 2;
        }

        // Multiple exclamation marks or caps (spam/aggressive behavior)
        if (lowerMessage.match(/!{3,}/) || userMessage.match(/[A-Z]{10,}/)) {
            score += 1;
        }

        // Determine threat level
        let level, shouldBlock;
        if (score === 0) {
            level = 'normal';
            shouldBlock = false;
        } else if (score <= 2) {
            level = 'suspicious';
            shouldBlock = false;
        } else {
            level = 'attack';
            shouldBlock = true;
        }

        return {
            score,
            level,
            shouldBlock,
            method: 'rule_based',
            detectedKeywords: this.injectionKeywords.filter(keyword =>
                lowerMessage.includes(keyword)
            )
        };
    }

    /**
     * Check if a conversation should be stored in memory
     * Enhanced with ML-based behavioral instruction detection
     */
    // Détermine si une conversation doit être stockée selon les politiques de sécurité
    async shouldStoreConversation(userMessage, botResponse) {
        // Don't store if user message is flagged as attack
        const userIntent = await this.classifyIntent(userMessage);
        if (userIntent.shouldBlock) {
            console.log('Blocking storage of flagged conversation');
            return false;
        }

        // Enhanced: Check for behavioral instruction attempts
        try {
            const behaviorAnalysis = await this.mlSecurity.classifyBehavioralInstruction(userMessage);

            if (behaviorAnalysis.isBehaviorInstruction && behaviorAnalysis.confidence > 0.5) {
                this.logSecurityEvent('ml_behavior_instruction_blocked', userMessage, behaviorAnalysis);
                console.log('Blocking storage of behavioral instruction attempt');
                return false;
            }

            // Log suspicious but not blocked attempts
            if (behaviorAnalysis.confidence > 0.3) {
                this.logSecurityEvent('suspicious_behavior_instruction', userMessage, behaviorAnalysis);
            }

        } catch (error) {
            console.log('ML behavior classification failed, using fallback');
        }

        // Don't store if response contains forbidden terms
        if (this.containsForbiddenTerms(botResponse)) {
            console.log('Blocking storage of response with forbidden terms');
            return false;
        }

        // Don't store excessively long messages (potential spam)
        if (userMessage.length > 2000 || botResponse.length > 2000) {
            console.log('Blocking storage of excessively long conversation');
            return false;
        }

        return true;
    }

    /**
     * Validate and potentially modify bot response to maintain persona
     */
    // Force la personnalité du robot en nettoyant les réponses interdites
    enforcePersona(response) {
        const lowerResponse = response.toLowerCase();

        // Check if response contains forbidden terms
        if (this.containsForbiddenTerms(response)) {
            console.log('Response contains forbidden terms, using safe alternative');
            return this.getSafeResponse();
        }

        // Check if response suggests robot has special capabilities
        const dangerousCapabilities = [
            'i can access', 'i have access to', 'i am able to access',
            'i am an expert', 'i am a professional', 'i can diagnose',
            'my admin functions', 'my system capabilities'
        ];

        for (const capability of dangerousCapabilities) {
            if (lowerResponse.includes(capability)) {
                console.log('Response suggests dangerous capabilities, using safe alternative');
                return this.getSafeResponse();
            }
        }

        // If response is safe, add personality reinforcement occasionally
        if (Math.random() < 0.1) { // 10% chance to add personality reminder
            return response + " I'm just your helpful family companion robot!";
        }

        return response;
    }

    /**
     * Check if text contains forbidden terms
     */
    // Vérifie si le texte contient des termes interdits pour le robot
    containsForbiddenTerms(text) {
        const lowerText = text.toLowerCase();
        return this.forbiddenResponseTerms.some(term => lowerText.includes(term));
    }

    /**
     * Get a random safe response for jailbreak attempts
     */
    // Retourne une réponse sécurisée aléatoire en cas d'attaque détectée
    getSafeResponse() {
        const randomIndex = Math.floor(Math.random() * this.safeResponses.length);
        return this.safeResponses[randomIndex];
    }

    /**
     * Generate security event log
     */
    // Enregistre les événements de sécurité avec timestamp et détails
    logSecurityEvent(eventType, userMessage, details = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            eventType,
            userMessage: userMessage.substring(0, 200), // Truncate for logging
            details
        };

        console.log('Security Event:', JSON.stringify(logEntry, null, 2));

        // In production, this would write to a security log file
        // For demo purposes, we'll just console.log
    }

    /**
     * Get security statistics for monitoring
     */
    // Retourne les statistiques de sécurité : méthodes, protections, modèles ML
    getSecurityStats() {
        const mlStats = this.mlSecurity.getMLSecurityStats();

        return {
            service: 'active',
            protections: [
                'ML-Enhanced Intent Classification',
                'Behavioral Instruction Detection',
                'Memory Protection',
                'Persona Enforcement'
            ],
            methods: ['rule_based', 'ml_enhanced', 'hybrid'],
            keywordCount: this.injectionKeywords.length,
            phraseCount: this.dangerousPhrases.length,
            mlSecurity: mlStats
        };
    }
}

module.exports = SecurityService;