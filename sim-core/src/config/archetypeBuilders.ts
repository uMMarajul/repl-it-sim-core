/**
 * ARCHETYPE BUILDER API
 * 
 * Utility functions to construct ScenarioModifier objects from standardized
 * parameter contracts. Reduces boilerplate and ensures consistency.
 * 
 * Wave 1.2: Transformer Builder API
 */

import { ScenarioArchetype } from './archetypes'
import type {
  ScenarioModifier,
  TargetedModifier,
  ConfigModifier,
  StudentLoanModifier,
  OneOffInflowParams,
  OneOffExpenseParams,
  OneOffAccountContributionParams,
  OneOffAccountWithdrawalParams,
  RecurringIncomeParams,
  RecurringExpenseParams,
  RecurringAccountContributionParams,
  RecurringAccountWithdrawalParams,
  AllocationConfigChangeParams,
  InterestRateChangeParams,
  NewDebtParams,
  StudentLoanParams
} from './archetypeContracts'

// ============================================================================
// ONE-OFF BUILDERS
// ============================================================================

/**
 * Build ONE_OFF_INFLOW modifier
 * Example: Inheritance, lottery winnings, bonus
 */
export function buildOneOffInflow(params: OneOffInflowParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.ONE_OFF_INFLOW,
    targetAmount: params.targetAmount,
    targetDate: params.targetDate,
    startDate: params.startDate,
    assumptions: params.assumptions || {}
  }
}

/**
 * Build ONE_OFF_EXPENSE modifier
 * Example: Wedding, medical emergency, equipment purchase
 */
export function buildOneOffExpense(params: OneOffExpenseParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.ONE_OFF_EXPENSE,
    targetAmount: params.targetAmount,
    targetDate: params.targetDate,
    startDate: params.startDate,
    cashFlowBehavior: params.cashFlowBehavior || 'lump_sum_expense',
    assumptions: params.assumptions || {}
  }
}

/**
 * Build ONE_OFF_ACCOUNT_CONTRIBUTION modifier
 * Example: Emergency fund setup, house deposit, asset tracking
 */
export function buildOneOffAccountContribution(params: OneOffAccountContributionParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION,
    targetAmount: params.targetAmount,
    targetDate: params.targetDate,
    startDate: params.startDate,
    startingAmount: params.startingAmount || params.targetAmount,
    performance: params.performance || 0,
    monthlyContribution: params.monthlyContribution || 0,
    cashFlowBehavior: params.cashFlowBehavior,
    linkedAccountName: params.linkedAccountName,
    assumptions: params.assumptions || {}
  }
}

/**
 * Build ONE_OFF_ACCOUNT_WITHDRAWAL modifier
 * Example: Pension lump sum, ISA withdrawal
 */
export function buildOneOffAccountWithdrawal(params: OneOffAccountWithdrawalParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL,
    targetAmount: params.targetAmount,
    targetDate: params.targetDate,
    startDate: params.startDate,
    linkedAccountName: params.linkedAccountName,
    assumptions: params.assumptions || {}
  }
}

// ============================================================================
// RECURRING BUILDERS
// ============================================================================

/**
 * Build RECURRING_INCOME modifier
 * Example: Salary increase, side income, rental income
 */
export function buildRecurringIncome(params: RecurringIncomeParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.RECURRING_INCOME,
    targetAmount: params.targetAmount,
    amountInterpretation: params.amountInterpretation || 'monthly',
    monthlyContribution: params.monthlyContribution,
    targetDate: params.targetDate,
    startDate: params.startDate,
    duration: params.duration,
    frequency: params.frequency,
    incomeType: params.incomeType,
    assumptions: params.assumptions || {}
  }
}

/**
 * Build RECURRING_EXPENSE modifier
 * Example: Childcare costs, elder care, ongoing medical
 */
export function buildRecurringExpense(params: RecurringExpenseParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.RECURRING_EXPENSE,
    targetAmount: params.targetAmount,
    amountInterpretation: params.amountInterpretation || 'monthly',
    monthlyContribution: params.monthlyContribution,
    targetDate: params.targetDate,
    startDate: params.startDate,
    duration: params.duration,
    frequency: params.frequency,
    cashFlowBehavior: params.cashFlowBehavior,
    startingAmount: params.startingAmount,
    performance: params.performance,
    assumptions: params.assumptions || {}
  }
}

/**
 * Build RECURRING_ACCOUNT_CONTRIBUTION modifier
 * Example: Regular pension contributions, savings plan
 */
