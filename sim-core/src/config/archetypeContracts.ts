/**
 * ARCHETYPE PARAMETER CONTRACTS
 * 
 * Standardized TypeScript interfaces defining required and optional parameters
 * for each archetype. This ensures consistency across all transformers.
 * 
 * Wave 1.2: Standardization
 */

import { ScenarioArchetype } from './archetypes'

// ============================================================================
// BASE CONTRACTS
// ============================================================================

/**
 * Common parameters shared across all archetypes
 */
export interface BaseArchetypeParams {
  /** Unique identifier for this modifier */
  id: string
  /** Display name for this modifier */
  name: string
  /** Scenario ID this modifier belongs to */
  scenarioId: string
  /** Archetype type */
  archetype: ScenarioArchetype
  /** Start date for this modifier */
  startDate: Date
  /** Additional context and calculated values */
  assumptions?: Record<string, any>
}

/**
 * Parameters for archetypes with cash-flow targets
 * Used by: ONE_OFF_INFLOW, ONE_OFF_EXPENSE, ONE_OFF_ACCOUNT_CONTRIBUTION, ONE_OFF_ACCOUNT_WITHDRAWAL,
 *          RECURRING_INCOME, RECURRING_EXPENSE, RECURRING_ACCOUNT_CONTRIBUTION, RECURRING_ACCOUNT_WITHDRAWAL,
 *          NEW_DEBT
 */
export interface TargetedArchetypeParams extends BaseArchetypeParams {
  /** Target amount (meaning varies by archetype) */
  targetAmount: number
  /** Target/end date for this modifier */
  targetDate: Date
}

// ============================================================================
// ONE-OFF ARCHETYPES
// ============================================================================

/**
 * ONE_OFF_INFLOW: Single cash inflow (bonus, inheritance, windfall)
 */
export interface OneOffInflowParams extends TargetedArchetypeParams {
  archetype: ScenarioArchetype.ONE_OFF_INFLOW
  // targetAmount and targetDate inherited from TargetedArchetypeParams (required)
}

/**
 * ONE_OFF_EXPENSE: Single expense event
 */
export interface OneOffExpenseParams extends TargetedArchetypeParams {
  archetype: ScenarioArchetype.ONE_OFF_EXPENSE
  // targetAmount and targetDate inherited from TargetedArchetypeParams (required)
  /** How this expense behaves in cash flow */
  cashFlowBehavior?: 'lump_sum_expense' | 'asset' | 'sinking_expense'
}

/**
 * ONE_OFF_ACCOUNT_CONTRIBUTION: Single lump-sum contribution to account
 */
export interface OneOffAccountContributionParams extends TargetedArchetypeParams {
  archetype: ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION
  // targetAmount and targetDate inherited from TargetedArchetypeParams (required)
  /** Starting account balance */
  startingAmount?: number
  /** Annual return rate (%) */
  performance?: number
  /** Monthly contribution (usually 0 for one-off) */
  monthlyContribution?: number
  /** How this contribution behaves in cash flow */
  cashFlowBehavior?: 'lump_sum_expense' | 'asset' | 'sinking_expense'
  /** Optional linked account name for tracking */
  linkedAccountName?: string
}

/**
 * ONE_OFF_ACCOUNT_WITHDRAWAL: Single withdrawal from account
 */
export interface OneOffAccountWithdrawalParams extends TargetedArchetypeParams {
  archetype: ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL
  // targetAmount and targetDate inherited from TargetedArchetypeParams (required)
  /** Account to withdraw from */
  linkedAccountName?: string
}

// ============================================================================
// RECURRING ARCHETYPES
// ============================================================================

/**
 * RECURRING_INCOME: Ongoing income stream
 */
