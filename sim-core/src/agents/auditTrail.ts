/**
 * Audit Trail System
 * 
 * GDPR-compliant decision logging for full traceability.
 * All recommendations and user actions are logged with complete provenance.
 * 
 * @module agents/auditTrail
 */

import { Rule, Recommendation, RuleEvaluationResult, RuleContext } from './types'
import { ScenarioId } from '../config/scenarioTypes'

/**
 * Event types for audit log
 */
export enum AuditEventType {
    RULE_EVALUATION = 'rule_evaluation',
    RECOMMENDATION_MADE = 'recommendation_made',
    USER_ACTION = 'user_action',
    SCENARIO_CONFIGURED = 'scenario_configured',
    SCENARIO_ENABLED = 'scenario_enabled',
    SCENARIO_DISABLED = 'scenario_disabled'
}

/**
 * GDPR data categories for retention policies
 */
export enum GDPRCategory {
    NECESSARY = 'necessary',           // Required for service delivery
    ANALYTICS = 'analytics',            // Usage analytics
    PREFERENCES = 'preferences'         // User preferences
}

/**
 * Data retention policies
 */
export enum RetentionPolicy {
    SEVEN_DAYS = '7_days',
    THIRTY_DAYS = '30_days',
    SEVEN_YEARS = '7_years'  // For financial compliance
}

/**
 * User action types
 */
export enum UserAction {
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    MODIFIED = 'modified',
    IGNORED = 'ignored'
}

/**
 * Execution trace for decision provenance
 */
export interface ExecutionTrace {
    /** Rules that were evaluated */
    rulesEvaluated: string[]

    /** Conditions that matched */
    conditionsMatched: string[]

    /** Calculation steps performed */
    calculationSteps: Array<{
        step: number
        description: string
        formula?: string
        result: any
    }>

    /** Final recommendation details */
    finalRecommendation?: Recommendation
}

/**
 * Single audit log entry
 */
export interface AuditEntry {
    /** Unique entry ID */
    id: string

    /** Timestamp (ISO 8601) */
    timestamp: string

    /** User ID (optional, can be anonymized) */
    userId?: string

    /** Session ID for grouping related actions */
    sessionId: string

    /** Event type */
    eventType: AuditEventType

    /** Rule ID (if applicable) */
    ruleId?: string

    /** Rule version (if applicable) */
    ruleVersion?: string

    /** Input data (anonymized/hashed for sensitive fields) */
    inputData: Record<string, any>

    /** Recommendation ID (if applicable) */
    recommendationId?: string

    /** Scenario ID (if applicable) */
    scenarioId?: ScenarioId

    /** Confidence score (if recommendation) */
    confidence?: number

    /** Human-readable reasoning */
    reasoning?: string

    /** Execution trace for full provenance */
    executionTrace?: ExecutionTrace

    /** User action taken (if applicable) */
    userAction?: UserAction

    /** User modifications to recommendation (if applicable) */
    userModifications?: Record<string, any>

    /** GDPR data category */
    gdprCategory: GDPRCategory

    /** Retention policy */
    retentionPolicy: RetentionPolicy

    /** Expiry date based on retention policy */
    expiresAt: string
}

/**
 * Audit trail storage interface
 */
export interface IAuditStore {
    /** Add new audit entry */
    add(entry: AuditEntry): Promise<void>

    /** Get entries by session ID */
    getBySession(sessionId: string): Promise<AuditEntry[]>

    /** Get entries by user ID */
    getByUser(userId: string): Promise<AuditEntry[]>

    /** Get entries for a specific scenario */
    getByScenario(scenarioId: ScenarioId): Promise<AuditEntry[]>

    /** Export audit trail (for GDPR right-to-explanation) */
    export(format: 'json' | 'csv'): Promise<string>

    /** Delete expired entries */
    cleanup(): Promise<number>
}

/**
 * In-memory audit store (for client-side use)
 * In production, this should be backed by secure storage
 */
export class InMemoryAuditStore implements IAuditStore {
    private entries: AuditEntry[] = []

    async add(entry: AuditEntry): Promise<void> {
        this.entries.push(entry)
    }

    async getBySession(sessionId: string): Promise<AuditEntry[]> {
        return this.entries.filter(e => e.sessionId === sessionId)
    }

    async getByUser(userId: string): Promise<AuditEntry[]> {
        return this.entries.filter(e => e.userId === userId)
    }

    async getByScenario(scenarioId: ScenarioId): Promise<AuditEntry[]> {
        return this.entries.filter(e => e.scenarioId === scenarioId)
    }

    async export(format: 'json' | 'csv'): Promise<string> {
        if (format === 'json') {
            return JSON.stringify(this.entries, null, 2)
        }

        // CSV export
        if (this.entries.length === 0) return ''

        const headers = Object.keys(this.entries[0]).join(',')
        const rows = this.entries.map(entry =>
            Object.values(entry).map(v =>
                typeof v === 'object' ? JSON.stringify(v) : v
            ).join(',')
        )

        return [headers, ...rows].join('\n')
    }

    async cleanup(): Promise<number> {
        const now = new Date()
        const before = this.entries.length

        this.entries = this.entries.filter(entry => {
            const expiryDate = new Date(entry.expiresAt)
            return expiryDate > now
        })

        return before - this.entries.length
    }

    // Helper: Get all entries (for debugging)
    getAll(): AuditEntry[] {
        return [...this.entries]
    }

    // Helper: Clear all entries (for testing)
    clear(): void {
        this.entries = []
    }
}

/**
 * Audit trail manager
 */
