import { ScenarioArchetype } from './archetypes'
import { ConfigField } from './configSchema'
import { getDefaultTargetDate } from './defaultDates'

/**
 * Shared Field Library
 * Reusable field definitions that can be used across multiple archetype templates
 */
export const SHARED_FIELDS = {
  // Date & Timing Fields
  startDate: (helpText: string = 'When does this begin?'): ConfigField<Record<string, any>> => ({
    key: 'startDate',
    label: 'Start Date',
    controlType: 'month_year',
    defaultValue: () => new Date(),
    helpText,
    required: true,
    section: 'core'
  }),

  targetDate: (archetype: ScenarioArchetype, helpText: string = 'Target completion date', monthsAhead?: number): ConfigField<Record<string, any>> => ({
    key: 'targetDate',
    label: 'Target Date',
    controlType: 'month_year',
    defaultValue: getDefaultTargetDate(archetype, monthsAhead),
    helpText,
    required: true,
    section: 'core'
  }),

  endDate: (helpText: string = 'When does this end? (Leave blank for ongoing)'): ConfigField<Record<string, any>> => ({
    key: 'endDate',
    label: 'End Date',
    controlType: 'month_year',
    defaultValue: () => new Date(new Date().setFullYear(new Date().getFullYear() + 5)),
    helpText,
    required: false,
    section: 'core'
  }),

  duration: (label: string = 'Duration', defaultYears: number = 1, helpText?: string): ConfigField<Record<string, any>> => ({
    key: 'duration',
    label,
    controlType: 'duration_years',
    defaultValue: defaultYears,
    min: 0.5,
    max: 10,
    step: 0.5,
    helpText,
    section: 'core'
  }),

  // Money Fields
  totalCost: (defaultValue: number = 10000, helpText?: string): ConfigField<Record<string, any>> => ({
    key: 'totalCost',
    label: 'Total Cost',
    controlType: 'currency',
    units: '£',
    defaultValue,
    min: 0,
    max: 1000000,
    step: 100,
    helpText,
    required: true,
    section: 'core'
  }),

  targetAmount: (label: string = 'Target Amount', defaultValue: number = 10000, helpText?: string): ConfigField<Record<string, any>> => ({
    key: 'targetAmount',
    label,
    controlType: 'currency',
    units: '£',
    defaultValue,
    min: 0,
    max: 1000000,
    step: 100,
    helpText,
    required: true,
    section: 'core'
  }),

  monthlyContribution: (defaultValue: number = 500, helpText: string = 'Monthly amount to save'): ConfigField<Record<string, any>> => ({
    key: 'monthlyContribution',
    label: 'Monthly Contribution',
    controlType: 'currency',
    units: '£/month',
    defaultValue,
    min: 0,
    max: 10000,
    step: 50,
    helpText,
    section: 'core'
  }),

  monthlyCost: (defaultValue: number = 500, helpText: string = 'Monthly cost'): ConfigField<Record<string, any>> => ({
    key: 'monthlyCost',
    label: 'Monthly Cost',
    controlType: 'currency',
    units: '£/month',
    defaultValue,
    min: 0,
    max: 20000,
    step: 50,
    helpText,
    required: true,
    section: 'core'
  }),

  // Debt Fields
  currentBalance: (defaultValue: number = 5000, helpText: string = 'Current outstanding balance'): ConfigField<Record<string, any>> => ({
    key: 'currentBalance',
    label: 'Current Balance',
    controlType: 'currency',
    units: '£',
    defaultValue,
    min: 0,
    max: 1000000,
    step: 100,
    helpText,
    required: true,
    section: 'core'
  }),

  interestRate: (defaultValue: number = 5, helpText: string = 'Annual interest rate'): ConfigField<Record<string, any>> => ({
    key: 'interestRate',
    label: 'Interest Rate',
    controlType: 'percentage',
    units: '%',
    defaultValue,
    min: 0,
    max: 30,
    step: 0.1,
    helpText,
    section: 'core'
  }),

  minimumPayment: (defaultValue: number = 100, helpText: string = 'Required minimum monthly payment'): ConfigField<Record<string, any>> => ({
    key: 'minimumPayment',
    label: 'Minimum Payment',
    controlType: 'currency',
    units: '£/month',
    defaultValue,
    min: 0,
    max: 10000,
    step: 10,
    helpText,
    section: 'core'
  }),

  extraPayment: (defaultValue: number = 0, helpText: string = 'Additional payment above minimum'): ConfigField<Record<string, any>> => ({
    key: 'extraPayment',
    label: 'Extra Monthly Payment',
    controlType: 'currency',
    units: '£/month',
    defaultValue,
    min: 0,
    max: 10000,
    step: 50,
    helpText,
    section: 'advanced'
  }),

  // Rate & Percentage Fields
  expectedReturn: (defaultValue: number = 5, helpText: string = 'Expected annual return (%)'): ConfigField<Record<string, any>> => ({
    key: 'expectedReturn',
    label: 'Expected Return',
    controlType: 'percentage',
    units: '%',
    defaultValue,
    min: 0,
    max: 15,
    step: 0.5,
    helpText,
    section: 'advanced'
  }),

  annualIncrease: (defaultValue: number = 3, helpText: string = 'Annual cost increase (inflation)'): ConfigField<Record<string, any>> => ({
    key: 'annualIncrease',
    label: 'Annual Increase',
    controlType: 'percentage',
    units: '%',
    defaultValue,
    min: 0,
    max: 10,
    step: 0.5,
    helpText,
    section: 'advanced'
  }),

  // Selection Fields
  contributionStrategy: (): ConfigField<Record<string, any>> => ({
    key: 'contributionStrategy',
    label: 'How will you save?',
    controlType: 'radio',
    defaultValue: 'monthly',
    choices: [
      { value: 'monthly', label: 'Monthly Savings', description: 'Regular monthly contributions until target date' },
      { value: 'lump_sum', label: 'Lump Sum', description: 'Save the full amount from existing savings' }
    ],
    helpText: 'Choose your saving approach',
    section: 'core'
  }),

  savingsVehicle: (): ConfigField<Record<string, any>> => {
    const defaultChoices = [
      { value: 'cash', label: 'Cash Savings (0-2%)', description: 'Instant access, no risk' },
      { value: 'isa', label: 'Stocks & Shares ISA (5-7%)', description: 'Tax-free growth, moderate risk' },
      { value: 'investment', label: 'General Investment Account (5-7%)', description: 'Taxable, moderate risk' },
      { value: 'pension', label: 'Workplace Pension (6-8%)', description: 'Tax relief + employer match' }
    ]

    return {
      key: 'savingsVehicle',
      label: 'Where will you save?',
      controlType: 'select',
      choices: defaultChoices,
      defaultValue: 'isa',
      helpText: 'Choose investment account type',
      section: 'advanced'
    }
  }
}

