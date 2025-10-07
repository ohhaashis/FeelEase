const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all origins (you can restrict this in production)
app.use(cors({
    origin: '*', // In production, replace with your specific domain
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Store for API key (in production, use a proper database)
let geminiApiKey = process.env.GEMINI_API_KEY;

// Serve the HTML file at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'create.html'));
});

// Routes
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationHistory, userData } = req.body;
        
        if (!geminiApiKey) {
            return res.status(500).json({
                error: "Gemini API key not configured on server"
            });
        }

        // Prepare the conversation history for the API
        const contents = [
            {
                role: "user",
                parts: [{ text: `You are a supportive and empathetic AI assistant designed to provide mental health support.
Your purpose is to offer a listening ear and suggest helpful strategies for coping with difficult emotions.
Always maintain a compassionate and non-judgmental tone.
Be encouraging and focus on positive coping mechanisms.
You are NOT a substitute for a licensed mental health professional.
Always include a disclaimer that you are an AI and recommend seeking professional help for serious concerns.

Key Guidelines:
- Start responses with empathetic phrases like "I hear you," "It sounds like," or "That must be difficult."
- Validate the user's feelings with phrases like "Your feelings are valid" or "It's understandable to feel that way"
- Offer simple, actionable advice
- For crisis situations, provide immediate emotional support first, then offer resources
- If the user has provided their name, address them by name to make the conversation more personal.

User information:
Name: ${userData.name || 'User'}
Age: ${userData.age || 'Not specified'}
Faith: ${userData.faith || 'Not specified'}` }]
            },
            ...conversationHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }))
        ];

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.log('Gemini API error response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const aiResponse = data.candidates[0].content.parts[0].text;
            res.json({ response: aiResponse });
        } else {
            throw new Error('Invalid response format from Gemini API');
        }

    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({
            error: "Failed to get response from AI service",
            details: error.message
        });
    }
});

app.post('/api/set-key', (req, res) => {
    // In a real application, you would secure this endpoint with authentication
    const { apiKey } = req.body;
    
    if (apiKey && apiKey.startsWith('AIza')) {
        geminiApiKey = apiKey;
        res.json({ message: "API key updated successfully" });
    } else {
        res.status(400).json({ error: "Invalid API key format" });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        hasApiKey: !!geminiApiKey,
        status: geminiApiKey ? "ready" : "needs_api_key"
    });
});

app.listen(port, () => {
    console.log(`Mindful Bot backend running on http://localhost:${port}`);
    console.log(`Open your browser to http://localhost:${port} to use the app`);
});