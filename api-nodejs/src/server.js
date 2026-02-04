/**
 * AI Agent Backend API
 * 
 * Express.js service that handles LLM calls for the financial simulation AI agent.
 * Keeps OpenAI API key secure on the backend.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { AIAgent, ScenarioAction } from './aiAgent.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 
    "http://localhost:5001,http://localhost:5173,http://localhost:5005,https://localhost:3000")
    .split(',');

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// In-memory session storage (for demo - use Redis/DB in production)
const sessions = {};

// AI Agent instance (lazily initialized)
let aiAgent = null;

/**
 * Initialize AI Agent
 */
function getAIAgent() {
    if (aiAgent) {
        return aiAgent;
    }
    
    // Check for Azure or Standard OpenAI
    const azureKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    
    const standardKey = process.env.OPENAI_API_KEY;
    
    if (azureKey && azureEndpoint) {
        console.log(`[INIT] Configuring Azure OpenAI (Deployment: ${azureDeployment})`);
        aiAgent = new AIAgent(
            azureKey,
            azureDeployment || "gpt-4o-mini",
            azureEndpoint,
            azureVersion
        );
    } else if (standardKey) {
        console.log("[INIT] Configuring Standard OpenAI");
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
        aiAgent = new AIAgent(standardKey, model);
    } else {
        throw new Error("No API Key found! Set AZURE_OPENAI_API_KEY or OPENAI_API_KEY.");
    }
    
    return aiAgent;
}

// ==========================================
// API Endpoints
// ==========================================

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
    res.json({
        service: "Financial AI Agent API",
        status: "running",
        version: "1.0.0"
    });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
    res.json({
        status: "healthy",
        api_key_configured: Boolean(apiKey)
    });
});

/**
 * Chat endpoint for AI assistant
 * Now accepts simulation context for context-aware responses
 */
app.post('/api/chat', async (req, res) => {
    try {
        // Extract request data
        const { message: userMessage, sessionId: requestSessionId, context = {}, mode = "goals" } = req.body;
        const sessionId = requestSessionId || uuidv4();
        
        // Log context for debugging
        if (context && Object.keys(context).length > 0) {
            console.log(`[CONTEXT] Profile: ${context.profile?.name || 'Unknown'}`);
            console.log(`[CONTEXT] Active scenarios: ${(context.activeScenarios || []).length}`);
        }
        
        // Get AI agent
        const agent = getAIAgent();
        
        // Process message with context
        const responseObj = await agent.processUserInput(
            userMessage,
            sessionId,
            context,
            mode
        );
        
        // Build response
        const chatResponse = {
            message: responseObj.message,
            sessionId: sessionId,
            profileExtracted: responseObj.profileExtracted || null,
            profileComplete: responseObj.profileComplete || false,
            confidence: responseObj.confidence || 0.0,
            missingFields: responseObj.missingProfileFields || [],
            intent: responseObj.intent || null,
            params: responseObj.params || null,
            customScenario: responseObj.customScenario || null,
            action: responseObj.action || null,
            guidance: null
        };
        
        // Debug: Log what we're returning
        console.log(`[API RESPONSE] Returning action: ${responseObj.action ? JSON.stringify(responseObj.action) : 'NO ACTION'}`);
        
        res.json(chatResponse);
        
    } catch (error) {
        console.error('[ERROR]', error);
        res.status(500).json({
            error: `Chat processing failed: ${error.message}`
        });
    }
});

/**
 * Clear a conversation session
 */
app.delete('/api/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    if (sessions[sessionId]) {
        delete sessions[sessionId];
        return res.json({ status: "cleared", sessionId });
    }
    
    res.json({ status: "not_found", sessionId });
});

// ==========================================
// Start Server
// ==========================================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Financial AI Agent API running on http://0.0.0.0:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
});

export default app;
