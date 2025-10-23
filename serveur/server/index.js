const express = require('express');
const localtunnel = require('localtunnel');
const bodyParser = require('body-parser');
require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const server = require('http').Server(app);
const ioServer = require('socket.io')(server, { cors: { origin: "*" } });
const clientSocket = require('./socket/serverToRasp');

// Import new services
const MemoryService = require('./services/memory-service');
const VisionService = require('./services/vision-service');
const LLMService = require('./services/llm-service');
const PreferencesService = require('./services/preferences-service');
const SecurityService = require('./services/security-service');

// Initialize services
const memoryService = new MemoryService();
const visionService = new VisionService();
const llmService = new LLMService();
const preferencesService = new PreferencesService();
const securityService = new SecurityService();

// Auto-migrate to RAG on startup (only once)
(async () => {
    try {
        const migrated = await memoryService.migrateToRAG();
        if (migrated > 0) {
            console.log(`RAG Migration: Migrated ${migrated} conversations to vector database`);
        }
    } catch (error) {
        console.error('RAG migration failed:', error);
    }
})();

const PORT = process.env.PORT;
const RASP_URL = process.env.RASP_URL;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Robot state
const robotState = {
    detectionFlag: false,
    isAutopilot: false,
    lastImagePath: './image.jpg',
    currentUser: null
};

// Utility functions
// Génère un code aléatoire alphanumerique pour l'authentification
function generateRandomCode(length = 10) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

// Nettoie et sécurise les entrées utilisateur en limitant la longueur
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, 1000); // Limit length
}

// Gestionnaire d'erreurs centralisé qui log et retourne une réponse HTTP d'erreur
async function handleError(error, res, message = 'An error occurred') {
    console.error(`Error: ${message}`, error);
    if (res && !res.headersSent) {
        res.status(500).json({ error: message, details: error.message });
    }
}
// Pipeline principal de chat : sécurité + RAG + LLM + sauvegarde mémoire
async function generateEnhancedResponse(message, userContext = {}) {
    try {
        // Sanitize input
        const sanitizedMessage = sanitizeInput(message);

        // SECURITY CHECK 1: ML-Enhanced Intent Classification
        const intentAnalysis = await securityService.classifyIntent(sanitizedMessage);

        // Block obvious attacks
        if (intentAnalysis.shouldBlock) {
            securityService.logSecurityEvent('prompt_injection_blocked', sanitizedMessage, intentAnalysis);
            return {
                content: securityService.getSafeResponse(),
                securityBlocked: true
            };
        }

        // Log suspicious but not blocked messages
        if (intentAnalysis.level === 'suspicious') {
            securityService.logSecurityEvent('suspicious_message', sanitizedMessage, intentAnalysis);
        }

        // Get user preferences
        const userPreferences = await preferencesService.getUserPreferences(userContext.userId || 'default');

        // Check if message requires vision analysis
        const visionCommands = ['what do you see', 'analyze scene', 'who is this', 'count people', 'describe'];
        const requiresVision = visionCommands.some(cmd => sanitizedMessage.toLowerCase().includes(cmd));

        let visionContext = '';
        let emotionContext = null;

        if (requiresVision) {
            visionContext = await visionService.analyzeCurrentScene();
        }

        // EMOTION DETECTION: Get current facial emotion
        try {
            const faceAnalysis = await visionService.recognizeFaces();
            if (faceAnalysis.emotions && faceAnalysis.emotions.length > 0) {
                // Get the first detected emotion (could be enhanced to handle multiple people)
                emotionContext = faceAnalysis.emotions[0].emotion;
            }
        } catch (error) {
            console.log('Emotion detection unavailable, continuing without emotion context');
        }

        // Get conversation context from memory with multimodal re-ranking
        const conversationContext = await memoryService.getRelevantContext(
            sanitizedMessage,
            userContext,
            5, // maxResults
            emotionContext,
            userPreferences
        );

        // Build enhanced prompt with context
        const enhancedPrompt = buildContextualPrompt(sanitizedMessage, conversationContext, userPreferences, visionContext, emotionContext);

        // Generate response using free LLM
        const response = await llmService.generateResponse(enhancedPrompt);

        // SECURITY CHECK 2: Response Validation & Persona Enforcement
        const secureResponse = securityService.enforcePersona(response.content);

        // SECURITY CHECK 3: Memory Protection
        // Store conversation in memory with security filtering and multimodal context
        await memoryService.storeConversation({
            message: sanitizedMessage,
            response: secureResponse,
            timestamp: new Date().toISOString(),
            userContext,
            visionContext: visionContext + (emotionContext ? ` emotion:${emotionContext}` : ''),
            emotionContext,
            preferences: userPreferences
        }, securityService);

        // Extract and store preferences
        await preferencesService.extractAndStorePreferences(sanitizedMessage, secureResponse, userContext.userId || 'default');

        return { content: secureResponse };
    } catch (error) {
        console.error('Error generating enhanced response:', error);
        return { content: "I'm sorry, I encountered an error processing your message." };
    }
}

