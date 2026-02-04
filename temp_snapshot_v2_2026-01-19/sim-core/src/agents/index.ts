/**
 * AI Agents Module - Public API
 * 
 * Exports the rules engine, audit trail, and utility functions
 * for GDPR-compliant financial scenario recommendations.
 * 
 * @module agents
 */

// Core engine
export {
    evaluateCondition,
    evaluateConditions,
    evaluateExpression,
    evaluateRule,
    evaluateRules,
    processRecommendations,
    validateRule
} from './rulesEngine'

// Type definitions
export type {
    Rule,
    RuleContext,
    RuleEvaluationResult,
    RulesEvaluationResult,
    Condition,
    Recommendation,
    ConditionOperator,
    LogicOperator,
    UserProfile,
    CalculationStep
} from './types'

export { RuleCategory } from './types'

// Rule definitions
export {
    ALL_RULES,
    EMERGENCY_FUND_STANDARD,
    ISA_MAXIMIZE,
    PENSION_YOUNG_PROFESSIONAL,
    MORTGAGE_OVERPAYMENT,
    HIGH_INTEREST_DEBT,
    getRulesByCategory,
    getRuleById,
    getEnabledRules
} from './ruleDefinitions'

// Audit trail
export {
    AuditTrail,
    InMemoryAuditStore,
    auditTrail,
    AuditEventType,
    GDPRCategory,
    RetentionPolicy,
    UserAction
} from './auditTrail'

export type {
    AuditEntry,
    ExecutionTrace,
    IAuditStore
} from './auditTrail'
