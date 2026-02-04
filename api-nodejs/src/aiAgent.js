/**
 * AI Agent Implementation
 * 
 * Handles LLM calls for the financial simulation AI agent.
 * Supports both OpenAI and Azure OpenAI.
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSystemPrompt } from './prompts.js';
import { getMatcher } from './patternMatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Agent Response class
 */
class AgentResponse {
    constructor({
        message,
        profileExtracted = null,
        profileComplete = false,
        confidence = 0.0,
        missingProfileFields = [],
        intent = null,
        params = null,
        customScenario = null,
        action = null
    }) {
        this.message = message;
        this.profileExtracted = profileExtracted;
        this.profileComplete = profileComplete;
        this.confidence = confidence;
        this.missingProfileFields = missingProfileFields;
        this.intent = intent;
        this.params = params;
        this.customScenario = customScenario;
        this.action = action;
    }
}

/**
 * Scenario Action class
 */
class ScenarioAction {
    constructor(type, scenarioId, params = null) {
        this.type = type;
        this.scenarioId = scenarioId;
        this.params = params;
    }
}

/**
 * AI Agent class
 */
class AIAgent {
    constructor(apiKey, model = "gpt-4o-mini", azureEndpoint = null, apiVersion = "2024-02-15-preview") {
        if (azureEndpoint) {
            console.log(`[AIAgent] Using Azure OpenAI: ${azureEndpoint}`);
            this.client = new OpenAI({
                apiKey: apiKey,
                baseURL: `${azureEndpoint}/openai/deployments/${model}`,
                defaultQuery: { 'api-version': apiVersion },
                defaultHeaders: { 'api-key': apiKey }
            });
        } else {
            console.log("[AIAgent] Using Standard OpenAI");
            this.client = new OpenAI({ apiKey: apiKey });
        }
        
        this.model = model;
        this.sessions = {};
        this.sessionFile = path.join(__dirname, '../data/sessions.json');
        
        // Load persisted sessions if available
        try {
            if (fs.existsSync(this.sessionFile)) {
                const data = fs.readFileSync(this.sessionFile, 'utf-8');
                this.sessions = JSON.parse(data);
                console.log(`[AIAgent] Loaded ${Object.keys(this.sessions).length} sessions from disk`);
            }
        } catch (e) {
            console.log(`[AIAgent] Error loading sessions: ${e.message}`);
        }
        
        // Load knowledge base once at startup
        this.knowledgeBasePrompt = "";
        try {
            const scenarioPath = path.join(__dirname, '../data/scenario_patterns.json');
            const data = JSON.parse(fs.readFileSync(scenarioPath, 'utf-8'));
            const kbLines = [];
            for (const [theme, scenarios] of Object.entries(data)) {
                for (const [sid, sdata] of Object.entries(scenarios)) {
                    const params = sdata.params || [];
                    kbLines.push(`- ${sid}: ${JSON.stringify(params)}`);
                }
            }
            this.knowledgeBasePrompt = kbLines.join("\n");
        } catch (e) {
            console.log(`Error loading knowledge base: ${e.message}`);
        }

        // Load financial knowledge base
        this.financialKbPrompt = "";
        try {
            const financialPath = path.join(__dirname, '../data/financial_knowledge.json');
            const kbData = JSON.parse(fs.readFileSync(financialPath, 'utf-8'));
            const kbStr = [];
            for (const [topic, info] of Object.entries(kbData)) {
                const source = info.source ? ` (Source: ${info.source})` : "";
                kbStr.push(`${topic}: ${info.coach_tip || ''} (Fact: ${info.limit || ''} ${info.tax_relief || ''})${source}`);
            }
            this.financialKbPrompt = kbStr.join("\n");
        } catch (e) {
            console.log(`Error loading financial KB: ${e.message}`);
        }
    }