/**
 * Archetype Field Templates
 * Standard field configurations for each archetype category
 */
export const ARCHETYPE_FIELD_TEMPLATES: Record<ScenarioArchetype, ConfigField<Record<string, any>>[]> = {
  [ScenarioArchetype.ONE_OFF_INFLOW]: [
    SHARED_FIELDS.targetDate(ScenarioArchetype.ONE_OFF_INFLOW, 'When do you receive this money?', 6),
    SHARED_FIELDS.targetAmount('Amount Received', 10000, 'Total cash inflow'),
    {
      key: 'source',
      label: 'Source',
      controlType: 'select',
      choices: [
        { value: 'bonus', label: 'Work Bonus' },
        { value: 'inheritance', label: 'Inheritance' },
        { value: 'gift', label: 'Gift' },
        { value: 'windfall', label: 'Other Windfall' }
      ],
      defaultValue: 'bonus',
      helpText: 'Where is this money coming from?',
      section: 'core'
    }
  ],

  [ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION]: [
    SHARED_FIELDS.targetDate(ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION, 'When will you make this contribution?', 1),
    SHARED_FIELDS.targetAmount('Contribution Amount', 5000, 'One-time lump sum to contribute'),
    SHARED_FIELDS.expectedReturn(6, 'Expected annual return'),
    SHARED_FIELDS.savingsVehicle()
  ],

  [ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION]: [
    SHARED_FIELDS.startDate('When will you start contributing?'),
    SHARED_FIELDS.endDate('How long will you contribute? (Leave blank for ongoing)'),
    SHARED_FIELDS.monthlyContribution(500, 'Monthly contribution amount'),
    SHARED_FIELDS.expectedReturn(6, 'Expected annual return'),
    SHARED_FIELDS.savingsVehicle()
  ],

  [ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL]: [
    SHARED_FIELDS.targetDate(ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL, 'When will you make this withdrawal?', 12),
    SHARED_FIELDS.targetAmount('Withdrawal Amount', 10000, 'One-time withdrawal amount'),
    {
      key: 'withdrawalSource',
      label: 'Withdrawal Source',
      controlType: 'select',
      choices: [
        { value: 'pension', label: 'Pension' },
        { value: 'isa', label: 'ISA' },
        { value: 'savings', label: 'Savings Account' },
        { value: 'investment', label: 'Investment Account' }
      ],
      defaultValue: 'savings',
      helpText: 'Which account are you withdrawing from?',
      section: 'core'
    }
  ],

  [ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL]: [
    SHARED_FIELDS.startDate('When will you start withdrawing?'),
    SHARED_FIELDS.endDate('How long will you withdraw? (Leave blank for ongoing)'),
    SHARED_FIELDS.monthlyContribution(2000, 'Monthly withdrawal amount'),
    {
      key: 'withdrawalSource',
      label: 'Withdrawal Source',
      controlType: 'select',
      choices: [
        { value: 'pension', label: 'Pension' },
        { value: 'isa', label: 'ISA' },
        { value: 'savings', label: 'Savings Account' },
        { value: 'investment', label: 'Investment Account' }
      ],
      defaultValue: 'pension',
      helpText: 'Which account are you withdrawing from?',
      section: 'core'
    }
  ],

  [ScenarioArchetype.INTEREST_RATE_CHANGE]: [
    SHARED_FIELDS.targetDate(ScenarioArchetype.INTEREST_RATE_CHANGE, 'When does the rate change?', 3),
    SHARED_FIELDS.interestRate(5, 'Current interest rate'),
    {
      key: 'newInterestRate',
      label: 'New Interest Rate',
      controlType: 'percentage',
      units: '%',
      defaultValue: 3,
      min: 0,
      max: 30,
      step: 0.1,
      helpText: 'New interest rate after refinancing/change',
      section: 'core'
    },
    SHARED_FIELDS.currentBalance(50000, 'Account or debt balance affected')
  ],

  [ScenarioArchetype.ONE_OFF_EXPENSE]: [
    SHARED_FIELDS.targetDate(ScenarioArchetype.ONE_OFF_EXPENSE, 'When does this expense occur?', 18),
    SHARED_FIELDS.totalCost(30000, 'Total cost of this expense'),
    SHARED_FIELDS.contributionStrategy(),
    {
      ...SHARED_FIELDS.monthlyContribution(500, 'How much will you save each month?'),
      showIf: (config: any) => config.contributionStrategy === 'monthly'
    }
  ],

  [ScenarioArchetype.RECURRING_EXPENSE]: [
    SHARED_FIELDS.startDate('When does this expense begin?'),
    SHARED_FIELDS.endDate('When does this expense end?'),
    SHARED_FIELDS.monthlyCost(800, 'Monthly cost'),
    SHARED_FIELDS.annualIncrease(3, 'Annual cost increase (inflation)')
  ],

  [ScenarioArchetype.RECURRING_INCOME]: [
    SHARED_FIELDS.startDate('When does this income begin?'),
    {
      key: 'monthlyIncome',
      label: 'Monthly Income',
      controlType: 'currency',
      units: '£/month',
      defaultValue: 500,
      min: 0,
      max: 20000,
      step: 100,
      helpText: 'Additional monthly income',
      required: true,
      section: 'core'
    },
    SHARED_FIELDS.endDate('When does this income end? (Leave blank for permanent)')
  ],

  [ScenarioArchetype.ALLOCATION_CONFIG_CHANGE]: [
    SHARED_FIELDS.startDate('When will you start this allocation strategy?'),
    {
      key: 'allocationPercentage',
      label: 'Allocation Percentage',
      controlType: 'percentage',
      units: '%',
      defaultValue: 100,
      min: 0,
      max: 100,
      step: 5,
      helpText: 'What percentage of surplus cash flow should be allocated?',
      required: true,
      section: 'core'
    },
    SHARED_FIELDS.savingsVehicle()
  ],

  [ScenarioArchetype.NEW_DEBT]: [
    // NEW_DEBT fields are handled by custom transformer in actionEventFields.ts
    // Empty array here since transformer provides all configuration
  ],

  [ScenarioArchetype.STUDENT_LOAN]: [
    // STUDENT_LOAN fields are handled by custom transformer in actionEventFields.ts
    // Empty array here since transformer provides all configuration
  ]
}

