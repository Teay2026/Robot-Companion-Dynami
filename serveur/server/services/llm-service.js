const axios = require('axios');

class LLMService {
    constructor() {
        // Using Hugging Face Inference API as free alternative
        this.apiUrl = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large';
        this.apiKey = process.env.HUGGINGFACE_API_KEY; // Free tier available

        // Fallback to local model or other free services
        this.fallbackUrls = [
            'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill',
            'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium'
        ];
    }

    async generateResponse(prompt) {
        try {
            // Try primary model first
            const response = await this.callHuggingFace(this.apiUrl, prompt);
            if (response) {
                return { content: response };
            }

            // Try fallback models
            for (const fallbackUrl of this.fallbackUrls) {
                try {
                    const fallbackResponse = await this.callHuggingFace(fallbackUrl, prompt);
                    if (fallbackResponse) {
                        return { content: fallbackResponse };
                    }
                } catch (error) {
                    console.warn(`Fallback model failed: ${fallbackUrl}`, error.message);
                }
            }

            // If all AI models fail, provide rule-based responses
            return this.generateFallbackResponse(prompt);

        } catch (error) {
            console.error('LLM service error:', error);
            return this.generateFallbackResponse(prompt);
        }
    }

    async callHuggingFace(url, prompt) {
        try {
            const headers = {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            };

            // If no API key, try without auth (rate limited but works)
            if (!this.apiKey) {
                delete headers.Authorization;
            }

            const response = await axios.post(url, {
                inputs: prompt,
                parameters: {
                    max_length: 150,
                    temperature: 0.7,
                    do_sample: true,
                    pad_token_id: 50256
                }
            }, {
                headers,
                timeout: 10000 // 10 second timeout
            });

            if (response.data && response.data[0] && response.data[0].generated_text) {
                return this.cleanResponse(response.data[0].generated_text, prompt);
            }

            return null;
        } catch (error) {
            if (error.response?.status === 503) {
                console.warn('Model is loading, retrying in 20 seconds...');
                await this.sleep(20000);
                return this.callHuggingFace(url, prompt);
            }
            throw error;
        }
    }

    cleanResponse(response, originalPrompt) {
        // Remove the original prompt from response if it's included
        let cleaned = response.replace(originalPrompt, '').trim();

        // Remove common artifacts
        cleaned = cleaned.replace(/^User:.*$/gm, '');
        cleaned = cleaned.replace(/^Bot:.*$/gm, '');
        cleaned = cleaned.replace(/^\s*[-:>]\s*/gm, '');

        // Take first meaningful response
        const lines = cleaned.split('\n').filter(line => line.trim().length > 0);
        return lines[0] || cleaned || "I understand.";
    }

    generateFallbackResponse(prompt) {
        const lowerPrompt = prompt.toLowerCase();

        // Vision-related responses
        if (lowerPrompt.includes('what do you see') || lowerPrompt.includes('analyze scene')) {
            return { content: "I can see the scene through my camera. Let me analyze what's in front of me." };
        }

        if (lowerPrompt.includes('who is this') || lowerPrompt.includes('recognize')) {
            return { content: "I can see a person, but I need to learn who they are. Please tell me their name." };
        }

        if (lowerPrompt.includes('count people')) {
            return { content: "I can detect people in my view. Let me count them for you." };
        }

        if (lowerPrompt.includes('remember') && lowerPrompt.includes('face')) {
            return { content: "I will remember this person's face. What name should I associate with them?" };
        }

        // Movement responses
        if (lowerPrompt.includes('move') || lowerPrompt.includes('go')) {
            return { content: "I can move around. Which direction would you like me to go?" };
        }

        // Emotional responses
        if (lowerPrompt.includes('how do you feel') || lowerPrompt.includes('emotion')) {
            return { content: "I can detect emotions through facial expressions. Let me analyze the current mood." };
        }

        // Greeting responses
        if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi ')) {
            return { content: "Hello! I'm DynAmi, your AI companion robot. How can I help you today?" };
        }

        // Default response
        return { content: "I'm DynAmi, your AI companion robot. I can see, move, and interact with you. How can I help?" };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = LLMService;