/**
 * Scenario Pattern Matcher
 * 
 * Maps user queries to actual scenario IDs using pattern matching.
 * Connects to the real 54 scenarios in the system.
 */

import { ScenarioId } from '../../../sim-core/src/config/index'

export interface MatchedScenario {
    scenarioId: ScenarioId
    confidence: number
    guidanceText: string
}

/**
 * Pattern match user input to scenario IDs
 */
export function matchScenario(userInput: string): MatchedScenario | null {
    const input = userInput.toLowerCase()

    // FOUNDATIONAL STABILITY
    if (input.match(/emergency|rainy day|safety net|buffer/i)) {
        return {
            scenarioId: ScenarioId.EMERGENCY_FUND,
            confidence: 0.9,
            guidanceText: 'Financial advisors recommend 3-6 months of expenses in an accessible emergency fund. This is your first line of defense against unexpected costs.'
        }
    }

    if (input.match(/house.*deposit|save.*house|save.*home|deposit.*property/i)) {
        return {
            scenarioId: ScenarioId.HOUSE_DEPOSIT_FUND,
            confidence: 0.85,
            guidanceText: 'Save for a house deposit (typically 10-20% of property value). UK first-time buyers may qualify for Help to Buy ISA or Lifetime ISA with government bonuses.'
        }
    }

    if (input.match(/buy.*house|buy.*home|buy.*property|purchase.*house/i)) {
        return {
            scenarioId: ScenarioId.BUY_HOME,
            confidence: 0.9,
            guidanceText: 'UK property purchase: 10-20% deposit + 2-5% stamp duty + 2-3% fees (solicitor, survey). Property value appreciates ~3-5% annually (varies by region).'
        }
    }

    if (input.match(/debt|consolidate|pay.*off|credit card|overdraft/i)) {
        return {
            scenarioId: ScenarioId.DEBT_CONSOLIDATION,
            confidence: 0.8,
            guidanceText: 'Consolidate and pay off high-interest debt (credit cards: 20-30% APR, overdrafts: 35-40% APR). Prioritize highest interest rates first.'
        }
    }

    if (input.match(/accelerate.*debt|extra.*payment|overpay|pay.*faster/i)) {
        return {
            scenarioId: ScenarioId.ACCELERATE_DEBT,
            confidence: 0.85,
            guidanceText: 'Extra payments beyond minimum reduce principal faster, saving thousands in interest. Most effective on highest-rate debts or short-term mortgage acceleration.'
        }
    }

    if (input.match(/pension|retire|retirement/i)) {
        return {
            scenarioId: ScenarioId.PENSION_CONTRIBUTION,
            confidence: 0.9,
            guidanceText: 'UK pension contributions: 20-45% tax relief, employer match (typically 3-5%), annual allowance £60k. Locked until age 55 (rising to 57 in 2028).'
        }
    }

    if (input.match(/invest|isa|stocks|shares|equities/i)) {
        return {
            scenarioId: ScenarioId.START_INVESTING_ISA,
            confidence: 0.85,
            guidanceText: 'ISA: Tax-free growth and withdrawals, £20k/year limit (April-March). Ideal for long-term investing. Historical equity returns: 7-10% annually.'
        }
    }

    // FAMILY & CARE
    if (input.match(/child|baby|childbirth/i)) {
        return {
            scenarioId: ScenarioId.CHILDBIRTH,
            confidence: 0.9,
            guidanceText: 'Baby preparation: £2-5k (cot, pram, clothes, nursery). Childcare: £600-1200/month (nursery/childminder). Parental leave: model separately as income loss.'
        }
    }

    if (input.match(/education|university|school|tuition/i)) {
        return {
            scenarioId: ScenarioId.EDUCATION_FUND,
            confidence: 0.85,
            guidanceText: 'University: £9,250/year tuition + £9-12k/year living (3 years). Private school: £15-30k/year. Start saving early to spread costs.'
        }
    }

    if (input.match(/wedding|marriage/i)) {
        return {
            scenarioId: ScenarioId.MARRIAGE,
            confidence: 0.9,
            guidanceText: 'UK average wedding: £17-30k (venue, catering, photography, rings, honeymoon). Budget weddings: £5-10k, luxury: £40k+.'
        }
    }

    // CAREER & INCOME
    if (input.match(/salary.*increase|promotion|raise|pay rise/i)) {
        return {
            scenarioId: ScenarioId.SALARY_INCREASE,
            confidence: 0.9,
            guidanceText: 'Model post-tax income increase. UK annual raises: 2-5% (inflation), promotions: 10-20%+. Factor in higher tax bracket if crossing £50k or £100k.'
        }
    }

    if (input.match(/side.*income|freelance|side.*hustle/i)) {
        return {
            scenarioId: ScenarioId.SIDE_INCOME,
            confidence: 0.85,
            guidanceText: 'Side income taxed as self-employment above £1k trading allowance. Remember NI and tax deductions. Popular: tutoring, consulting, rental income.'
        }
    }

    if (input.match(/job.*loss|lose.*job|unemploy|redundan/i)) {
        return {
            scenarioId: ScenarioId.JOB_LOSS,
            confidence: 0.9,
            guidanceText: 'UK Jobseeker\'s Allowance: £84/week (under 25), £67/week (25+). Typical unemployment: 3-6 months. Emergency fund critical.'
        }
    }

    if (input.match(/business|entrepreneur|startup|venture/i)) {
        return {
            scenarioId: ScenarioId.BUSINESS_VENTURE,
            confidence: 0.85,
            guidanceText: 'Business setup: £5-50k (legal, equipment, marketing). Monthly costs: £2-10k. Revenue ramp-up: 3-12 months. Tracks business equity value.'
        }
    }

    // HOUSING & ASSETS
    if (input.match(/mortgage|home.*loan/i)) {
        return {
            scenarioId: ScenarioId.APPLY_MORTGAGE,
            confidence: 0.9,
            guidanceText: 'UK mortgages: Typically 3-6% interest, 25-35 year terms. Fixed rates (2-5 years) or variable. Overpayment typically allowed (10% per year).'
        }
    }

    if (input.match(/car|vehicle/i)) {
        return {
            scenarioId: ScenarioId.BUY_VEHICLE,
            confidence: 0.8,
            guidanceText: 'New cars depreciate ~15-35% in year 1, ~10-15% annually thereafter. Running costs: insurance (£500-1500/year), fuel, maintenance, tax.'
        }
    }

    // MARKET & ECONOMIC
    if (input.match(/inheritance|windfall|bonus/i)) {
        return {
            scenarioId: ScenarioId.LARGE_WINDFALL,
            confidence: 0.85,
            guidanceText: 'Large windfalls: Work bonus (taxed as income), lottery (tax-free UK), legal settlement (varies). Smart allocation: debt, emergency fund, ISA.'
        }
    }

    // No match found
    return null
}