export interface RecurringIncomeParams extends TargetedArchetypeParams {
  archetype: ScenarioArchetype.RECURRING_INCOME
  // targetAmount and targetDate inherited from TargetedArchetypeParams (required)
  /** Monthly income amount */
  monthlyContribution: number
  /** Duration in years */
  duration: number
  /** Frequency of income */
  frequency: 'monthly'
  /** How amount is interpreted */
  amountInterpretation?: 'monthly' | 'total'
  /** Type of income (for tax purposes) */
  incomeType?: 'salary' | 'business'
}

/**
 * RECURRING_EXPENSE: Ongoing expense/commitment
 */
export interface RecurringExpenseParams extends TargetedArchetypeParams {
  archetype: ScenarioArchetype.RECURRING_EXPENSE
  // targetAmount and targetDate inherited from TargetedArchetypeParams (required)
  /** Monthly expense amount */
  monthlyContribution: number
  /** Duration in years */
  duration: number
  /** Frequency of expense */
  frequency: 'monthly'
  /** How amount is interpreted */
  amountInterpretation?: 'monthly' | 'total'
  /** How this expense behaves in cash flow */
  cashFlowBehavior?: 'lump_sum_expense' | 'asset' | 'sinking_expense'
  /** Starting amount (for sinking funds) */
  startingAmount?: number
  /** Performance/return rate (for sinking funds) */
  performance?: number
}

/**
 * RECURRING_ACCOUNT_CONTRIBUTION: Scheduled contributions to account
 */
export interface RecurringAccountContributionParams extends TargetedArchetypeParams {
  archetype: ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION
  // targetAmount and targetDate inherited from TargetedArchetypeParams (required)
  /** Monthly contribution amount */
  monthlyContribution: number
  /** Duration in years */
  duration: number
  /** Frequency of contributions */
  frequency: 'monthly'
  /** Starting account balance */
  startingAmount?: number
  /** Annual return rate (%) */
  performance?: number
  /** Account name for tracking */
  linkedAccountName?: string
}

/**
 * RECURRING_ACCOUNT_WITHDRAWAL: Scheduled withdrawals from account
 */
export interface RecurringAccountWithdrawalParams extends TargetedArchetypeParams {
  archetype: ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL
  // targetAmount and targetDate inherited from TargetedArchetypeParams (required)
  /** Monthly withdrawal amount */
  monthlyContribution: number
  /** Duration in years */
  duration: number
  /** Frequency of withdrawals */
  frequency: 'monthly'
  /** Account to withdraw from */
  linkedAccountName?: string
}

// ============================================================================
// SPECIAL ARCHETYPES
// ============================================================================

/**
 * ALLOCATION_CONFIG_CHANGE: Modify automated surplus allocation
 * Note: This is a ConfigModifier - no targetAmount/targetDate needed
 */
export interface AllocationConfigChangeParams extends BaseArchetypeParams {
  archetype: ScenarioArchetype.ALLOCATION_CONFIG_CHANGE
  // No targetAmount/targetDate - config changes don't have cash-flow targets
  /** Change to salary income (for quit job scenarios) */
  salaryIncome?: number
  /** Pension plan changes */
  pensionPlan?: {
    employer_match?: { rate: number }
    salary_sacrifice?: { rate: number }
    personal_sipp?: { monthlyContribution: number }
  }
  /** New allocation percentages by asset class (stored in assumptions) */
  allocationPercentages?: Record<string, number>
}

/**
 * INTEREST_RATE_CHANGE: Change interest rates on accounts/debts
 * Note: This is a ConfigModifier - no targetAmount/targetDate needed
 */
export interface InterestRateChangeParams extends BaseArchetypeParams {
  archetype: ScenarioArchetype.INTEREST_RATE_CHANGE
  // No targetAmount/targetDate - rate changes don't have cash-flow targets
  /** New interest rate (%) */
  performance: number
  /** Account or asset class to apply rate change to */
  linkedAccountName?: string
  /** Additional context for rate change */
  rateChangeContext?: {
    affectedAccounts?: string[]
    affectedAssetClasses?: string[]
    rateChange?: number
    baselineRate?: number
    newRate?: number
  }
}

