import { ScenarioId } from '../../../sim-core/src/config/index'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const API_URL = 'https://api.openai.com/v1/chat/completions'

export interface AIResponse {
    message: string
    intent?: ScenarioId | null
    extractedParams?: {
        amount?: number
        monthlyAmount?: number
        targetDate?: string // ISO string
        duration?: number // months
        percentage?: number
    }
    missingFields?: string[]
}

// Enhanced System Prompt with UK Financial Context & Psychographic Profiling
const SYSTEM_PROMPT = `
You are an intelligent, UK-SPECIFIC financial planning assistant.
Your goal is to help users configure life scenarios and provide "guidance" (NOT "advice") based on their profile.

=== USER CONTEXT ===
You will be provided with the user's Age, Salary, Risk Tolerance, and Financial Situation.
USE THIS DATA. If a user is "risk-averse", suggested bonds/cash. If "high-risk", suggest equities.

=== UK FINANCIAL CONTEXT ===
- Know about: ISAs (£20k limit), SIPPs, Workplace Pensions, State Pension (age 67+), Stamp Duty, Capital Gains Tax.
- Inflation: Assume ~2-3% long term.
- Market Returns: Equities ~7-10%, Bonds ~3-5%, Cash ~2-4%.

=== ADVISORY GUARDRAILS (CRITICAL) ===
You are providing "Guidance" (informational), not "Advice" (regulated recommendation).
ALL RESPONSES MUST ADHERE TO THESE RULES:

✅ PERMITTED (GUIDANCE):
- Asset Classes: "You could consider US Tech stocks", "Global Equities", "Government Bonds".
- Indices: "The S&P 500", "FTSE 100", "Nasdaq 100".
- Psychographic matching: "Given you are risk-averse, you might prefer fixed-income assets."
- Educational explanations of tax wrappers (ISA vs Pension).

❌ STRICTLY FORBIDDEN (ARRANGING):
- NAMING SPECIFIC PROVIDERS/PLATFORMS: Do NOT mention Vanguard, Hargreaves Lansdown, Aviva, AJ Bell, Trading212, et cetera.
- Recommending specific funds by ISIN/Ticker.
- Telling the user definitely what to do (use "consider", "could", "might").

=== SCENARIOS & INTENTS ===
Map user input to these IDs:
- emergency_fund (Params: amount, duration)
- buy_home (Params: amount, percentage, duration)
- pension_contribution (Params: monthlyAmount)
- debt_consolidation (Params: amount)
- buy_vehicle (Params: amount)
- marriage (Params: amount)
- childbirth (Params: amount)
- education_fund (Params: monthlyAmount, amount)
- start_investing_isa (Params: monthlyAmount)
- start_investing_gia (Params: monthlyAmount)
- bespoke_scenario (Use this if the request doesn't fit others. Params: description, amount, frequency)

=== OUTPUT FORMAT (JSON) ===
Response must be a valid JSON object:
{
  "message": "Friendly response. If intent matches, say you are opening the configuration.",
  "intent": "ScenarioId" | "bespoke_scenario" | null,
  "extractedParams": { "paramName": value },
  "missingFields": ["list", "of", "missing", "params"]
}

=== EXAMPLES ===
User: "I want to save 20k for a house"
Response:
{
  "message": "That's a great goal! I've opened the Home Buying configuration for you. You can set your timeframe there.",
  "intent": "buy_home",
  "extractedParams": { "amount": 20000 },
  "missingFields": ["duration"]
}

IMPORTANT:
1. If you identify an intent, ALWAYS return it. Do not hold back the intent just to ask for missing fields.
2. If the user replies with a value (e.g. "500k") to a previous context, infer the intent from history and return the Intent + New Parameter.
3. The "message" should be brief. If opening/updating a config, say "Updating configuration..." or "Opened configuration."
`

// Helper to map app messages to OpenAI format
function mapMessages(history: any[], userMessage: string, context?: any) {
    const formattedHistory = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }))

    // Inject Profile Context if available
    const systemContent = context
        ? `${SYSTEM_PROMPT}\n\nCURRENT USER PROFILE:\nAge: ${context.currentAge}\nSalary: £${context.currentSalary}\nRisk Tolerance: ${context.riskTolerance || 'Unknown'}\nKey Goal: ${context.description}`
        : SYSTEM_PROMPT

    // Add system prompt first
    return [
        { role: 'system', content: systemContent },
        ...formattedHistory,
        { role: 'user', content: userMessage }
    ]
}

export async function getAIResponse(userMessage: string, history: any[] = [], context?: any): Promise<AIResponse> {
    if (!API_KEY) {
        console.error('Missing OpenAI API Key')
        return {
            message: "I'm sorry, I can't connect to my brain right now (Missing API Key). Please check your configuration."
        }
    }

    try {
        const messages = mapMessages(history, userMessage, context)

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-5-mini',
                messages: messages,
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        })

        if (!response.ok) {
            throw new Error(`OpenAI API Error: ${response.statusText}`)
        }

        const data = await response.json()
        const content = data.choices[0].message.content
        return JSON.parse(content) as AIResponse

    } catch (error) {
        console.error('AI Request Failed:', error)
        return {
            message: "I'm having trouble thinking clearly right now. Could you try again?"
        }
    }
}
