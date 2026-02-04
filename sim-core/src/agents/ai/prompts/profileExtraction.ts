/**
 * Profile Extraction Prompt
 * 
 * Prompt template for extracting UserProfile from natural language conversation.
 * Includes UK financial context and few-shot examples.
 * 
 * @module agents/ai/prompts/profileExtraction
 */

import { StructuredPrompt } from '../types'
import { UserProfile } from '../../types'

/**
 * System prompt for profile extraction
 */
export const PROFILE_EXTRACTION_SYSTEM_PROMPT = `You are a UK financial planning assistant. Your task is to extract structured user profile information from conversational input.

Extract the following information when available:
- Demographics: age, retirement age
- Income & Expenses: current salary (annual), monthly expenses
- Assets: pension balance, savings balance, ISA balance, property value
- Debts: mortgage balance, mortgage rate, other debt balance
- Flags: has emergency fund, number of children, marital status
- Risk tolerance: low, medium, or high

UK Context:
- Default retirement age is 67 (UK state pension age)
- ISA annual limit is £20,000
- Pension annual allowance is £60,000
- Tax-free pension lump sum is 25% (up to £268,275)
- Typical mortgage rates: 3-6%
- Typical HYSA rates: 4-5%

Instructions:
1. Extract ONLY information explicitly stated or strongly implied
2. Do NOT make up or guess values
3. Convert all monetary amounts to annual/monthly as appropriate
4. Mark fields as null if not mentioned
5. Identify which critical fields are still missing
6. Generate natural follow-up questions for missing critical fields

Return JSON in this exact format:
{
  "extractedProfile": {
    "age": number | null,
    "retirementAge": number | null,
    "currentSalary": number | null,
    "monthlyExpenses": number | null,
    "pensionBalance": number | null,
    "savingsBalance": number | null,
    "isaBalance": number | null,
    "propertyValue": number | null,
    "mortgageBalance": number | null,
    "mortgageRate": number | null,
    "otherDebtBalance": number | null,
    "hasEmergencyFund": boolean | null,
    "hasChildren": number | null,
    "isMarried": boolean | null,
    "riskTolerance": "low" | "medium" | "high" | null
  },
  "extractedFields": ["age", "currentSalary", ...],
  "missingCriticalFields": ["monthlyExpenses", ...],
  "suggestedQuestions": [
    "What are your typical monthly expenses?",
    ...
  ],
  "isComplete": boolean,
  "confidence": number (0-1)
}`

/**
 * Few-shot examples for profile extraction
 */
export const PROFILE_EXTRACTION_EXAMPLES = [
    {
        user: `I'm 28 years old, earning £45,000 a year as a software developer. I rent a flat for £1,200 per month and spend about £2,500 total each month including rent. I have £8,000 in savings but no pension yet. I'm single with no kids.`,
        assistant: JSON.stringify({
            extractedProfile: {
                age: 28,
                retirementAge: null,
                currentSalary: 45000,
                monthlyExpenses: 2500,
                pensionBalance: 0,
                savingsBalance: 8000,
                isaBalance: null,
                propertyValue: null,
                mortgageBalance: null,
                mortgageRate: null,
                otherDebtBalance: null,
                hasEmergencyFund: false,
                hasChildren: 0,
                isMarried: false,
                riskTolerance: null
            },
            extractedFields: ['age', 'currentSalary', 'monthlyExpenses', 'pensionBalance', 'savingsBalance', 'hasChildren', 'isMarried'],
            missingCriticalFields: ['riskTolerance'],
            suggestedQuestions: [
                "How comfortable are you with investment risk? Would you say low, medium, or high risk tolerance?"
            ],
            isComplete: false,
            confidence: 0.85
        }, null, 2)
    },
    {
        user: `My partner and I are both 35. I earn £60k, she earns £55k. We have a mortgage of £280,000 at 4.2% on our £400,000 house. We have £25k in ISAs and £18k in savings. Monthly costs are around £3,800. Two young kids.`,
        assistant: JSON.stringify({
            extractedProfile: {
                age: 35,
                retirementAge: null,
                currentSalary: 115000,
                monthlyExpenses: 3800,
                pensionBalance: null,
                savingsBalance: 18000,
                isaBalance: 25000,
                propertyValue: 400000,
                mortgageBalance: 280000,
                mortgageRate: 4.2,
                otherDebtBalance: null,
                hasEmergencyFund: true,
                hasChildren: 2,
                isMarried: true,
                riskTolerance: null
            },
            extractedFields: ['age', 'currentSalary', 'monthlyExpenses', 'savingsBalance', 'isaBalance', 'propertyValue', 'mortgageBalance', 'mortgageRate', 'hasChildren', 'isMarried', 'hasEmergencyFund'],
            missingCriticalFields: ['pensionBalance', 'riskTolerance'],
            suggestedQuestions: [
                "Do you or your partner have workplace pensions? If so, what's the total balance?",
                "How would you describe your investment risk tolerance?"
            ],
            isComplete: false,
            confidence: 0.9
        }, null, 2)
    }
]

/**
 * Create profile extraction prompt from conversation
 * 
 * @param conversationHistory - Messages from user
 * @returns Structured prompt for LLM
 */
export function createProfileExtractionPrompt(
    conversationHistory: string
): StructuredPrompt<any> {
    return {
        systemPrompt: PROFILE_EXTRACTION_SYSTEM_PROMPT,
        userPrompt: `Extract user profile from this conversation:\n\n${conversationHistory}\n\nProvide the extracted profile and missing fields in JSON format.`,
        examples: PROFILE_EXTRACTION_EXAMPLES,
        responseSchema: true, // Will use JSON mode
        parser: (response: string) => {
            const parsed = JSON.parse(response)
            return {
                profile: parsed.extractedProfile,
                extractedFields: parsed.extractedFields,
                missingFields: parsed.missingCriticalFields,
                confidence: parsed.confidence,
                suggestedQuestions: parsed.suggestedQuestions,
                isComplete: parsed.isComplete
            }
        }
    }
}

/**
 * Merge new profile data with existing partial profile
 * 
 * @param existing - Existing partial profile
 * @param newData - New profile data to merge
 * @returns Merged profile
 */
export function mergeProfileData(
    existing: Partial<UserProfile>,
    newData: Partial<UserProfile>
): Partial<UserProfile> {
    const merged: Partial<UserProfile> = { ...existing }

    // Merge each field, preferring non-null new values
    for (const [key, value] of Object.entries(newData)) {
        if (value !== null && value !== undefined) {
            (merged as any)[key] = value
        }
    }

    return merged
}

/**
 * Check if profile has minimum required fields for basic recommendations
 * 
 * @param profile - User profile to check
 * @returns Whether profile is minimally complete
 */
export function isProfileMinimallyComplete(profile: Partial<UserProfile>): boolean {
    const requiredFields = ['age', 'currentSalary', 'monthlyExpenses']
    return requiredFields.every(field => profile[field as keyof UserProfile] != null)
}

/**
 * Get list of missing critical fields
 * 
 * @param profile - User profile to check
 * @returns Array of missing field names
 */
export function getMissingCriticalFields(profile: Partial<UserProfile>): string[] {
    const criticalFields: (keyof UserProfile)[] = [
        'age',
        'currentSalary',
        'monthlyExpenses',
        'riskTolerance'
    ]

    return criticalFields.filter(field => profile[field] == null) as string[]
}
