/**
 * Rule Definitions - Initial Rule Set
 * 
 * Declarative rules for scenario recommendations.
 * Each rule is traceable, versioned, and FCA-compliant.
 * 
 * @module agents/ruleDefinitions
 */

import { Rule, RuleCategory } from './types'
import { ScenarioId } from '../config/scenarioTypes'

/**
 * Emergency Fund Rules
 */
export const EMERGENCY_FUND_STANDARD: Rule = {
    id: 'emergency_fund_standard',
    version: '1.0.0',
    name: 'Standard Emergency Fund Recommendation',
    description: 'Recommend 3-6 months of expenses in accessible savings for individuals without an emergency fund',
    category: RuleCategory.FOUNDATIONAL_STABILITY,
    conditions: [
        {
            field: 'profile.monthlyExpenses',
            operator: 'gt',
            value: 0,
            description: 'User has documented monthly expenses'
        },
        {
            field: 'profile.hasEmergencyFund',
            operator: 'eq',
            value: false,
            logic: 'AND',
            description: 'User does not have an emergency fund'
        }
    ],
    recommendations: [
        {
            scenarioId: 'emergency_fund' as ScenarioId,
            confidence: 0.9,
            suggestedParams: {
                targetAmount: 'profile.monthlyExpenses * 6',
                targetDate: 'currentDate + 12 months'
            },
            reasoning: 'No emergency fund detected. Standard financial guidance recommends 3-6 months of expenses in accessible savings for financial stability and unexpected events.',
            calculationTrace: [
                {
                    step: 1,
                    description: 'Calculate recommended emergency fund amount',
                    formula: 'monthlyExpenses × 6 months',
                    inputs: {
                        monthlyExpenses: 'profile.monthlyExpenses'
                    },
                    result: 'profile.monthlyExpenses * 6',
                    units: '£'
                },
                {
                    step: 2,
                    description: 'Set realistic timeline for accumulation',
                    formula: '12 months for gradual savings',
                    result: 'currentDate + 12 months'
                }
            ],
            priority: 100,  // Highest priority - foundational financial stability
            tags: ['urgent', 'foundational', 'risk_management']
        }
    ],
    priority: 100,
    fca_compliant: true,
    tags: ['emergency_fund', 'savings', 'foundational'],
    enabled: true
}

/**
 * ISA Maximization Rule
 */
export const ISA_MAXIMIZE: Rule = {
    id: 'isa_maximize',
    version: '1.0.0',
    name: 'ISA Allowance Maximization',
    description: 'Recommend maximizing tax-free ISA contributions for high earners with available income',
    category: RuleCategory.TAX_EFFICIENCY,
    conditions: [
        {
            field: 'profile.currentSalary',
            operator: 'gte',
            value: 50000,
            description: 'Higher earner (£50k+) who benefits from tax efficiency'
        },
        {
            field: 'profile.isaBalance',
            operator: 'lt',
            value: 100000,
            logic: 'AND',
            description: 'ISA not yet fully utilized'
        }
    ],
    recommendations: [
        {
            scenarioId: 'open_investment_isa' as ScenarioId,
            confidence: 0.85,
            suggestedParams: {
                monthlyContribution: 1667,  // £20k annual allowance / 12
                startDate: 'currentDate + 1 month'
            },
            reasoning: 'As you earn {{profile.currentSalary}}, maximizing your £20,000 annual ISA allowance provides crucial tax-free growth on investments. This is one of the most tax-efficient savings vehicles in the UK.',
            calculationTrace: [
                {
                    step: 1,
                    description: 'Calculate monthly contribution to max ISA allowance',
                    formula: '£20,000 annual allowance ÷ 12 months',
                    result: 1667,
                    units: '£/month'
                },
                {
                    step: 2,
                    description: 'Set start date for next month',
                    result: 'currentDate + 1 month'
                }
            ],
            priority: 80,
            tags: ['tax_efficient', 'recommended', 'wealth_building']
        }
    ],
    priority: 80,
    fca_compliant: true,
    tags: ['isa', 'tax_efficiency', 'investments'],
    enabled: true
}

/**
 * Pension Contribution Rule (Young Professional)
 */
export const PENSION_YOUNG_PROFESSIONAL: Rule = {
    id: 'pension_young_professional',
    version: '1.0.0',
    name: 'Young Professional Pension Strategy',
    description: 'Recommend pension contributions for professionals under 40 with good income',
    category: RuleCategory.RETIREMENT_PLANNING,
    conditions: [
        {
            field: 'profile.age',
            operator: 'between',
            value: [25, 40],
            description: 'Young professional (25-40 years old)'
        },
        {
            field: 'profile.currentSalary',
            operator: 'gte',
            value: 40000,
            logic: 'AND',
            description: 'Steady income (£40k+)'
        },
        {
            field: 'profile.pensionBalance',
            operator: 'lt',
            value: 100000,
            logic: 'AND',
            description: 'Pension still in growth phase'
        }
    ],
    recommendations: [
        {
            scenarioId: 'increase_pension_contribution' as ScenarioId,
            confidence: 0.8,
            suggestedParams: {
                contributionPercent: 15,  // 15% of salary
                startDate: 'currentDate + 1 month'
            },
            reasoning: 'Starting early with pension contributions leverages compound growth over decades. Since you are {{profile.age}} years old, a 15% contribution rate (including employer match) is recommended for comfortable retirement. UK pension contributions also provide tax relief at your marginal rate.',
            calculationTrace: [
                {
                    step: 1,
                    description: 'Calculate recommended pension contribution percentage',
                    formula: 'Standard guidance: Age/2 as percentage (capped at 15% for young professionals)',
                    inputs: {
                        age: 'profile.age'
                    },
                    result: 15,
                    units: '% of salary'
                },
                {
                    step: 2,
                    description: 'Calculate monthly contribution amount',
                    formula: '(currentSalary × 15%) ÷ 12',
                    inputs: {
                        salary: 'profile.currentSalary'
                    },
                    result: 'profile.currentSalary * 0.15 / 12',
                    units: '£/month'
                }
            ],
            priority: 75,
            tags: ['long_term', 'tax_efficient', 'retirement']
        }
    ],
    priority: 75,
    fca_compliant: true,
    tags: ['pension', 'retirement', 'tax_relief'],
    enabled: true
}

