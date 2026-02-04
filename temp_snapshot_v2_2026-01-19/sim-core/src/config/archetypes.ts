export enum ScenarioArchetype {
  ONE_OFF_INFLOW = "one_off_inflow",
  ONE_OFF_EXPENSE = "one_off_expense",
  ONE_OFF_ACCOUNT_CONTRIBUTION = "one_off_account_contribution",
  RECURRING_ACCOUNT_CONTRIBUTION = "recurring_account_contribution",
  ONE_OFF_ACCOUNT_WITHDRAWAL = "one_off_account_withdrawal",
  RECURRING_ACCOUNT_WITHDRAWAL = "recurring_account_withdrawal",
  INTEREST_RATE_CHANGE = "interest_rate_change",
  RECURRING_EXPENSE = "recurring_expense",
  RECURRING_INCOME = "recurring_income",
  ALLOCATION_CONFIG_CHANGE = "allocation_config_change",
  NEW_DEBT = "new_debt",
  STUDENT_LOAN = "student_loan"
}

export interface ArchetypeDefinition {
  archetype: ScenarioArchetype
  name: string
  description: string
  cashFlowImpact: 'large_immediate' | 'small_recurring' | 'medium_recurring' | 'one_off' | 'ongoing' | 'neutral'
  netWealthImpact: 'positive_long_term' | 'negative_immediate' | 'neutral' | 'mixed'
}

export const ARCHETYPE_DEFINITIONS: Record<ScenarioArchetype, ArchetypeDefinition> = {
  [ScenarioArchetype.ONE_OFF_INFLOW]: {
    archetype: ScenarioArchetype.ONE_OFF_INFLOW,
    name: "One-Time Inflow",
    description: "Single cash inflow (bonus, inheritance, gift)",
    cashFlowImpact: 'large_immediate',
    netWealthImpact: 'positive_long_term'
  },
  [ScenarioArchetype.ONE_OFF_EXPENSE]: {
    archetype: ScenarioArchetype.ONE_OFF_EXPENSE,
    name: "One-Time Outflow",
    description: "Single expense event",
    cashFlowImpact: 'one_off',
    netWealthImpact: 'negative_immediate'
  },
  [ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION]: {
    archetype: ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION,
    name: "One-Time Account Contribution",
    description: "Single lump-sum contribution to an account",
    cashFlowImpact: 'one_off',
    netWealthImpact: 'positive_long_term'
  },
  [ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION]: {
    archetype: ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION,
    name: "Recurring Account Contribution",
    description: "Scheduled recurring contributions to specific accounts",
    cashFlowImpact: 'small_recurring',
    netWealthImpact: 'positive_long_term'
  },
  [ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL]: {
    archetype: ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL,
    name: "One-Time Account Withdrawal",
    description: "Single withdrawal from an account",
    cashFlowImpact: 'one_off',
    netWealthImpact: 'negative_immediate'
  },
  [ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL]: {
    archetype: ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL,
    name: "Recurring Account Withdrawal",
    description: "Scheduled recurring withdrawals from accounts (e.g., pension drawdown)",
    cashFlowImpact: 'small_recurring',
    netWealthImpact: 'negative_immediate'
  },
  [ScenarioArchetype.INTEREST_RATE_CHANGE]: {
    archetype: ScenarioArchetype.INTEREST_RATE_CHANGE,
    name: "Interest Rate Change",
    description: "Refinancing debt or moving to different rate account",
    cashFlowImpact: 'neutral',
    netWealthImpact: 'positive_long_term'
  },
  [ScenarioArchetype.RECURRING_EXPENSE]: {
    archetype: ScenarioArchetype.RECURRING_EXPENSE,
    name: "Ongoing Commitment",
    description: "Multi-year obligations",
    cashFlowImpact: 'ongoing',
    netWealthImpact: 'negative_immediate'
  },
  [ScenarioArchetype.RECURRING_INCOME]: {
    archetype: ScenarioArchetype.RECURRING_INCOME,
    name: "Recurring Income",
    description: "Direct increase to monthly cash flow",
    cashFlowImpact: 'small_recurring',
    netWealthImpact: 'positive_long_term'
  },
  [ScenarioArchetype.ALLOCATION_CONFIG_CHANGE]: {
    archetype: ScenarioArchetype.ALLOCATION_CONFIG_CHANGE,
    name: "Allocation Config Change",
    description: "Modify automated surplus allocation percentages",
    cashFlowImpact: 'neutral',
    netWealthImpact: 'positive_long_term'
  },
  [ScenarioArchetype.NEW_DEBT]: {
    archetype: ScenarioArchetype.NEW_DEBT,
    name: "New Debt Account",
    description: "Create a new debt account with interest accrual (loan, mortgage, credit)",
    cashFlowImpact: 'neutral',
    netWealthImpact: 'negative_immediate'
  },
  [ScenarioArchetype.STUDENT_LOAN]: {
    archetype: ScenarioArchetype.STUDENT_LOAN,
    name: "Student Loan",
    description: "UK student loan with income-contingent repayment (9% above threshold)",
    cashFlowImpact: 'small_recurring',
    netWealthImpact: 'negative_immediate'
  }
}

export function getArchetypeDefinition(archetype: ScenarioArchetype): ArchetypeDefinition {
  return ARCHETYPE_DEFINITIONS[archetype]
}
