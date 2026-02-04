/**
 * Chat State Types - Manage multi-turn conversations
 */

import { ScenarioId } from '../../../sim-core/src/config/index'
import { type ExtractedParameters } from '../utils/parameterExtractor'

export interface ConversationState {
    stage: 'idle' | 'gathering_info' | 'confirming'
    targetScenario?: ScenarioId
    collectedParams: ExtractedParameters
    requiredFields: string[]
    askedFields: string[]
}

export interface RequiredFields {
    [scenarioId: string]: {
        required: string[]
        optional: string[]
        prompts: {
            [field: string]: string
        }
    }
}

// Define required fields for key scenarios
export const SCENARIO_REQUIRED_FIELDS: RequiredFields = {
    [ScenarioId.BUY_HOME]: {
        required: ['amount'],  // property price
        optional: ['percentage', 'duration'],
        prompts: {
            amount: 'What\'s your target property price?',
            percentage: 'What deposit percentage are you aiming for? (UK lenders typically require 10-20%)',
            duration: 'When would you like to purchase? (e.g., "in 3 years")'
        }
    },
    [ScenarioId.EMERGENCY_FUND]: {
        required: ['amount'],
        optional: ['duration'],
        prompts: {
            amount: 'How much would you like in your emergency fund? (Financial advisors recommend 3-6 months of expenses)',
            duration: 'Over what timeframe would you like to build this fund?'
        }
    },
    [ScenarioId.PENSION_CONTRIBUTION]: {
        required: ['monthlyAmount'],
        optional: [],
        prompts: {
            monthlyAmount: 'How much would you like to contribute to your pension each month?'
        }
    },
    [ScenarioId.DEBT_CONSOLIDATION]: {
        required: ['amount'],
        optional: [],
        prompts: {
            amount: 'What\'s the total amount of debt you\'d like to consolidate?'
        }
    },
    [ScenarioId.MARRIAGE]: {
        required: ['amount'],
        optional: ['date'],
        prompts: {
            amount: 'What is your estimated budget for the wedding?',
            date: 'When are you planning to get married? (e.g., "in 2 years")'
        }
    },
    [ScenarioId.BUY_VEHICLE]: {
        required: ['amount'],
        optional: ['date'],
        prompts: {
            amount: 'How much are you looking to spend on the vehicle?',
            date: 'When do you plan to buy it?'
        }
    },
    [ScenarioId.CUSTOM_GOAL]: {
        required: ['amount'],
        optional: ['date', 'name'],
        prompts: {
            amount: 'How much money do you need for this goal?',
            date: 'When do you want to achieve this by?',
            name: 'What would you like to call this goal?'
        }
    },
    [ScenarioId.JOB_LOSS]: {
        required: [],
        optional: ['duration'],
        prompts: {
            duration: 'How many months of income coverage would you like to test? (Default is 6 months)'
        }
    },
    [ScenarioId.MARKET_CRASH]: {
        required: [], // Usually immediate
        optional: [],
        prompts: {}
    }
}
