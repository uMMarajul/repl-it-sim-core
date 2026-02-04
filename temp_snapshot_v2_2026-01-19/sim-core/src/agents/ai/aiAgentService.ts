/**
 * AI Agent Service - Main Orchestration Layer
 * 
 * Coordinates LLM calls, profile extraction, and recommendation generation.
 * This is the primary interface for AI agent interactions.
 * 
 * @module agents/ai/aiAgentService
 */

import { LLMClient } from './llmClient'
import {
    Message,
    ConversationContext,
    AgentResponse,
    ProfileExtractionResult,
    ProfileExtractionError
} from './types'
import { UserProfile } from '../types'
import {
    createProfileExtractionPrompt,
    mergeProfileData,
    isProfileMinimallyComplete,
    getMissingCriticalFields
} from './prompts/profileExtraction'

/**
 * AI Agent Service for financial planning assistance
 */
export class AIAgentService {
    private llmClient: LLMClient
    private conversations: Map<string, ConversationContext> = new Map()

    constructor(llmClient: LLMClient) {
        this.llmClient = llmClient
    }

    /**
     * Process user input and generate agent response
     * 
     * @param userMessage - User's message
     * @param sessionId - Session identifier
     * @returns Agent response with recommendations and questions
     */
    async processUserInput(
        userMessage: string,
        sessionId: string = this.generateSessionId()
    ): Promise<AgentResponse> {
        // Get or create conversation context
        let context = this.conversations.get(sessionId)

        if (!context) {
            context = this.createNewConversation(sessionId)
            this.conversations.set(sessionId, context)
        }

        // Add user message to conversation
        context.messages.push({
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        })
        context.updatedAt = new Date()

        try {
            // Extract profile from full conversation
            const extractionResult = await this.extractProfile(context)

            // Merge extracted profile with existing
            if (context.extractedProfile) {
                context.extractedProfile = mergeProfileData(
                    context.extractedProfile,
                    extractionResult.profile
                )
            } else {
                context.extractedProfile = extractionResult.profile
            }

            // Generate response message
            let responseMessage: string
            const profileComplete = isProfileMinimallyComplete(context.extractedProfile)

            if (!profileComplete && extractionResult.suggestedQuestions.length > 0) {
                // Ask for missing information
                responseMessage = this.generateProfileGatheringMessage(
                    extractionResult,
                    context.extractedProfile
                )
            } else {
                // Profile is sufficient - acknowledge and prepare for recommendations
                responseMessage = this.generateProfileCompleteMessage(
                    context.extractedProfile
                )
            }

            // Create agent response
            const response: AgentResponse = {
                message: responseMessage,
                profileExtracted: context.extractedProfile,
                missingProfileFields: extractionResult.missingFields,
                questionsForUser: extractionResult.suggestedQuestions,
                confidence: extractionResult.confidence,
                profileComplete
            }

            // Add assistant message to conversation
            context.messages.push({
                role: 'assistant',
                content: responseMessage,
                timestamp: new Date()
            })

            return response

        } catch (error: any) {
            throw new ProfileExtractionError(
                `Failed to process user input: ${error.message}`,
                { sessionId, error }
            )
        }
    }

    /**
     * Extract user profile from conversation context
     * 
     * @param context - Conversation context
     * @returns Profile extraction result
     */
    private async extractProfile(
        context: ConversationContext
    ): Promise<ProfileExtractionResult> {
        // Combine all messages into conversation history
        const conversationText = context.messages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n\n')

        // Create extraction prompt
        const prompt = createProfileExtractionPrompt(conversationText)

        // Call LLM
        const response = await this.llmClient.structuredPrompt(prompt)

        return response.content
    }