/**
 * Helper function to get archetype template with optional field overrides
 */
export function getArchetypeFields(
  archetype: ScenarioArchetype,
  fieldOverrides?: Partial<Record<string, Partial<ConfigField<Record<string, any>>>>>
): ConfigField<Record<string, any>>[] {
  const baseFields = ARCHETYPE_FIELD_TEMPLATES[archetype] || []
  
  if (!fieldOverrides) {
    return baseFields
  }

  return baseFields.map(field => {
    const override = fieldOverrides[field.key]
    if (!override) {
      return field
    }

    return {
      ...field,
      ...override,
      // Preserve function defaults if not overridden
      defaultValue: override.defaultValue !== undefined ? override.defaultValue : field.defaultValue
    }
  })
}

/**
 * Helper function to add extra fields to an archetype template
 */
export function extendArchetypeFields(
  archetype: ScenarioArchetype,
  additionalFields: ConfigField<Record<string, any>>[],
  fieldOverrides?: Partial<Record<string, Partial<ConfigField<Record<string, any>>>>>
): ConfigField<Record<string, any>>[] {
  const baseFields = getArchetypeFields(archetype, fieldOverrides)
  return [...baseFields, ...additionalFields]
}

/**
 * ============================================
 * ACTION & EVENT TEMPLATES
 * ============================================
 * Standardized field patterns for actions and events
 */