/**
 * NEW_DEBT: Create new debt account (mortgage, loan)
 */
export interface NewDebtParams extends TargetedArchetypeParams {
  archetype: ScenarioArchetype.NEW_DEBT
  // targetAmount and targetDate inherited from TargetedArchetypeParams (required)
  /** Monthly payment amount */
  monthlyContribution: number
  /** Loan duration in years */
  duration: number
  /** Payment frequency */
  frequency: 'monthly'
  /** Interest rate (%) */
  performance: number
  /** Number of payments until loan is fully repaid */
  contributionStopAfterPeriods?: number
  /** Account name for debt tracking */
  linkedAccountName?: string
}

/**
 * STUDENT_LOAN: UK student loan with income-contingent repayment
 * Note: This is a StudentLoanModifier - loan details stored in assumptions
 */
export interface StudentLoanParams extends BaseArchetypeParams {
  archetype: ScenarioArchetype.STUDENT_LOAN
  // No targetAmount/targetDate - loan details drive the simulation via assumptions
  /** Loan plan type */
  plan: 'plan1' | 'plan2' | 'plan4' | 'plan5'
  /** Total loan amount */
  loanAmount: number
  /** Interest rate (%) */
  interestRate: number
  /** Graduation date (when repayment starts) */
  graduationDate: Date
  /** Loan write-off date (typically 30 years after graduation) */
  writeOffDate: Date
}

// ============================================================================
// UNION TYPE FOR ALL CONTRACTS
// ============================================================================

/**
 * Union type of all archetype parameter contracts
 */
export type ArchetypeParams =
  | OneOffInflowParams
  | OneOffExpenseParams
  | OneOffAccountContributionParams
  | OneOffAccountWithdrawalParams
  | RecurringIncomeParams
  | RecurringExpenseParams
  | RecurringAccountContributionParams
  | RecurringAccountWithdrawalParams
  | AllocationConfigChangeParams
  | InterestRateChangeParams
  | NewDebtParams
  | StudentLoanParams

/**
 * Type guard to check if params match a specific archetype
 */
export function isArchetypeParams<T extends ArchetypeParams>(
  params: ArchetypeParams,
  archetype: ScenarioArchetype
): params is T {
  return params.archetype === archetype
}

// ============================================================================
// SCENARIO MODIFIER TYPES (Wave 1.2: Discriminated Union)
// ============================================================================

/**
 * Base properties shared by all scenario modifiers
 */
interface BaseModifier {
  id: string
  name: string
  scenarioId?: string  // Groups related modifiers (e.g., "Launch a New Business" groups revenue, costs, setup)
  archetype: ScenarioArchetype
  startDate?: Date
  assumptions?: Record<string, any>
}

/**
 * Modifiers with cash-flow targets (amount to save/spend/invest and target date)
 * Used by: ONE_OFF_INFLOW, ONE_OFF_EXPENSE, ONE_OFF_ACCOUNT_CONTRIBUTION, ONE_OFF_ACCOUNT_WITHDRAWAL,
 *          RECURRING_INCOME, RECURRING_EXPENSE, RECURRING_ACCOUNT_CONTRIBUTION, RECURRING_ACCOUNT_WITHDRAWAL,
 *          NEW_DEBT
 */
export interface TargetedModifier extends BaseModifier {
  archetype: 
    | ScenarioArchetype.ONE_OFF_INFLOW
    | ScenarioArchetype.ONE_OFF_EXPENSE
    | ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION
    | ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL
    | ScenarioArchetype.RECURRING_INCOME
    | ScenarioArchetype.RECURRING_EXPENSE
    | ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION
    | ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL
    | ScenarioArchetype.NEW_DEBT
  
  /** Target amount (total to save/spend/borrow) */
  targetAmount: number
  /** Target/end date for this modifier */
  targetDate: Date
  
  // Cash flow behavior
  cashFlowBehavior?: 'asset' | 'sinking_expense' | 'lump_sum_expense' | 'savings_goal'
  
