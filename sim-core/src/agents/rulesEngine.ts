/**
 * Rules Engine - Core Evaluation Logic
 * 
 * Deterministic rule evaluation engine with full traceability.
 * Every decision can be traced back to specific rules and conditions.
 * 
 * @module rulesEngine/core
 */

import {
    Rule,
    RuleContext,
    RuleEvaluationResult,
    RulesEvaluationResult,
    Condition,
    Recommendation,
    ConditionOperator,
    UserProfile,
    CalculationStep
} from './types'

/**
 * Evaluates a single condition against profile data
 */
export function evaluateCondition(
    condition: Condition,
    profile: UserProfile
): boolean {
    const fieldValue = getNestedValue(profile, condition.field)

    switch (condition.operator) {
        case 'gt':
            return fieldValue > condition.value

        case 'gte':
            return fieldValue >= condition.value

        case 'lt':
            return fieldValue < condition.value

        case 'lte':
            return fieldValue <= condition.value

        case 'eq':
            return fieldValue === condition.value

        case 'neq':
            return fieldValue !== condition.value

        case 'between':
            if (!Array.isArray(condition.value) || condition.value.length !== 2) {
                throw new Error(`'between' operator requires array of 2 values`)
            }
            return fieldValue >= condition.value[0] && fieldValue <= condition.value[1]

        case 'in':
            if (!Array.isArray(condition.value)) {
                throw new Error(`'in' operator requires array value`)
            }
            return condition.value.includes(fieldValue)

        case 'exists':
            return fieldValue !== null && fieldValue !== undefined

        case 'matches':
            if (typeof condition.value !== 'string') {
                throw new Error(`'matches' operator requires string regex pattern`)
            }
            const regex = new RegExp(condition.value)
            return regex.test(String(fieldValue))

        default:
            throw new Error(`Unknown operator: ${condition.operator}`)
    }
}

/**
 * Evaluates all conditions in a rule using logical operators
 */
export function evaluateConditions(
    conditions: Condition[],
    profile: UserProfile
): { matched: boolean; matchedConditions: Condition[]; failedConditions: Condition[] } {
    const matchedConditions: Condition[] = []
    const failedConditions: Condition[] = []

    // Process conditions with AND/OR logic
    let currentResult = true
    let currentOperator: 'AND' | 'OR' = 'AND'

    for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i]
        const conditionResult = evaluateCondition(condition, profile)

        if (conditionResult) {
            matchedConditions.push(condition)
        } else {
            failedConditions.push(condition)
        }

        // Apply logical operator
        if (i === 0) {
            currentResult = conditionResult
        } else {
            if (currentOperator === 'AND') {
                currentResult = currentResult && conditionResult
            } else {
                currentResult = currentResult || conditionResult
            }
        }

        // Set operator for next iteration
        currentOperator = condition.logic || 'AND'
    }

    return {
        matched: currentResult,
        matchedConditions,
        failedConditions
    }
}

/**
 * Evaluates a parameter expression against profile data
 * Supports simple expressions like "profile.monthlyExpenses * 6"
 */
export function evaluateExpression(
    expression: string,
    profile: UserProfile,
    context: RuleContext
): any {
    // If not a string, return as-is (literal value)
    if (typeof expression !== 'string') {
        return expression
    }

    // Check if it's a profile reference
    if (expression.startsWith('profile.')) {
        return getNestedValue(profile, expression)
    }

    // Check if it's a simple math expression
    // For security, we'll only allow basic math operations with profile references
    const mathPattern = /^(profile\.[a-zA-Z0-9_.]+|\d+(?:\.\d+)?)\s*([+\-*/])\s*(profile\.[a-zA-Z0-9_.]+|\d+(?:\.\d+)?)$/
    const match = expression.match(mathPattern)

    if (match) {
        const left = match[1].startsWith('profile.')
            ? getNestedValue(profile, match[1])
            : parseFloat(match[1])
        const operator = match[2]
        const right = match[3].startsWith('profile.')
            ? getNestedValue(profile, match[3])
            : parseFloat(match[3])

        switch (operator) {
            case '+': return left + right
            case '-': return left - right
            case '*': return left * right
            case '/': return right !== 0 ? left / right : 0
        }
    }

    // Special date expressions
    if (expression.includes('currentDate')) {
        // Simple date arithmetic (e.g., "currentDate + 12 months")
        const dateMatch = expression.match(/currentDate\s*\+\s*(\d+)\s*(days?|months?|years?)/)
        if (dateMatch) {
            const amount = parseInt(dateMatch[1])
            const unit = dateMatch[2]
            const date = new Date(context.currentDate)

            if (unit.startsWith('day')) {
                date.setDate(date.getDate() + amount)
            } else if (unit.startsWith('month')) {
                date.setMonth(date.getMonth() + amount)
            } else if (unit.startsWith('year')) {
                date.setFullYear(date.getFullYear() + amount)
            }

            return date.toISOString().split('T')[0] // YYYY-MM-DD format
        }
    }

    // If no pattern matched, return as-is (could be literal string)
    return expression
}

/**
 * Processes recommendations by evaluating parameter expressions
 */