    /**
     * Process user input with simulation context awareness
     * 
     * @param {string} userInput - User's message
     * @param {string} sessionId - Session identifier
     * @param {Object} context - Simulation state (profile, scenarios, projections)
     * @param {string} mode - Conversation mode (goals, health, events)
     * @returns {Promise<AgentResponse>}
     */
    async processUserInput(userInput, sessionId = "default", context = null, mode = "goals") {
        try {
            // Get or create session history
            if (!this.sessions[sessionId]) {
                const currentDate = new Date().toISOString().split('T')[0];
                const systemPrompt = getSystemPrompt(
                    mode,
                    this.financialKbPrompt,
                    this.knowledgeBasePrompt,
                    context?.profile || {},
                    currentDate
                );
                
                this.sessions[sessionId] = [{
                    role: "system",
                    content: systemPrompt
                }];
            }
            
            // Build context-aware prompt if context provided
            let contextPrompt = "";
            if (context) {
                const profile = context.profile || {};
                const scenarios = context.activeScenarios || [];
                
                if (profile && Object.keys(profile).length > 0) {
                    contextPrompt = "\n\nCURRENT USER CONTEXT:\n";
                    if (profile.name) {
                        contextPrompt += `Name: ${profile.name}\n`;
                    }
                    if (profile.age) {
                        contextPrompt += `Age: ${profile.age}\n`;
                    }
                    if (profile.income) {
                        contextPrompt += `Annual Income: £${profile.income.toLocaleString()}\n`;
                    }
                    if (profile.savings) {
                        contextPrompt += `Current Savings: £${profile.savings.toLocaleString()}\n`;
                    }
                }
                
                // Add Solvency Metrics
                const solvency = context.solvency;
                if (solvency) {
                    const isSolvent = solvency.isSolvent !== false;
                    contextPrompt += "\nFINANCIAL HEALTH CHECK:\n";
                    if (!isSolvent) {
                        const maxDeficit = solvency.maxDeficit || 0;
                        const firstDeficit = solvency.firstDeficitDate;
                        contextPrompt += `⚠️ INSOLVENCY ALERT: User runs out of money (Deficit: £${maxDeficit.toLocaleString()}).\n`;
                        if (firstDeficit) {
                            contextPrompt += `   - Bankruptcy projected around: ${firstDeficit}\n`;
                        }
                    } else {
                        contextPrompt += "✅ Solvency Check: PASS (Plan is sustainable)\n";
                    }
                    
                    const monthlySurplus = solvency.monthlySurplus || 0;
                    contextPrompt += `   - Avg Monthly Surplus: £${monthlySurplus.toLocaleString()}\n`;
                }

                if (scenarios.length > 0) {
                    contextPrompt += `\nActive Goals (${scenarios.length}):\n`;
                    for (const s of scenarios.slice(0, 5)) { // Limit to 5 to avoid token bloat
                        contextPrompt += `- ${s.type || 'Unknown'}: ${JSON.stringify(s.params || {})}\n`;
                    }
                }
            }
            
            // Add context as system message if present
            if (contextPrompt) {
                this.sessions[sessionId].push({
                    role: "system",
                    content: contextPrompt
                });
            }
            
            // Add user message
            this.sessions[sessionId].push({
                role: "user",
                content: userInput
            });
            
            // Call OpenAI (temperature=0 for strict schema compliance)
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: this.sessions[sessionId],
                temperature: 0.0
            });
            
            let assistantMessage = response.choices[0].message.content;
            
            // Save sessions to disk
            try {
                fs.writeFileSync(this.sessionFile, JSON.stringify(this.sessions, null, 2));
            } catch (e) {
                console.log(`[AIAgent] Error saving sessions: ${e.message}`);
            }
            
            // PATTERN-BASED INTENT DETECTION
            let intentScenario = null;
            let intentParams = {};
            let customScenario = null;
            let cleanMessage = assistantMessage;
            
            // Get recent conversation history for this session
            const recentMessages = this.sessions[sessionId] || [];
            console.log(`[DEBUG] Session ${sessionId} has ${recentMessages.length} messages`);
            
            const userMessages = recentMessages
                .filter(m => m.role === "user")
                .map(m => m.content.toLowerCase());
            
            console.log(`[DEBUG] User messages: ${JSON.stringify(userMessages)}`);
            
            // Use pattern matcher for scenario detection
            const matcher = getMatcher();
            const matchResult = matcher.matchScenario(userInput, userMessages);
            
            let goalType = null;
            if (matchResult) {
                const [matchedGoalType, confidence] = matchResult;
                goalType = matchedGoalType;
                console.log(`[PATTERN MATCH] Detected scenario: ${goalType} (confidence: ${confidence.toFixed(2)})`);
            } else {
                console.log("[NO MATCH] No scenario pattern matched");
            }
            