// Construit un prompt enrichi avec contexte, préférences utilisateur et données vision/émotion
function buildContextualPrompt(message, context, preferences, visionContext, emotionContext) {
    let prompt = `You are DynAmi, an AI companion robot. You can see, move, and interact with people.\n\n`;

    if (visionContext) {
        prompt += `Current visual context: ${visionContext}\n\n`;
    }

    // EMOTION-AWARE PROMPTING
    if (emotionContext) {
        const emotionResponses = {
            'happy': 'upbeat and enthusiastic',
            'sad': 'gentle and comforting',
            'angry': 'calm and soothing',
            'surprised': 'explanatory and reassuring',
            'fear': 'reassuring and supportive',
            'disgust': 'understanding and patient',
            'neutral': 'friendly and helpful'
        };

        const responseStyle = emotionResponses[emotionContext.toLowerCase()] || 'friendly and helpful';
        prompt += `The user appears to be feeling ${emotionContext}. Please respond in a ${responseStyle} manner while maintaining your robot companion personality.\n\n`;
    }

    if (context && context.length > 0) {
        prompt += `Recent conversation context:\n${context.slice(-3).map(c => `- ${c.message} -> ${c.response}`).join('\n')}\n\n`;
    }

    if (preferences && Object.keys(preferences).length > 0) {
        prompt += `User preferences: ${JSON.stringify(preferences)}\n\n`;
    }

    prompt += `User message: ${message}\n\nRespond naturally and helpfully. If asked about what you see, describe the visual context. If asked to remember someone, confirm you'll remember them.`;

    return prompt;
}
// Lance l'analyse de vision automatique en mode autopilot
async function detectionCallback() {
    console.log('Running enhanced detection');
    try {
        const result = await visionService.analyzeCurrentScene();
        console.log('Detection result:', result);
        robotState.detectionFlag = false;
        return result;
    } catch (error) {
        console.error('Detection error:', error);
        robotState.detectionFlag = false;
        return null;
    }
}
// Boucle autopilot qui sauvegarde les images reçues et lance la détection
async function autopilotLoop(stream) {
    if (robotState.isAutopilot && !robotState.detectionFlag) {
        robotState.detectionFlag = true;
        try {
            const bytes = new Uint8Array(stream);
            const dataBuffer = Buffer.from(bytes.buffer);

            await fs.writeFile(robotState.lastImagePath, dataBuffer);
            console.log('Image saved for analysis');

            await detectionCallback();
        } catch (error) {
            console.error('Autopilot error:', error);
            robotState.detectionFlag = false;
        }
    }
}


app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html'});
    res.end('Server OK');
});
app.get('/raspberry', async (req, res) => {
    const result = await fetch(RASP_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if(result.ok){
        res.writeHead(200, { 'Content-Type': 'text/html'});
        res.end('Online');
    } else {
        res.writeHead(500, { 'Content-Type': 'text/html'});
        res.end('Offline');
    }
});
app.get('/test', async (req, res) => {
    const result = await fetch(RASP_URL+"/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "avance" }),
    });
    res.send(result.ok);
});

app.post('/api/honk', async (req, res) => {
    const args = req.body;
    console.log(args.honk);
    await fetch(RASP_URL+"/honk");
    res.writeHead(200, { 'Content-Type': 'text/html'});
    res.end('Online');
});
app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const userContext = { userId: userId || 'default', timestamp: new Date().toISOString() };

        // Generate enhanced response with RAG
        const result = await generateEnhancedResponse(message, userContext);

        // Generate speech
        try {
            await generateSpeech(result.content);
        } catch (speechError) {
            console.error('Speech generation error:', speechError);
        }

        res.json({
            response: result.content,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        await handleError(error, res, 'Failed to process chat message');
    }
});

// Convertit le texte en audio via script Python TTS et l'envoie au Raspberry Pi
async function generateSpeech(text) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', ['./scripts/tts.py', text]);

        pythonProcess.stdout.on('data', async () => {
            try {
                const audioData = await fs.readFile('output.mp3');
                const base64Data = audioData.toString('base64');

                await axios.post(`${RASP_URL}/infer`, {
                    audioData: base64Data
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });

                resolve();
            } catch (error) {
                console.error('Audio processing error:', error);
                resolve(); // Don't fail the whole request for audio issues
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error('TTS error:', data.toString());
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`TTS process exited with code ${code}`));
            }
        });
    });
}
app.post('/api/move', async (req, res) => {
    const args = req.body;
    console.log(args);
    
    const result = await fetch(RASP_URL+"/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: args.direction }),
    });
    
    res.send(result.ok);
});
app.post('/api/autopilot', async (req, res) => {
    try {
        const { autoPilot } = req.body;
        robotState.isAutopilot = Boolean(autoPilot);

        console.log(`Autopilot ${robotState.isAutopilot ? 'enabled' : 'disabled'}`);

        res.json({
            autopilot: robotState.isAutopilot,
            status: 'success'
        });
    } catch (error) {
        await handleError(error, res, 'Failed to toggle autopilot');
    }
});
app.get("/image", (req, res) => {
    res.sendFile(path.join(__dirname, 'image.html'));
});

