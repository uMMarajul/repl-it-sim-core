import { ScenarioArchetype } from './archetypes'

export interface ArchetypeParameterConfig {
  defaultAmount: number
  defaultDuration: number
  defaultPerformance: number
  defaultStartingAmount: number
  requiresTargetDate: boolean
  requiresStartDate: boolean
  requiresDuration: boolean
  requiresPerformance: boolean
  requiresStartingAmount: boolean
  description: string
  
  // Specific parameters
  incomeMultiplier?: number  // % of investment that returns as monthly income
  incomeDelayMonths?: number  // Months before income benefit starts
}

export const ARCHETYPE_PARAMETER_DEFAULTS: Record<ScenarioArchetype, ArchetypeParameterConfig> = {
  [ScenarioArchetype.ONE_OFF_INFLOW]: {
    defaultAmount: 10000,
    defaultDuration: 1,
    defaultPerformance: 0,
    defaultStartingAmount: 0,
    requiresTargetDate: true,
    requiresStartDate: false,
    requiresDuration: false,
    requiresPerformance: false,
    requiresStartingAmount: false,
    description: 'Single cash inflow (bonus, inheritance, gift)'
  },
  [ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION]: {
    defaultAmount: 5000,
    defaultDuration: 1,
    defaultPerformance: 5,
    defaultStartingAmount: 0,
    requiresTargetDate: true,
    requiresStartDate: false,
    requiresDuration: false,
    requiresPerformance: true,
    requiresStartingAmount: true,
    description: 'One-time lump sum contribution to an account'
  },
  [ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION]: {
    defaultAmount: 10000,
    defaultDuration: 5,
    defaultPerformance: 5,
    defaultStartingAmount: 0,
    requiresTargetDate: true,
    requiresStartDate: true,
    requiresDuration: false,
    requiresPerformance: true,
    requiresStartingAmount: true,
    description: 'Scheduled recurring contributions to accounts'
  },
  [ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL]: {
    defaultAmount: 10000,
    defaultDuration: 1,
    defaultPerformance: 0,
    defaultStartingAmount: 0,
    requiresTargetDate: true,
    requiresStartDate: false,
    requiresDuration: false,
    requiresPerformance: false,
    requiresStartingAmount: false,
    description: 'One-time withdrawal from an account'
  },
  [ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL]: {
    defaultAmount: 24000,
    defaultDuration: 20,
    defaultPerformance: 0,
    defaultStartingAmount: 0,
    requiresTargetDate: false,
    requiresStartDate: true,
    requiresDuration: false,
    requiresPerformance: false,
    requiresStartingAmount: false,
    description: 'Scheduled recurring withdrawals from accounts (e.g., pension drawdown)'
  },
  [ScenarioArchetype.INTEREST_RATE_CHANGE]: {
    defaultAmount: 0,
    defaultDuration: 1,
    defaultPerformance: 3,
    defaultStartingAmount: 0,
    requiresTargetDate: true,
    requiresStartDate: false,
    requiresDuration: false,
    requiresPerformance: true,
    requiresStartingAmount: false,
    description: 'Refinance debt or change account interest rate'
  },
  [ScenarioArchetype.ONE_OFF_EXPENSE]: {
    defaultAmount: 5000,
    defaultDuration: 1,
    defaultPerformance: 0,
    defaultStartingAmount: 0,
    requiresTargetDate: true,
    requiresStartDate: false,
    requiresDuration: false,
    requiresPerformance: false,
    requiresStartingAmount: false,
    description: 'One-time expense at target date'
  },
  [ScenarioArchetype.RECURRING_EXPENSE]: {
    defaultAmount: 3000,
    defaultDuration: 2,
    defaultPerformance: 0,
    defaultStartingAmount: 0,
    requiresTargetDate: false,
    requiresStartDate: true,
    requiresDuration: true,
    requiresPerformance: false,
    requiresStartingAmount: false,
    description: 'Ongoing monthly expense for duration'
  },
  [ScenarioArchetype.RECURRING_INCOME]: {
    defaultAmount: 500,
    defaultDuration: 10,
    defaultPerformance: 0,
    defaultStartingAmount: 0,
    requiresTargetDate: false,
    requiresStartDate: true,
    requiresDuration: true,
    requiresPerformance: false,
    requiresStartingAmount: false,
    description: 'Ongoing monthly income increase for duration'
  },
  [ScenarioArchetype.ALLOCATION_CONFIG_CHANGE]: {
    defaultAmount: 0,
    defaultDuration: 0,
    defaultPerformance: 0,
    defaultStartingAmount: 0,
    requiresTargetDate: false,
    requiresStartDate: true,
    requiresDuration: false,
    requiresPerformance: false,
    requiresStartingAmount: false,
    description: 'Change automated allocation of surplus cash flow to investment accounts'
  },
  [ScenarioArchetype.NEW_DEBT]: {
    defaultAmount: 50000,
    defaultDuration: 5,
    defaultPerformance: 5.5,
    defaultStartingAmount: 0,
    requiresTargetDate: true,
    requiresStartDate: true,
    requiresDuration: true,
    requiresPerformance: true,
    requiresStartingAmount: false,
    description: 'Create new debt account (loan, mortgage, credit card) with interest and monthly payments'
  },
  [ScenarioArchetype.STUDENT_LOAN]: {
    defaultAmount: 45000,
    defaultDuration: 30,
    defaultPerformance: 6.5,
    defaultStartingAmount: 0,
    requiresTargetDate: false,
    requiresStartDate: true,
    requiresDuration: false,
    requiresPerformance: false,
    requiresStartingAmount: false,
    description: 'UK student loan with income-contingent repayment (9% above threshold), automatic write-off after term'
  }
}

export function getArchetypeDefaults(archetype: ScenarioArchetype): ArchetypeParameterConfig {
  return ARCHETYPE_PARAMETER_DEFAULTS[archetype]
}