/**
 * Action Template Categories
 */
export enum ActionTemplateType {
  INCOME_INCREASE = 'INCOME_INCREASE',           // Salary increases, side income
  EXPENSE_REDUCTION = 'EXPENSE_REDUCTION',       // Reduce spending
  REGULAR_CONTRIBUTION = 'REGULAR_CONTRIBUTION', // Monthly savings/investments
  ONE_TIME_TRANSFER = 'ONE_TIME_TRANSFER',       // Lump sum deposits, transfers
  ACCOUNT_SWITCH = 'ACCOUNT_SWITCH',             // Switch savings/investment accounts
  DEBT_MODIFICATION = 'DEBT_MODIFICATION',       // Refinance, accelerated repayment
  PENSION_ACTION = 'PENSION_ACTION'              // Pension increases, transfers
}

/**
 * Event Template Categories
 */
export enum EventTemplateType {
  INCOME_CHANGE = 'INCOME_CHANGE',     // Job loss, salary changes
  WEALTH_CHANGE = 'WEALTH_CHANGE',     // Inheritance, windfalls
  MARKET_EVENT = 'MARKET_EVENT'        // Market crashes, recoveries
}

/**
 * Action Field Templates
 */
export const ACTION_FIELD_TEMPLATES: Record<ActionTemplateType, ConfigField<Record<string, any>>[]> = {
  /**
   * INCOME_INCREASE Template
   * For: Salary increases, side income, bonuses
   */
  [ActionTemplateType.INCOME_INCREASE]: [
    SHARED_FIELDS.startDate('When does this income change take effect?'),
    {
      key: 'targetAmount',
      label: 'Income Increase',
      controlType: 'currency',
      units: '£/year',
      defaultValue: 5000,
      min: 0,
      max: 100000,
      step: 500,
      helpText: 'Additional annual income',
      required: true,
      section: 'core'
    },
    {
      key: 'isOngoing',
      label: 'Is this permanent?',
      controlType: 'boolean',
      defaultValue: true,
      helpText: 'Permanent income or temporary',
      section: 'core'
    },
    {
      ...SHARED_FIELDS.duration('Duration', 2, 'How long will this income last?'),
      showIf: (config: any) => !config.isOngoing
    }
  ],

  /**
   * EXPENSE_REDUCTION Template
   * For: Reducing monthly spending
   */
  [ActionTemplateType.EXPENSE_REDUCTION]: [
    SHARED_FIELDS.startDate('When will you start reducing expenses?'),
    {
      key: 'targetAmount',
      label: 'Monthly Reduction',
      controlType: 'currency',
      units: '£/month',
      defaultValue: 200,
      min: 0,
      max: 5000,
      step: 50,
      helpText: 'Amount to reduce monthly spending',
      required: true,
      section: 'core'
    }
  ],

  /**
   * REGULAR_CONTRIBUTION Template
   * For: Regular savings, ISA contributions, pension increases
   */
  [ActionTemplateType.REGULAR_CONTRIBUTION]: [
    SHARED_FIELDS.startDate('When will contributions begin?'),
    SHARED_FIELDS.monthlyContribution(500, 'Monthly contribution amount'),
    SHARED_FIELDS.expectedReturn(5, 'Expected annual return on contributions')
  ],

  /**
   * ONE_TIME_TRANSFER Template
   * For: Lump sum deposits, account transfers
   */
  [ActionTemplateType.ONE_TIME_TRANSFER]: [
    SHARED_FIELDS.startDate('When will the transfer occur?'),
    {
      key: 'transferAmount',
      label: 'Transfer Amount',
      controlType: 'currency',
      units: '£',
      defaultValue: 10000,
      min: 0,
      max: 1000000,
      step: 1000,
      helpText: 'Amount to transfer',
      required: true,
      section: 'core'
    }
  ],

  /**
   * ACCOUNT_SWITCH Template
   * For: Switching savings accounts, ISAs, investment platforms
   */
  [ActionTemplateType.ACCOUNT_SWITCH]: [
    SHARED_FIELDS.startDate('When will you switch accounts?'),
    {
      key: 'currentRate',
      label: 'Current Rate/Return',
      controlType: 'percentage',
      units: '%',
      defaultValue: 2,
      min: 0,
      max: 20,
      step: 0.1,
      helpText: 'Current interest rate or return',
      section: 'core'
    },
    {
      key: 'newRate',
      label: 'New Rate/Return',
      controlType: 'percentage',
      units: '%',
      defaultValue: 4,
      min: 0,
      max: 20,
      step: 0.1,
      helpText: 'New account interest rate or return',
      section: 'core'
    }
  ],

  /**
   * DEBT_MODIFICATION Template
   * For: Refinancing, accelerated repayment
   */
  [ActionTemplateType.DEBT_MODIFICATION]: [
    SHARED_FIELDS.startDate('When will this change take effect?'),
    SHARED_FIELDS.currentBalance(50000, 'Current debt balance'),
    SHARED_FIELDS.interestRate(5, 'Current interest rate'),
    {
      key: 'newInterestRate',
      label: 'New Interest Rate',
      controlType: 'percentage',
      units: '%',
      defaultValue: 3,
      min: 0,
      max: 20,
      step: 0.1,
      helpText: 'Interest rate after refinancing',
      section: 'core'
    }
  ],

  /**
   * PENSION_ACTION Template
   * For: Pension contribution increases, transfers
   */
  [ActionTemplateType.PENSION_ACTION]: [
    SHARED_FIELDS.startDate('When will this pension change take effect?'),
    {
      key: 'contributionIncrease',
      label: 'Contribution Increase',
      controlType: 'percentage',
      units: '% of salary',
      defaultValue: 2,
      min: 0,
      max: 20,
      step: 0.5,
      helpText: 'Additional pension contribution',
      section: 'core'
    },
    SHARED_FIELDS.expectedReturn(6, 'Expected pension growth rate')
  ]
}

