/**
 * Rules Engine - Core Type Definitions
 * 
 * GDPR-compliant deterministic decision engine for financial scenario recommendations.
 * All recommendations must be traceable, repeatable, and explainable.
 * 
 * @module rulesEngine/types
 */

import { ScenarioId } from '../config/scenarioTypes'

/**
 * Comparison operators for rule conditions
 */
export type ConditionOperator =
    | 'gt'      // Greater than
    | 'gte'     // Greater than or equal
    | 'lt'      // Less than
    | 'lte'     // Less than or equal
    | 'eq'      // Equal
    | 'neq'     // Not equal
    | 'between' // Between two values (inclusive)
    | 'in'      // In array of values
    | 'exists'  // Field exists and is not null/undefined
    | 'matches' // Regex pattern match

/**
 * Logical operators for combining multiple conditions
 */
export type LogicOperator = 'AND' | 'OR'

/**
 * Single condition in a rule
 */
export interface Condition {
    /** Dot-notation path to field in profile data (e.g., "profile.age", "profile.monthlyExpenses") */
    field: string

    /** Comparison operator */
    operator: ConditionOperator

    /** Value to compare against (can be literal or expression) */
    value: any

    /** Optional logic operator for combining with next condition (default: AND) */
    logic?: LogicOperator

    /** Human-readable description of this condition */
    description?: string
}

/**
 * Calculation step for audit trail transparency
 */
export interface CalculationStep {
    /** Step number (for ordering) */
    step: number

    /** Plain English description of what this step does */
    description: string

    /** Formula or logic used (e.g., "monthlyExpenses * 6") */
    formula?: string

    /** Actual values used in calculation */
    inputs?: Record<string, any>

    /** Result of this calculation step */
    result: any

    /** Units for the result (e.g., "£", "months", "percentage") */
    units?: string
}

/**
 * Scenario recommendation with full traceability
 */
export interface Recommendation {
    /** Scenario ID being recommended */
    scenarioId: ScenarioId

    /** Confidence score (0-1) based on how well conditions match */
    confidence: number

    /** Suggested parameter values for the scenario */
    suggestedParams: Record<string, any>

    /** Human-readable explanation of why this is recommended */
    reasoning: string

    /** Step-by-step calculation trace for audit trail */
    calculationTrace: CalculationStep[]

    /** Priority rank (1-100, higher = more important) */
    priority: number

    /** Tags for categorization (e.g., "urgent", "optional", "tax_efficient") */
    tags: string[]
}

/**
 * Rule definition - the core unit of decision logic
 */
export interface Rule {
    /** Unique rule identifier */
    id: string

    /** Rule version for audit trail versioning */
    version: string

    /** Human-readable rule name */
    name: string

    /** Detailed description of what this rule does */
    description: string

    /** Category this rule belongs to */
    category: RuleCategory

    /** Conditions that must be met for this rule to fire */
    conditions: Condition[]

    /** Recommendations to make if conditions are met */
    recommendations: Recommendation[]

    /** Base priority (1-100, higher = more important) */
    priority: number

    /** Whether this rule is FCA compliant */
    fca_compliant: boolean

    /** Tags for filtering and search */
    tags: string[]

    /** Whether this rule is currently active */
    enabled: boolean

    /** Optional metadata */
    metadata?: Record<string, any>
}

/**
 * Rule categories aligned with scenario themes
 */
export enum RuleCategory {
    FOUNDATIONAL_STABILITY = 'foundational_stability',
    HOUSING_ASSETS = 'housing_assets',
    FAMILY_CARE = 'family_care',
    CAREER_INCOME = 'career_income',
    HEALTH_PROTECTION = 'health_protection',
    MARKET_ECONOMIC = 'market_economic',
    TAX_EFFICIENCY = 'tax_efficiency',
    DEBT_OPTIMIZATION = 'debt_optimization',
    RETIREMENT_PLANNING = 'retirement_planning'
}

/**
 * User profile data for rule evaluation
 */
export interface UserProfile {
    // Demographics
    age: number
    retirementAge: number

    // Income & Expenses
    currentSalary: number
    monthlyExpenses: number

    // Assets
    pensionBalance: number
    savingsBalance?: number
    isaBalance?: number
    propertyValue?: number

    // Debts
    mortgageBalance?: number
    mortgageRate?: number
    otherDebtBalance?: number

    // Flags
    hasEmergencyFund?: boolean
    hasChildren?: number
    isMarried?: boolean

    // Risk profile
    riskTolerance?: 'low' | 'medium' | 'high'

    // Additional data (extensible)
    [key: string]: any
}

/**
 * Rule evaluation context
 */
export interface RuleContext {
    /** User profile data */
    profile: UserProfile

    /** Currently enabled scenarios */
    enabledScenarios: ScenarioId[]

    /** Current date for time-based calculations */
    currentDate: Date

    /** Session identifier for audit trail */
    sessionId: string

    /** Optional user identifier (can be anonymized) */
    userId?: string
}

/**
 * Result of evaluating a single rule
 */
export interface RuleEvaluationResult {
    /** Rule that was evaluated */
    rule: Rule

    /** Whether the rule conditions were met */
    matched: boolean

    /** Which conditions were matched */
    matchedConditions: Condition[]

    /** Which conditions failed (for debugging) */
    failedConditions: Condition[]

    /** Recommendations generated (empty if not matched) */
    recommendations: Recommendation[]

    /** Timestamp of evaluation */
    timestamp: Date
}

/**
 * Result of evaluating all rules
 */
export interface RulesEvaluationResult {
    /** All rule evaluation results */
    results: RuleEvaluationResult[]

    /** All recommendations (sorted by priority and confidence) */
    recommendations: Recommendation[]

    /** Total rules evaluated */
    totalRulesEvaluated: number

    /** Number of rules that matched */
    totalRulesMatched: number

    /** Evaluation context */
    context: RuleContext

    /** Audit trail entry ID */
    auditEntryId?: string
}
