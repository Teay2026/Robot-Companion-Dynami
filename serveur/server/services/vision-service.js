const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class VisionService {
    constructor() {
        this.scriptsDir = path.join(__dirname, '../scripts');
        this.dataDir = path.join(__dirname, '../data');
        this.facesFile = path.join(this.dataDir, 'faces.json');
        this.currentImagePath = './image.jpg';
        this.knownFaces = {};

        this.initializeFaceMemory();
    }

    async initializeFaceMemory() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });

            try {
                const data = await fs.readFile(this.facesFile, 'utf8');
                this.knownFaces = JSON.parse(data);
            } catch (error) {
                this.knownFaces = {};
                await this.saveFaceMemory();
            }

            console.log(`Vision service initialized with ${Object.keys(this.knownFaces).length} known faces`);
        } catch (error) {
            console.error('Error initializing vision service:', error);
            this.knownFaces = {};
        }
    }

    async analyzeCurrentScene() {
        try {
            // Run enhanced object detection
            const detectionResult = await this.runEnhancedDetection();

            // Get scene description
            const sceneDescription = await this.generateSceneDescription(detectionResult);

            // Check for known faces
            const faceRecognitionResult = await this.recognizeFaces();

            // Combine results
            const analysis = {
                timestamp: new Date().toISOString(),
                objects: detectionResult.objects || [],
                peopleCount: detectionResult.peopleCount || 0,
                knownPeople: faceRecognitionResult.knownPeople || [],
                unknownPeople: faceRecognitionResult.unknownPeople || 0,
                description: sceneDescription,
                emotions: faceRecognitionResult.emotions || []
            };

            return this.formatAnalysisForChat(analysis);
        } catch (error) {
            console.error('Scene analysis error:', error);
            return "I'm having trouble analyzing the scene right now.";
        }
    }

    async runEnhancedDetection() {
        return new Promise((resolve, reject) => {
            // Use the existing detect.py but enhance it
            const pythonProcess = spawn('python3', [
                path.join(this.scriptsDir, 'enhanced_detect.py'),
                this.currentImagePath
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
                        const result = JSON.parse(output);
                        resolve(result);
                    } catch (parseError) {
                        // Fallback to simple detection
                        this.runSimpleDetection()
                            .then(resolve)
                            .catch(reject);
                    }
                } else {
                    console.error('Enhanced detection failed:', errorOutput);
                    // Fallback to simple detection
                    this.runSimpleDetection()
                        .then(resolve)
                        .catch(reject);
                }
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('Detection timeout'));
            }, 10000);
        });
    }

    async runSimpleDetection() {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python3', [
                path.join(this.scriptsDir, 'detect.py'),
                this.currentImagePath
            ]);

            let output = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve({
                            objects: ['person'],
                            peopleCount: 1,
                            angle: result.angle,
                            instruction: result.instruction
                        });
                    } catch (parseError) {
                        resolve({
                            objects: [],
                            peopleCount: 0,
                            angle: 0,
                            instruction: ''
                        });
                    }
                } else {
                    reject(new Error('Simple detection failed'));
                }
            });
        });
    }

    async recognizeFaces() {
        return new Promise((resolve) => {
            // Run face recognition script
            const pythonProcess = spawn('python3', [
                path.join(this.scriptsDir, 'face_recognition.py'),
                this.currentImagePath
            ]);

            let output = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve(result);
                    } catch (parseError) {
                        resolve({
                            knownPeople: [],
                            unknownPeople: 0,
                            emotions: []
                        });
                    }
                } else {
                    resolve({
                        knownPeople: [],
                        unknownPeople: 0,
                        emotions: []
                    });
                }
            });
        });
    }

    async learnFace(name, imageData = null) {
        try {
            const imagePath = imageData || this.currentImagePath;

            // Run face learning script
            const result = await new Promise((resolve, reject) => {
                const pythonProcess = spawn('python3', [
                    path.join(this.scriptsDir, 'learn_face.py'),
                    imagePath,
                    name
                ]);

                let output = '';

                pythonProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                pythonProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve(JSON.parse(output));
                    } else {
                        reject(new Error('Face learning failed'));
                    }
                });
            });

            if (result.success) {
                this.knownFaces[name] = {
                    name,
                    learnedAt: new Date().toISOString(),
                    encoding: result.encoding
                };

                await this.saveFaceMemory();
                return `I've learned to recognize ${name}!`;
            } else {
                return "I couldn't detect a clear face to learn. Please make sure a face is visible in the camera.";
            }
        } catch (error) {
            console.error('Face learning error:', error);
            return "I had trouble learning that face. Please try again.";
        }
    }

    async generateSceneDescription(detectionResult) {
        const { objects = [], peopleCount = 0 } = detectionResult;

        if (objects.length === 0 && peopleCount === 0) {
            return "I don't see anything specific in the scene right now.";
        }

        let description = "I can see ";

        if (peopleCount > 0) {
            description += `${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}`;
        }

        if (objects.length > 0) {
            const uniqueObjects = [...new Set(objects.filter(obj => obj !== 'person'))];
            if (uniqueObjects.length > 0) {
                if (peopleCount > 0) description += " and ";
                description += uniqueObjects.join(', ');
            }
        }

        description += " in the scene.";

        return description;
    }

    formatAnalysisForChat(analysis) {
        let response = analysis.description;

        if (analysis.knownPeople.length > 0) {
            response += ` I recognize ${analysis.knownPeople.join(' and ')}.`;
        }

        if (analysis.unknownPeople > 0) {
            response += ` I also see ${analysis.unknownPeople} ${analysis.unknownPeople === 1 ? 'person' : 'people'} I don't recognize.`;
        }

        if (analysis.emotions.length > 0) {
            const emotionText = analysis.emotions.map(e => `${e.person}: ${e.emotion}`).join(', ');
            response += ` I can detect these emotions: ${emotionText}.`;
        }

        return response;
    }

    async saveFaceMemory() {
        try {
            await fs.writeFile(
                this.facesFile,
                JSON.stringify(this.knownFaces, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('Error saving face memory:', error);
        }
    }

    getKnownFaces() {
        return Object.keys(this.knownFaces);
    }

    async forgetFace(name) {
        if (this.knownFaces[name]) {
            delete this.knownFaces[name];
            await this.saveFaceMemory();
            return `I've forgotten ${name}.`;
        }
        return `I don't know anyone named ${name}.`;
    }

    getVisionStats() {
        return {
            knownFaces: Object.keys(this.knownFaces).length,
            lastAnalysis: new Date().toISOString()
        };
    }
}

module.exports = VisionService;