/**
 * Event Field Templates
 */
export const EVENT_FIELD_TEMPLATES: Record<EventTemplateType, ConfigField<Record<string, any>>[]> = {
  /**
   * INCOME_CHANGE Template
   * For: Job loss, career changes, redundancy
   */
  [EventTemplateType.INCOME_CHANGE]: [
    SHARED_FIELDS.startDate('When does this event occur?'),
    {
      key: 'incomeChange',
      label: 'Income Change',
      controlType: 'currency',
      units: '£/year',
      defaultValue: -30000,
      min: -200000,
      max: 200000,
      step: 1000,
      helpText: 'Positive or negative income change',
      required: true,
      section: 'core'
    },
    SHARED_FIELDS.duration('Duration', 1, 'How long will this last? (0 = permanent)')
  ],

  /**
   * WEALTH_CHANGE Template
   * For: Inheritance, windfalls, large gifts
   */
  [EventTemplateType.WEALTH_CHANGE]: [
    SHARED_FIELDS.startDate('When do you receive this?'),
    {
      key: 'amount',
      label: 'Amount Received',
      controlType: 'currency',
      units: '£',
      defaultValue: 50000,
      min: 0,
      max: 10000000,
      step: 5000,
      helpText: 'Total amount received',
      required: true,
      section: 'core'
    }
  ],

  /**
   * MARKET_EVENT Template
   * For: Market crashes, corrections, volatility
   */
  [EventTemplateType.MARKET_EVENT]: [
    SHARED_FIELDS.startDate('When does this event occur?'),
    {
      key: 'impactPercentage',
      label: 'Portfolio Impact',
      controlType: 'percentage',
      units: '%',
      defaultValue: -20,
      min: -100,
      max: 100,
      step: 5,
      helpText: 'Percentage change in portfolio value',
      required: true,
      section: 'core'
    },
    {
      key: 'recoveryMonths',
      label: 'Recovery Period',
      controlType: 'number',
      units: 'months',
      defaultValue: 12,
      min: 0,
      max: 60,
      step: 3,
      helpText: 'Months to recover to pre-event level',
      section: 'advanced'
    }
  ]
}