// New API endpoints for enhanced functionality

// Vision analysis endpoint
app.post('/api/analyze-scene', async (req, res) => {
    try {
        const analysis = await visionService.analyzeCurrentScene();
        res.json({
            success: true,
            analysis,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        await handleError(error, res, 'Failed to analyze scene');
    }
});

// Face learning endpoint
app.post('/api/learn-face', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = await visionService.learnFace(name);
        res.json({
            success: true,
            message: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        await handleError(error, res, 'Failed to learn face');
    }
});

// Memory endpoints
app.get('/api/memory/history', async (req, res) => {
    try {
        const { userId, limit } = req.query;
        const history = await memoryService.getConversationHistory(
            { userId: userId || 'default' },
            parseInt(limit) || 20
        );

        res.json({
            success: true,
            history,
            count: history.length
        });
    } catch (error) {
        await handleError(error, res, 'Failed to get conversation history');
    }
});

app.post('/api/memory/search', async (req, res) => {
    try {
        const { query, userId } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const results = await memoryService.searchConversations(
            query,
            { userId: userId || 'default' }
        );

        res.json({
            success: true,
            results,
            count: results.length
        });
    } catch (error) {
        await handleError(error, res, 'Failed to search conversations');
    }
});

// Preferences endpoints
app.get('/api/preferences/:userId?', async (req, res) => {
    try {
        const userId = req.params.userId || 'default';
        const preferences = await preferencesService.getUserPreferences(userId);

        res.json({
            success: true,
            preferences,
            userId
        });
    } catch (error) {
        await handleError(error, res, 'Failed to get preferences');
    }
});

app.post('/api/preferences', async (req, res) => {
    try {
        const { userId, type, value, confidence } = req.body;

        if (!type || !value) {
            return res.status(400).json({ error: 'Type and value are required' });
        }

        const success = await preferencesService.updatePreference(
            userId || 'default',
            type,
            value,
            confidence || 0.8
        );

        res.json({
            success,
            message: success ? 'Preference updated' : 'Failed to update preference'
        });
    } catch (error) {
        await handleError(error, res, 'Failed to update preference');
    }
});

// System status endpoint
app.get('/api/status', async (req, res) => {
    try {
        const memoryStats = memoryService.getMemoryStats();
        const preferencesStats = preferencesService.getPreferencesStats();
        const visionStats = visionService.getVisionStats();
        const securityStats = securityService.getSecurityStats();

        res.json({
            success: true,
            system: {
                online: true,
                timestamp: new Date().toISOString(),
                autopilot: robotState.isAutopilot,
                ragEnabled: true,
                securityEnabled: true
            },
            memory: memoryStats,
            preferences: preferencesStats,
            vision: visionStats,
            security: securityStats
        });
    } catch (error) {
        await handleError(error, res, 'Failed to get system status');
    }
});

// RAG migration endpoint
app.post('/api/migrate-rag', async (req, res) => {
    try {
        console.log('Manual RAG migration requested...');
        const migrated = await memoryService.migrateToRAG();

        res.json({
            success: true,
            migrated,
            message: `Successfully migrated ${migrated} conversations to RAG vector database`
        });
    } catch (error) {
        await handleError(error, res, 'Failed to migrate to RAG');
    }
});


// Enhanced socket handling
const cameraNamespace = ioServer.of('/cam');
cameraNamespace.on('connection', (socket) => {
    console.log('Application connected to camera stream');
    robotState.detectionFlag = false;

    clientSocket.on('data', async (stream) => {
        socket.emit('data', stream);
        await autopilotLoop(stream);
    });

    socket.on('disconnect', () => {
        console.log('Application disconnected from camera stream');
        robotState.detectionFlag = true;
    });

    socket.on('analyze_scene', async (callback) => {
        try {
            const analysis = await visionService.analyzeCurrentScene();
            callback({ success: true, analysis });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
(async () => {
    const tunnel = await localtunnel({ port: PORT, subdomain: "dynami-api" });
    const password = await fetch("https://ipv4.icanhazip.com").then(data => data.text());
    console.log(`Tunnel URL: ${tunnel.url}\nTunnel password: ${password}`);
    tunnel.on('close', () => { console.log("Tunnel closed.") });
})();