  // Recurring fields
  duration?: number
  frequency?: 'monthly'
  monthlyContribution?: number
  amountInterpretation?: 'monthly' | 'total'  // Defaults to 'total' for goals, 'monthly' for actions
  contributionStopAfterPeriods?: number  // Stop contributions after N periods (for loan payoff)
  
  // Account fields
  performance?: number
  startingAmount?: number
  linkedAccountName?: string  // Name pattern to match baseline account (e.g., "Mortgage")
  
  // Income type: distinguishes business income (subject to corporation tax) from salary (subject to income tax/NI)
  incomeType?: 'salary' | 'business'  // Defaults to 'salary' for backward compatibility
  
  // Savings goal metadata
  savingsGoalPriority?: number  // Lower number = higher priority (1 = highest, filled first)
  savingsGoalTarget?: number  // Target amount to save (allocator stops contributing once reached)
  savingsGoalType?: 'emergency' | 'education' | 'house_deposit' | 'general'  // Type of savings goal
  
  // Pension withdrawal routing
  pensionWithdrawalRequest?: {
    grossAmount: number  // Gross amount to withdraw (before tax)
    isRecurring: boolean  // One-off or recurring withdrawal
  }
}

/**
 * Configuration modifiers (change allocation, rates, salary, pension plans)
 * Used by: ALLOCATION_CONFIG_CHANGE, INTEREST_RATE_CHANGE
 * 
 * Note: These modifiers don't have targetAmount/targetDate because they represent
 * configuration changes, not cash-flow goals
 */
export interface ConfigModifier extends BaseModifier {
  archetype:
    | ScenarioArchetype.ALLOCATION_CONFIG_CHANGE
    | ScenarioArchetype.INTEREST_RATE_CHANGE
  
  // Rate change fields
  performance?: number
  linkedAccountName?: string  // Account or asset class to apply rate change to
}

/**
 * Student loan modifier (special case with loan-specific fields)
 * Used by: STUDENT_LOAN
 */
export interface StudentLoanModifier extends BaseModifier {
  archetype: ScenarioArchetype.STUDENT_LOAN
  
  // Student loan details stored in assumptions (plan, loanAmount, interestRate, etc.)
  // No targetAmount/targetDate needed - loan details drive the simulation
}

/**
 * Union of all scenario modifier types
 */
export type ScenarioModifier = TargetedModifier | ConfigModifier | StudentLoanModifier

// ============================================================================
// TYPE GUARD FUNCTIONS
// ============================================================================

/**
 * Check if modifier is a TargetedModifier (has targetAmount/targetDate)
 */
export function isTargetedModifier(modifier: ScenarioModifier): modifier is TargetedModifier {
  return modifier.archetype === ScenarioArchetype.ONE_OFF_INFLOW
    || modifier.archetype === ScenarioArchetype.ONE_OFF_EXPENSE
    || modifier.archetype === ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION
    || modifier.archetype === ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL
    || modifier.archetype === ScenarioArchetype.RECURRING_INCOME
    || modifier.archetype === ScenarioArchetype.RECURRING_EXPENSE
    || modifier.archetype === ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION
    || modifier.archetype === ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL
    || modifier.archetype === ScenarioArchetype.NEW_DEBT
}

/**
 * Check if modifier is a ConfigModifier (allocation/rate changes)
 */
export function isConfigModifier(modifier: ScenarioModifier): modifier is ConfigModifier {
  return modifier.archetype === ScenarioArchetype.ALLOCATION_CONFIG_CHANGE
    || modifier.archetype === ScenarioArchetype.INTEREST_RATE_CHANGE
}

/**
 * Check if modifier is a StudentLoanModifier
 */
export function isStudentLoanModifier(modifier: ScenarioModifier): modifier is StudentLoanModifier {
  return modifier.archetype === ScenarioArchetype.STUDENT_LOAN
}