/**
 * Helper to get action template fields with overrides
 */
export function getActionTemplateFields(
  templateType: ActionTemplateType,
  fieldOverrides?: Partial<Record<string, Partial<ConfigField<Record<string, any>>>>>
): ConfigField<Record<string, any>>[] {
  const baseFields = ACTION_FIELD_TEMPLATES[templateType] || []
  
  if (!fieldOverrides) {
    return baseFields
  }

  return baseFields.map(field => {
    const override = fieldOverrides[field.key]
    if (!override) {
      return field
    }

    return {
      ...field,
      ...override,
      defaultValue: override.defaultValue !== undefined ? override.defaultValue : field.defaultValue
    }
  })
}

/**
 * Helper to get event template fields with overrides
 */
export function getEventTemplateFields(
  templateType: EventTemplateType,
  fieldOverrides?: Partial<Record<string, Partial<ConfigField<Record<string, any>>>>>
): ConfigField<Record<string, any>>[] {
  const baseFields = EVENT_FIELD_TEMPLATES[templateType] || []
  
  if (!fieldOverrides) {
    return baseFields
  }

  return baseFields.map(field => {
    const override = fieldOverrides[field.key]
    if (!override) {
      return field
    }

    return {
      ...field,
      ...override,
      defaultValue: override.defaultValue !== undefined ? override.defaultValue : field.defaultValue
    }
  })
}

/**
 * Helper to extend action templates with additional fields
 */
export function extendActionTemplateFields(
  templateType: ActionTemplateType,
  additionalFields: ConfigField<Record<string, any>>[],
  fieldOverrides?: Partial<Record<string, Partial<ConfigField<Record<string, any>>>>>
): ConfigField<Record<string, any>>[] {
  const baseFields = getActionTemplateFields(templateType, fieldOverrides)
  return [...baseFields, ...additionalFields]
}

/**
 * Helper to extend event templates with additional fields
 */
export function extendEventTemplateFields(
  templateType: EventTemplateType,
  additionalFields: ConfigField<Record<string, any>>[],
  fieldOverrides?: Partial<Record<string, Partial<ConfigField<Record<string, any>>>>>
): ConfigField<Record<string, any>>[] {
  const baseFields = getEventTemplateFields(templateType, fieldOverrides)
  return [...baseFields, ...additionalFields]
}