export function processRecommendations(
    recommendations: Recommendation[],
    profile: UserProfile,
    context: RuleContext
): Recommendation[] {
    return recommendations.map(rec => {
        // Evaluate all parameter expressions
        const processedParams: Record<string, any> = {}

        for (const [key, value] of Object.entries(rec.suggestedParams)) {
            processedParams[key] = evaluateExpression(value, profile, context)
        }

        // Process calculation trace
        const processedTrace: CalculationStep[] = rec.calculationTrace.map(step => {
            let result = step.result

            // If result is an expression, evaluate it
            if (typeof result === 'string') {
                result = evaluateExpression(result, profile, context)
            }

            // Process inputs
            const processedInputs: Record<string, any> = {}
            if (step.inputs) {
                for (const [inputKey, inputValue] of Object.entries(step.inputs)) {
                    processedInputs[inputKey] = evaluateExpression(inputValue, profile, context)
                }
            }

            return {
                ...step,
                result,
                inputs: processedInputs
            }
        })

        // Process reasoning text (String Interpolation)
        let processedReasoning = rec.reasoning
        const templateRegex = /{{([^}]+)}}/g
        
        processedReasoning = processedReasoning.replace(templateRegex, (match, expression) => {
            const value = evaluateExpression(expression.trim(), profile, context)
            return formatValueForReasoning(value)
        })

        return {
            ...rec,
            suggestedParams: processedParams,
            calculationTrace: processedTrace,
            reasoning: processedReasoning
        }
    })
}

/**
 * Format values for reasoning text
 */
function formatValueForReasoning(value: any): string {
    if (typeof value === 'number') {
        // Currency formatting for amounts > 100 or non-integers
        if (value >= 100 || value % 1 !== 0) {
            return `£${value.toLocaleString('en-GB')}`
        }
        return value.toString()
    }
    return String(value)
}

/**
 * Evaluates a single rule against the context
 */
export function evaluateRule(
    rule: Rule,
    context: RuleContext
): RuleEvaluationResult {
    // Skip disabled rules
    if (!rule.enabled) {
        return {
            rule,
            matched: false,
            matchedConditions: [],
            failedConditions: rule.conditions,
            recommendations: [],
            timestamp: new Date()
        }
    }

    // Evaluate conditions
    const { matched, matchedConditions, failedConditions } = evaluateConditions(
        rule.conditions,
        context.profile
    )

    // If matched, process recommendations
    const recommendations = matched
        ? processRecommendations(rule.recommendations, context.profile, context)
        : []

    return {
        rule,
        matched,
        matchedConditions,
        failedConditions,
        recommendations,
        timestamp: new Date()
    }
}

/**
 * Evaluates all rules against the context
 */
export function evaluateRules(
    rules: Rule[],
    context: RuleContext
): RulesEvaluationResult {
    const results: RuleEvaluationResult[] = []
    const allRecommendations: Recommendation[] = []

    // Evaluate each rule
    for (const rule of rules) {
        const result = evaluateRule(rule, context)
        results.push(result)

        if (result.matched && result.recommendations.length > 0) {
            allRecommendations.push(...result.recommendations)
        }
    }

    // Sort recommendations by priority (descending) then confidence (descending)
    const sortedRecommendations = allRecommendations.sort((a, b) => {
        if (a.priority !== b.priority) {
            return b.priority - a.priority // Higher priority first
        }
        return b.confidence - a.confidence // Higher confidence first
    })

    // Remove duplicates (same scenarioId)
    const uniqueRecommendations = deduplicateRecommendations(sortedRecommendations)

    return {
        results,
        recommendations: uniqueRecommendations,
        totalRulesEvaluated: rules.length,
        totalRulesMatched: results.filter(r => r.matched).length,
        context
    }
}

/**
 * Removes duplicate recommendations, keeping the highest priority/confidence
 */
function deduplicateRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const seen = new Set<string>()
    const unique: Recommendation[] = []

    for (const rec of recommendations) {
        if (!seen.has(rec.scenarioId)) {
            seen.add(rec.scenarioId)
            unique.push(rec)
        }
    }

    return unique
}

/**
 * Gets a nested value from an object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
    // Remove 'profile.' prefix if present
    const cleanPath = path.startsWith('profile.') ? path.substring(8) : path

    return cleanPath.split('.').reduce((current, key) => {
        return current?.[key]
    }, obj)
}

/**
 * Validates a rule definition
 */
export function validateRule(rule: Rule): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!rule.id) errors.push('Rule must have an id')
    if (!rule.version) errors.push('Rule must have a version')
    if (!rule.name) errors.push('Rule must have a name')
    if (!rule.conditions || rule.conditions.length === 0) {
        errors.push('Rule must have at least one condition')
    }
    if (!rule.recommendations || rule.recommendations.length === 0) {
        errors.push('Rule must have at least one recommendation')
    }

    // Validate conditions
    rule.conditions?.forEach((condition, i) => {
        if (!condition.field) errors.push(`Condition ${i}: missing field`)
        if (!condition.operator) errors.push(`Condition ${i}: missing operator`)
        if (condition.value === undefined) errors.push(`Condition ${i}: missing value`)
    })

    // Validate recommendations
    rule.recommendations?.forEach((rec, i) => {
        if (!rec.scenarioId) errors.push(`Recommendation ${i}: missing scenarioId`)
        if (rec.confidence === undefined || rec.confidence < 0 || rec.confidence > 1) {
            errors.push(`Recommendation ${i}: confidence must be between 0 and 1`)
        }
        if (!rec.reasoning) errors.push(`Recommendation ${i}: missing reasoning`)
    })

    return {
        valid: errors.length === 0,
        errors
    }
}
