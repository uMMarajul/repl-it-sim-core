/**
 * Scenario Mapper - Find closest matching scenarios for unsupported requests
 */

import { ScenarioId } from '../../../sim-core/src/config/index'

interface ScenarioSuggestion {
    scenarioId: ScenarioId
    reason: string
    confidence: number
}

/**
 * Keyword to scenario mapping for common unsupported requests
 */
const KEYWORD_MAPPINGS: Record<string, { scenarioId: ScenarioId, reason: string }> = {
    // Vehicles & Transport
    'boat': { scenarioId: ScenarioId.BUY_VEHICLE, reason: 'similar to vehicle purchase' },
    'motorcycle': { scenarioId: ScenarioId.BUY_VEHICLE, reason: 'similar to vehicle purchase' },
    'bike': { scenarioId: ScenarioId.BUY_VEHICLE, reason: 'similar to vehicle purchase' },

    // Events
    'wedding': { scenarioId: ScenarioId.MARRIAGE, reason: 'wedding expenses' },
    'honeymoon': { scenarioId: ScenarioId.MARRIAGE, reason: 'part of wedding planning' },

    // Property
    'renovation': { scenarioId: ScenarioId.HOME_IMPROVEMENT, reason: 'home renovation costs' },
    'extension': { scenarioId: ScenarioId.HOME_IMPROVEMENT, reason: 'home extension project' },
    'loft': { scenarioId: ScenarioId.HOME_IMPROVEMENT, reason: 'loft conversion' },

    // Savings
    'holiday': { scenarioId: ScenarioId.SABBATICAL, reason: 'extended travel/break' },
    'vacation': { scenarioId: ScenarioId.SABBATICAL, reason: 'travel expenses' },
    'travel': { scenarioId: ScenarioId.SABBATICAL, reason: 'travel fund' },

    // Investment
    'crypto': { scenarioId: ScenarioId.START_INVESTING_GIA, reason: 'alternative investment (taxable)' },
    'cryptocurrency': { scenarioId: ScenarioId.START_INVESTING_GIA, reason: 'alternative investment (taxable)' },
    'bitcoin': { scenarioId: ScenarioId.START_INVESTING_GIA, reason: 'alternative investment (taxable)' },

    // Education
    'tuition': { scenarioId: ScenarioId.EDUCATION_FUND, reason: 'education costs' },
    'college': { scenarioId: ScenarioId.EDUCATION_FUND, reason: 'higher education expenses' },
    'uni': { scenarioId: ScenarioId.EDUCATION_FUND, reason: 'university costs' },

    // Business
    'startup': { scenarioId: ScenarioId.BUSINESS_VENTURE, reason: 'business startup costs' },
    'freelance': { scenarioId: ScenarioId.SIDE_INCOME, reason: 'additional income stream' },

    // Family
    'baby': { scenarioId: ScenarioId.CHILDBIRTH, reason: 'baby preparation and care' },
    'kid': { scenarioId: ScenarioId.CHILDBIRTH, reason: 'child-related expenses' },
    'childcare': { scenarioId: ScenarioId.CHILDBIRTH, reason: 'ongoing childcare costs' }
}

/**
 * Find closest matching scenario for unsupported request
 */
export function findClosestScenario(userInput: string): ScenarioSuggestion | null {
    const lowerInput = userInput.toLowerCase()

    // Check keyword mappings
    for (const [keyword, mapping] of Object.entries(KEYWORD_MAPPINGS)) {
        if (lowerInput.includes(keyword)) {
            return {
                ...mapping,
                confidence: 0.8
            }
        }
    }

    return null
}

/**
 * Get multiple scenario suggestions if applicable
 */
export function getSuggestions(userInput: string): ScenarioSuggestion[] {
    const suggestions: ScenarioSuggestion[] = []
    const lowerInput = userInput.toLowerCase()

    // Find all matching keywords
    for (const [keyword, mapping] of Object.entries(KEYWORD_MAPPINGS)) {
        if (lowerInput.includes(keyword)) {
            suggestions.push({
                ...mapping,
                confidence: 0.8
            })
        }
    }

    return suggestions
}