export function buildRecurringAccountContribution(params: RecurringAccountContributionParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION,
    targetAmount: params.targetAmount,
    monthlyContribution: params.monthlyContribution,
    targetDate: params.targetDate,
    startDate: params.startDate,
    duration: params.duration,
    frequency: params.frequency,
    startingAmount: params.startingAmount,
    performance: params.performance,
    linkedAccountName: params.linkedAccountName,
    assumptions: params.assumptions || {}
  }
}

/**
 * Build RECURRING_ACCOUNT_WITHDRAWAL modifier
 * Example: Pension drawdown, ISA regular withdrawals
 */
export function buildRecurringAccountWithdrawal(params: RecurringAccountWithdrawalParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL,
    targetAmount: params.targetAmount,
    monthlyContribution: params.monthlyContribution,
    targetDate: params.targetDate,
    startDate: params.startDate,
    duration: params.duration,
    frequency: params.frequency,
    linkedAccountName: params.linkedAccountName,
    assumptions: params.assumptions || {}
  }
}

// ============================================================================
// SPECIAL BUILDERS
// ============================================================================

/**
 * Build ALLOCATION_CONFIG_CHANGE modifier (ConfigModifier)
 * Example: Portfolio switch, pension top-up, quit job
 * 
 * Note: No targetAmount/targetDate needed - this is a configuration change
 */
export function buildAllocationConfigChange(params: AllocationConfigChangeParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.ALLOCATION_CONFIG_CHANGE,
    startDate: params.startDate,
    assumptions: {
      ...(params.assumptions || {}),
      ...(params.allocationPercentages && { automatedAllocationPercentages: params.allocationPercentages }),
      ...(params.salaryIncome !== undefined && { salaryIncome: params.salaryIncome }),
      ...(params.pensionPlan && { pensionPlan: params.pensionPlan })
    }
  }
}

/**
 * Build INTEREST_RATE_CHANGE modifier (ConfigModifier)
 * Example: Refinance mortgage, market crash/boom
 * 
 * Note: No targetAmount/targetDate needed - this is a rate change configuration
 */
export function buildInterestRateChange(params: InterestRateChangeParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.INTEREST_RATE_CHANGE,
    startDate: params.startDate,
    performance: params.performance,
    linkedAccountName: params.linkedAccountName,
    assumptions: {
      ...(params.assumptions || {}),
      ...(params.rateChangeContext || {})
    }
  }
}

/**
 * Build NEW_DEBT modifier
 * Example: Mortgage, car loan, personal loan
 */
export function buildNewDebt(params: NewDebtParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.NEW_DEBT,
    targetAmount: params.targetAmount,
    monthlyContribution: params.monthlyContribution,
    contributionStopAfterPeriods: params.contributionStopAfterPeriods,
    targetDate: params.targetDate,
    startDate: params.startDate,
    duration: params.duration,
    frequency: params.frequency,
    performance: params.performance,
    linkedAccountName: params.linkedAccountName,
    assumptions: params.assumptions || {}
  }
}

/**
 * Build STUDENT_LOAN modifier (StudentLoanModifier)
 * Example: UK student loan (Plan 1/2/4/5)
 * 
 * Note: No targetAmount/targetDate - loan details stored in assumptions
 */
export function buildStudentLoan(params: StudentLoanParams): ScenarioModifier {
  return {
    id: params.id,
    name: params.name,
    scenarioId: params.scenarioId,
    archetype: ScenarioArchetype.STUDENT_LOAN,
    startDate: params.startDate,
    assumptions: {
      plan: params.plan,
      loanAmount: params.loanAmount,
      interestRate: params.interestRate,
      graduationDate: params.graduationDate,
      writeOffDate: params.writeOffDate,
      ...(params.assumptions || {})
    }
  }
}

// ============================================================================
// MULTI-MODIFIER BUILDER UTILITIES
// ============================================================================

/**
 * Build multiple modifiers with shared scenarioId
 * Useful for multi-component scenarios (business launch, property purchase, etc.)
 */
export function buildMultiModifiers(
  scenarioId: string,
  builders: Array<Omit<TargetedModifier | ConfigModifier | StudentLoanModifier, 'scenarioId'>>
): ScenarioModifier[] {
  return builders.map(builder => ({
    ...builder,
    scenarioId
  })) as ScenarioModifier[]
}

/**
 * Generate unique modifier IDs with consistent naming
 */
export function generateModifierId(
  scenarioId: string,
  component: string,
  suffix?: string
): string {
  const parts = [scenarioId, component]
  if (suffix) parts.push(suffix)
  return parts.join('-')
}

/**
 * Create a modifier name with component description
 */
export function generateModifierName(
  scenarioName: string,
  component: string
): string {
  return `${scenarioName} - ${component}`
}