            // Extract amount from ALL user messages (most recent first)
            let amount = null;
            if (userMessages.length > 0) {
                for (const userMsg of [...userMessages].reverse()) {
                    // Pattern 1: Millions (1m, 1.5M, £1m, £1.5 million)
                    let match = userMsg.match(/£?\s*(\d+(?:\.\d+)?)\s*m(?:illion)?/i);
                    if (match) {
                        amount = Math.floor(parseFloat(match[1]) * 1000000);
                        break;
                    }
                    
                    // Pattern 2: Thousands (300k, £300k, 300K)
                    match = userMsg.match(/£?\s*(\d+(?:\.\d+)?)\s*k/i);
                    if (match) {
                        amount = Math.floor(parseFloat(match[1]) * 1000);
                        break;
                    }
                    
                    // Pattern 3: Explicit pounds with commas (£300,000 or £1,500,000)
                    match = userMsg.match(/£\s*(\d{1,3}(?:,\d{3})+)/);
                    if (match) {
                        amount = parseInt(match[1].replace(/,/g, ''));
                        break;
                    }
                    
                    // Pattern 4: Plain numbers with context
                    match = userMsg.match(/(?:amount|target|save|need)\s+(?:of\s+)?£?\s*(\d+(?:,\d{3})*)/);
                    if (match) {
                        amount = parseInt(match[1].replace(/,/g, ''));
                        break;
                    }
                }
            }
            
            if (amount) {
                console.log(`[AMOUNT FOUND] £${amount.toLocaleString()} detected in conversation`);
            }
            
            let action = null;
            