export class AuditTrail {
    private store: IAuditStore

    constructor(store: IAuditStore = new InMemoryAuditStore()) {
        this.store = store
    }

    /**
     * Log rule evaluation
     */
    async logRuleEvaluation(
        context: RuleContext,
        results: RuleEvaluationResult[]
    ): Promise<string> {
        const entryId = this.generateId()

        const entry: AuditEntry = {
            id: entryId,
            timestamp: new Date().toISOString(),
            userId: context.userId,
            sessionId: context.sessionId,
            eventType: AuditEventType.RULE_EVALUATION,
            inputData: this.anonymizeProfile(context.profile),
            executionTrace: {
                rulesEvaluated: results.map(r => r.rule.id),
                conditionsMatched: results
                    .filter(r => r.matched)
                    .flatMap(r => r.matchedConditions.map(c => c.description || c.field)),
                calculationSteps: []
            },
            gdprCategory: GDPRCategory.NECESSARY,
            retentionPolicy: RetentionPolicy.THIRTY_DAYS,
            expiresAt: this.calculateExpiry(RetentionPolicy.THIRTY_DAYS)
        }

        await this.store.add(entry)
        return entryId
    }

    /**
     * Log recommendation made
     */
    async logRecommendation(
        context: RuleContext,
        recommendation: Recommendation,
        ruleId: string,
        ruleVersion: string
    ): Promise<string> {
        const entryId = this.generateId()

        const entry: AuditEntry = {
            id: entryId,
            timestamp: new Date().toISOString(),
            userId: context.userId,
            sessionId: context.sessionId,
            eventType: AuditEventType.RECOMMENDATION_MADE,
            ruleId,
            ruleVersion,
            inputData: this.anonymizeProfile(context.profile),
            recommendationId: this.generateId(),
            scenarioId: recommendation.scenarioId,
            confidence: recommendation.confidence,
            reasoning: recommendation.reasoning,
            executionTrace: {
                rulesEvaluated: [ruleId],
                conditionsMatched: [],
                calculationSteps: recommendation.calculationTrace,
                finalRecommendation: recommendation
            },
            gdprCategory: GDPRCategory.NECESSARY,
            retentionPolicy: RetentionPolicy.SEVEN_YEARS,  // Financial advice retention
            expiresAt: this.calculateExpiry(RetentionPolicy.SEVEN_YEARS)
        }

        await this.store.add(entry)
        return entryId
    }

    /**
     * Log user action on recommendation
     */
    async logUserAction(
        context: RuleContext,
        scenarioId: ScenarioId,
        action: UserAction,
        modifications?: Record<string, any>
    ): Promise<string> {
        const entryId = this.generateId()

        const entry: AuditEntry = {
            id: entryId,
            timestamp: new Date().toISOString(),
            userId: context.userId,
            sessionId: context.sessionId,
            eventType: AuditEventType.USER_ACTION,
            inputData: {},
            scenarioId,
            userAction: action,
            userModifications: modifications,
            gdprCategory: GDPRCategory.NECESSARY,
            retentionPolicy: RetentionPolicy.SEVEN_YEARS,
            expiresAt: this.calculateExpiry(RetentionPolicy.SEVEN_YEARS)
        }

        await this.store.add(entry)
        return entryId
    }

    /**
     * Get audit trail for a session (for user review)
     */
    async getSessionTrail(sessionId: string): Promise<AuditEntry[]> {
        return this.store.getBySession(sessionId)
    }

    /**
     * Export full audit trail (GDPR right-to-explanation)
     */
    async exportTrail(format: 'json' | 'csv' = 'json'): Promise<string> {
        return this.store.export(format)
    }

    /**
     * Anonymize sensitive profile data
     */
    private anonymizeProfile(profile: any): Record<string, any> {
        // Create a copy with sensitive fields hashed/generalized
        const anonymized: Record<string, any> = {}

        // Keep non-sensitive aggregated data
        if (profile.age) anonymized.ageRange = this.getAgeRange(profile.age)
        if (profile.currentSalary) anonymized.salaryBand = this.getSalaryBand(profile.currentSalary)
        if (profile.monthlyExpenses) anonymized.expensesBand = this.getSalaryBand(profile.monthlyExpenses * 12)

        // Flags are OK to keep
        anonymized.hasEmergencyFund = profile.hasEmergencyFund
        anonymized.hasChildren = profile.hasChildren
        anonymized.riskTolerance = profile.riskTolerance

        return anonymized
    }

    private getAgeRange(age: number): string {
        if (age < 25) return '18-24'
        if (age < 35) return '25-34'
        if (age < 45) return '35-44'
        if (age < 55) return '45-54'
        if (age < 65) return '55-64'
        return '65+'
    }

    private getSalaryBand(salary: number): string {
        if (salary < 20000) return '< £20k'
        if (salary < 40000) return '£20k-£40k'
        if (salary < 60000) return '£40k-£60k'
        if (salary < 100000) return '£60k-£100k'
        return '£100k+'
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    private calculateExpiry(policy: RetentionPolicy): string {
        const now = new Date()

        switch (policy) {
            case RetentionPolicy.SEVEN_DAYS:
                now.setDate(now.getDate() + 7)
                break
            case RetentionPolicy.THIRTY_DAYS:
                now.setDate(now.getDate() + 30)
                break
            case RetentionPolicy.SEVEN_YEARS:
                now.setFullYear(now.getFullYear() + 7)
                break
        }

        return now.toISOString()
    }
}

/**
 * Global audit trail instance (singleton)
 */
export const auditTrail = new AuditTrail()