/**
 * Mortgage Overpayment Rule
 */
export const MORTGAGE_OVERPAYMENT: Rule = {
    id: 'mortgage_overpayment',
    version: '1.0.0',
    name: 'Mortgage Overpayment Strategy',
    description: 'Recommend mortgage overpayments when interest rate exceeds safe investment returns',
    category: RuleCategory.DEBT_OPTIMIZATION,
    conditions: [
        {
            field: 'profile.mortgageBalance',
            operator: 'gt',
            value: 0,
            description: 'Has an active mortgage'
        },
        {
            field: 'profile.mortgageRate',
            operator: 'gte',
            value: 3.0,
            logic: 'AND',
            description: 'Mortgage rate is 3% or higher'
        },
        {
            field: 'profile.hasEmergencyFund',
            operator: 'eq',
            value: true,
            logic: 'AND',
            description: 'Has emergency fund already established'
        }
    ],
    recommendations: [
        {
            scenarioId: 'accelerate_mortgage_repayment' as ScenarioId,
            confidence: 0.75,
            suggestedParams: {
                monthlyOverpayment: 'profile.monthlyExpenses * 0.1',  // 10% of monthly expenses
                startDate: 'currentDate + 1 month'
            },
            reasoning: 'With a mortgage rate of 3%+, overpayments provide a guaranteed return equivalent to your interest rate. This is often better than low-risk savings accounts. Ensure overpayments are within your lender\'s penalty-free limit (typically 10% annually).',
            calculationTrace: [
                {
                    step: 1,
                    description: 'Calculate safe monthly overpayment amount',
                    formula: 'Monthly expenses × 10% (conservative approach)',
                    inputs: {
                        monthlyExpenses: 'profile.monthlyExpenses'
                    },
                    result: 'profile.monthlyExpenses * 0.1',
                    units: '£/month'
                },
                {
                    step: 2,
                    description: 'Calculate guaranteed return equivalent',
                    formula: 'Overpayment saves interest at mortgage rate',
                    inputs: {
                        mortgageRate: 'profile.mortgageRate'
                    },
                    result: 'profile.mortgageRate',
                    units: '% p.a.'
                }
            ],
            priority: 70,
            tags: ['debt_reduction', 'guaranteed_return', 'wealth_building']
        }
    ],
    priority: 70,
    fca_compliant: true,
    tags: ['mortgage', 'debt_optimization', 'overpayment'],
    enabled: true
}

/**
 * High Interest Debt Priority Rule
 */
export const HIGH_INTEREST_DEBT: Rule = {
    id: 'high_interest_debt_priority',
    version: '1.0.0',
    name: 'High Interest Debt Elimination',
    description: 'Prioritize paying off high-interest debt (credit cards, personal loans) before other financial goals',
    category: RuleCategory.DEBT_OPTIMIZATION,
    conditions: [
        {
            field: 'profile.otherDebtBalance',
            operator: 'gt',
            value: 1000,
            description: 'Has non-mortgage debt exceeding £1,000'
        }
    ],
    recommendations: [
        {
            scenarioId: 'accelerate_debt_repayment' as ScenarioId,
            confidence: 0.95,
            suggestedParams: {
                monthlyOverpayment: 'profile.monthlyExpenses * 0.15',
                targetDate: 'currentDate + 18 months'
            },
            reasoning: 'High-interest debt (typically 15-30% APR on credit cards) should be eliminated as quickly as possible. The "return" on paying off this debt far exceeds any investment returns. This is the highest priority financial action after establishing a basic emergency fund.',
            calculationTrace: [
                {
                    step: 1,
                    description: 'Calculate aggressive but sustainable monthly payment',
                    formula: 'Monthly expenses × 15%',
                    inputs: {
                        monthlyExpenses: 'profile.monthlyExpenses'
                    },
                    result: 'profile.monthlyExpenses * 0.15',
                    units: '£/month'
                },
                {
                    step: 2,
                    description: 'Set target elimination timeline',
                    formula: '18 months (standard debt elimination timeframe)',
                    result: 'currentDate + 18 months'
                }
            ],
            priority: 95,  // Second highest priority after basic emergency fund
            tags: ['urgent', 'debt_elimination', 'high_return']
        }
    ],
    priority: 95,
    fca_compliant: true,
    tags: ['debt', 'high_interest', 'priority'],
    enabled: true
}

/**
 * All rules registry
 */
export const ALL_RULES: Rule[] = [
    EMERGENCY_FUND_STANDARD,
    ISA_MAXIMIZE,
    PENSION_YOUNG_PROFESSIONAL,
    MORTGAGE_OVERPAYMENT,
    HIGH_INTEREST_DEBT
]

/**
 * Get rules by category
 */
export function getRulesByCategory(category: RuleCategory): Rule[] {
    return ALL_RULES.filter(rule => rule.category === category)
}

/**
 * Get rule by ID
 */
export function getRuleById(id: string): Rule | undefined {
    return ALL_RULES.find(rule => rule.id === id)
}

/**
 * Get enabled rules only
 */
export function getEnabledRules(): Rule[] {
    return ALL_RULES.filter(rule => rule.enabled)
}