            // Check for AI-generated tags (PRIORITY)
            const intentMatch = assistantMessage.match(/\[INTENT:([^\]]+)\]/);
            if (intentMatch) {
                const intentData = intentMatch[1];
                const parts = intentData.split('|');
                intentScenario = parts[0];
                
                for (const part of parts.slice(1)) {
                    if (part.includes(':')) {
                        const [key, value] = part.split(':').map(s => s.trim());
                        try {
                            const valStr = value.toLowerCase().trim();
                            if (value.includes('-') && value.length === 10) {
                                intentParams[key] = value;
                            } else if (valStr.endsWith('k')) {
                                intentParams[key] = Math.floor(parseFloat(valStr.slice(0, -1)) * 1000);
                            } else if (valStr.endsWith('m')) {
                                intentParams[key] = Math.floor(parseFloat(valStr.slice(0, -1)) * 1000000);
                            } else if (value.includes('.')) {
                                intentParams[key] = parseFloat(value);
                            } else if (!isNaN(parseInt(value))) {
                                intentParams[key] = parseInt(value);
                            } else {
                                intentParams[key] = value;
                            }
                        } catch {
                            intentParams[key] = value;
                        }
                    }
                }
                
                cleanMessage = assistantMessage.replace(/\s*\[INTENT:[^\]]+\]/, '').trim();
                console.log(`[INTENT TAG] Parsed: ${intentScenario} params=${JSON.stringify(intentParams)}`);
                
                // Apply parameter mappings
                intentParams = this._applyParamMappings(intentScenario, intentParams);
                
                // Generate action from tag
                action = new ScenarioAction(
                    "OPEN_CONFIG",
                    intentScenario,
                    intentParams
                );
            }
            
            // Regex-based Fallback (If no tag detected)
            if (!action && goalType && amount && !assistantMessage.includes("?")) {
                intentScenario = goalType;
                intentParams = { targetAmount: amount };
                
                // Apply validation mapping
                intentParams = this._applyParamMappings(intentScenario, intentParams);

                console.log(`[REGEX FALLBACK] Goal: ${goalType}, Amount: £${amount.toLocaleString()}`);
                
                action = new ScenarioAction(
                    "OPEN_CONFIG",
                    goalType,
                    intentParams
                );
                console.log(`[ACTION GENERATED] ${action.type} for ${goalType}`);
            }
            
            // Add assistant response to history (without any tags)
            if (cleanMessage) {
                this.sessions[sessionId].push({
                    role: "assistant",
                    content: cleanMessage
                });
            } else if (action) {
                cleanMessage = "I've prepared that for you.";
                this.sessions[sessionId].push({
                    role: "assistant",
                    content: cleanMessage
                });
            }
            
            // Return response
            return new AgentResponse({
                message: cleanMessage,
                profileExtracted: null,
                profileComplete: false,
                confidence: (intentScenario && Object.keys(intentParams).length > 0) ? 0.9 : 0.0,
                missingProfileFields: [],
                intent: intentScenario,
                params: Object.keys(intentParams).length > 0 ? intentParams : null,
                customScenario: customScenario,
                action: action
            });
            
        } catch (e) {
            console.error(e);
            return new AgentResponse({
                message: `I encountered an error: ${e.name} - ${e.message}`,
                profileExtracted: null,
                profileComplete: false,
                confidence: 0.0,
                missingProfileFields: []
            });
        }
    }
    
    /**
     * Apply parameter mappings for different scenarios
     * @param {string} scenario - Scenario ID
     * @param {Object} params - Raw parameters
     * @returns {Object} - Mapped parameters
     */
    _applyParamMappings(scenario, params) {
        const PARAM_MAPPINGS = {
            'childbirth': 'oneOffCosts',
            'buy_vehicle': 'totalCost',
            'custom_goal': { name: 'scenarioName', target_amount: 'targetAmount', monthly_amount: 'monthlyAmount', type: 'direction', frequency: 'frequency', date: 'targetDate' },
            'buy_home': {
                property_price: 'propertyPrice',
                deposit_amount: 'depositAmount',
                purchase_date: 'purchaseDate',
                targetAmount: 'propertyPrice',
                amount: 'propertyPrice',
                price: 'propertyPrice',
                cost: 'propertyPrice',
                date: 'purchaseDate'
            },
            'marriage': {
                totalBudget: 'totalBudget',
                targetAmount: 'totalBudget',
                amount: 'totalBudget',
                cost: 'totalBudget',
                budget: 'totalBudget',
                value: 'totalBudget',
                date: 'weddingDate',
                weddingDate: 'weddingDate'
            },
            'medical_emergency': { totalCost: 'totalCost', targetAmount: 'totalCost', amount: 'totalCost', cost: 'totalCost' },
            'tax_bill': { billAmount: 'billAmount', targetAmount: 'billAmount', amount: 'billAmount' },
            'home_improvement': { totalCost: 'totalCost', targetAmount: 'totalCost', amount: 'totalCost', cost: 'totalCost' },
            'ivf_treatment': { totalCost: 'totalCost', targetAmount: 'totalCost', amount: 'totalCost' },
            'help_family': 'monthlyAmount',
            'elder_care': 'monthlyAmount',
            'divorce': 'settlementCost',
            'death_partner': 'monthlyIncomeLost',
            'work_equipment': 'totalCost',
            'debt_consolidation': 'lumpSumPayment',
            'sell_asset': 'saleProceeds',
            'windfall': 'lumpSumAmount',
            'start_business': 'investmentAmount',
            'property_repair': 'repairCost'
        };

        const newParams = { ...params };
        
        // Apply specific mappings
        if (PARAM_MAPPINGS[scenario]) {
            const mapping = PARAM_MAPPINGS[scenario];
            if (typeof mapping === 'object') {
                for (const [aiKey, targetKey] of Object.entries(mapping)) {
                    if (newParams[aiKey] !== undefined) {
                        newParams[targetKey] = newParams[aiKey];
                        if (aiKey !== targetKey) {
                            delete newParams[aiKey];
                        }
                        console.log(`[MAPPING] Direct Map ${aiKey} -> ${targetKey}`);
                    }
                }
            }
        }

        // Generic Normalization
        if (newParams.targetAmount === undefined) {
            const GENERIC_KEYS = ['amount', 'cost', 'value', 'price', 'total', 'settlement_amount', 'total_settlement_cost', 'monthly_income_lost', 'lost_income'];
            const foundKey = GENERIC_KEYS.find(k => newParams[k] !== undefined);
            if (foundKey) {
                newParams.targetAmount = newParams[foundKey];
                delete newParams[foundKey];
                console.log(`[NORMALIZATION] Mapped ${foundKey} -> targetAmount`);
            }
        }

        // Apply single mapping (string-based)
        if (PARAM_MAPPINGS[scenario] && typeof PARAM_MAPPINGS[scenario] === 'string' && newParams.targetAmount !== undefined) {
            newParams[PARAM_MAPPINGS[scenario]] = newParams.targetAmount;
            delete newParams.targetAmount;
            console.log(`[MAPPING] Mapped targetAmount -> ${PARAM_MAPPINGS[scenario]}`);
        }
        
        return newParams;
    }
}

/**
 * Create AI agent instance
 * @param {string} apiKey - OpenAI API key
 * @param {string} model - Model name
 * @returns {AIAgent}
 */
function createAIAgent(apiKey, model = "gpt-4o-mini") {
    return new AIAgent(apiKey, model);
}

export { AIAgent, AgentResponse, ScenarioAction, createAIAgent };