    /**
     * Generate message for gathering profile information
     * 
     * @param extractionResult - Profile extraction results
     * @param currentProfile - Current partial profile
     * @returns Natural language message
     */
    private generateProfileGatheringMessage(
        extractionResult: ProfileExtractionResult,
        currentProfile: Partial<UserProfile>
    ): string {
        const acknowledged: string[] = []

        // Acknowledge what was extracted
        if (currentProfile.age) {
            acknowledged.push(`you're ${currentProfile.age} years old`)
        }
        if (currentProfile.currentSalary) {
            acknowledged.push(`earning £${currentProfile.currentSalary.toLocaleString()} per year`)
        }
        if (currentProfile.monthlyExpenses) {
            acknowledged.push(`spending about £${currentProfile.monthlyExpenses.toLocaleString()} per month`)
        }

        let message = "Thanks for sharing that information! "

        if (acknowledged.length > 0) {
            message += `I understand ${acknowledged.join(', ')}. `
        }

        // Ask follow-up questions
        if (extractionResult.suggestedQuestions.length > 0) {
            message += "\n\nTo give you the best recommendations, I'd like to know a bit more:\n\n"
            extractionResult.suggestedQuestions.forEach((q, i) => {
                message += `${i + 1}. ${q}\n`
            })
        }

        return message
    }

    /**
     * Generate message when profile is complete
     * 
     * @param profile - Complete user profile
     * @returns Natural language message
     */
    private generateProfileCompleteMessage(profile: Partial<UserProfile>): string {
        return `Perfect! I now have a good understanding of your financial situation. Based on your profile (age ${profile.age}, income £${profile.currentSalary?.toLocaleString()}, monthly expenses £${profile.monthlyExpenses?.toLocaleString()}), I can provide personalized recommendations for your financial goals.\n\nWhat would you like to focus on? For example:\n- Building an emergency fund\n- Saving for a house deposit\n- Planning for retirement\n- Reducing debt\n- Starting to invest\n\nOr tell me about any specific financial goals you have in mind!`
    }

    /**
     * Create new conversation context
     * 
     * @param sessionId - Session identifier
     * @returns New conversation context
     */
    private createNewConversation(sessionId: string): ConversationContext {
        const now = new Date()

        return {
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful UK financial planning assistant. Help users plan their finances with realistic, FCA-compliant guidance.',
                    timestamp: now
                },
                {
                    role: 'assistant',
                    content: "Hello! I'm your AI financial planning assistant. I can help you plan your finances, set goals, and create realistic projections tailored to your situation in the UK.\n\nTo get started, could you tell me a bit about yourself? For example:\n- Your age and when you plan to retire\n- Your current income and monthly expenses\n- Any savings, investments, or debts you have\n- What financial goals you're working towards\n\nDon't worry if you don't have all the details - we can work through it together!",
                    timestamp: now
                }
            ],
            sessionId,
            startedAt: now,
            updatedAt: now
        }
    }

    /**
     * Generate unique session ID
     * 
     * @returns Session ID
     */
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Get conversation context by session ID
     * 
     * @param sessionId - Session identifier
     * @returns Conversation context or undefined
     */
    getConversation(sessionId: string): ConversationContext | undefined {
        return this.conversations.get(sessionId)
    }

    /**
     * Clear conversation context
     * 
     * @param sessionId - Session identifier
     */
    clearConversation(sessionId: string): void {
        this.conversations.delete(sessionId)
    }

    /**
     * Get initial greeting message for new conversation
     * 
     * @returns Initial assistant message
     */
    getInitialMessage(): string {
        const context = this.createNewConversation('temp')
        return context.messages[1].content // Get assistant greeting
    }
}

/**
 * Create AI agent service with LLM client
 * 
 * @param apiKey - OpenAI API key
 * @param model - Model to use (default: gpt-4o-mini)
 * @returns AI agent service instance
 */
export function createAIAgent(
    apiKey: string,
    model: string = 'gpt-4o-mini'
): AIAgentService {
    const llmClient = new LLMClient({
        apiKey,
        model,
        temperature: 0.7,
        maxTokens: 2000
    })

    return new AIAgentService(llmClient)
}
