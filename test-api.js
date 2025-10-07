require('dotenv').config();

const geminiApiKey = process.env.GEMINI_API_KEY;

async function testGeminiAPI() {
    console.log('Testing Gemini API...');
    console.log('API Key format:', geminiApiKey ? `${geminiApiKey.substring(0, 10)}...` : 'Not found');
    
    if (!geminiApiKey) {
        console.error('❌ No API key found in .env file');
        return;
    }
    
    if (!geminiApiKey.startsWith('AIza')) {
        console.error('❌ Invalid API key format - should start with "AIza"');
        return;
    }
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: "Say hello" }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 100
                    }
                })
            }
        );
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            return;
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            console.log('✅ API test successful!');
            console.log('Response:', data.candidates[0].content.parts[0].text);
        } else {
            console.error('❌ Unexpected response format:', data);
        }
        
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

testGeminiAPI();