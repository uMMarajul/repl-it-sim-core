/**
 * SCENARIO TYPES - Enum Definitions
 * 
 * Separated from scenarioRegistry.ts to avoid circular dependencies.
 * This module contains only the enum definitions with no imports.
 */

// ============================================================================
// THEMATIC ORGANIZATION - 6 USER-CENTRIC THEMES
// ============================================================================

/**
 * ScenarioTheme - Six thematic groupings for financial scenarios
 * 
 * These themes organize scenarios around natural financial planning areas
 * rather than technical implementation details (goals/actions/events).
 */
export enum ScenarioTheme {
  /** Core financial building blocks: emergency funds, savings, debt, pensions, investments */
  FOUNDATIONAL_STABILITY = 'foundational_stability',

  /** Property, vehicles, major assets: buying, selling, mortgages, renovations */
  HOUSING_ASSETS = 'housing_assets',

  /** Life stages, dependents, relationships: marriage, children, education, elder care, divorce */
  FAMILY_CARE = 'family_care',

  /** Salary, job changes, business: income, career moves, business ventures, training */
  CAREER_INCOME = 'career_income',

  /** Medical, insurance, unexpected costs: health events, emergencies, protection */
  HEALTH_PROTECTION = 'health_protection',

  /** External shocks, macro events: market crashes, interest rates, windfalls, withdrawals */
  MARKET_ECONOMIC = 'market_economic'
}

/**
 * Thematic scenario identifiers (replaces GoalType/ActionType/EventType)
 * 
 * New naming convention:
 * - snake_case (e.g., emergency_fund, buy_home)
 * - Descriptive, user-friendly names
 * - No technical prefixes (no "goal_", "action_", "event_")
 */
export enum ScenarioId {
  // FOUNDATIONAL STABILITY (9 scenarios)
  EMERGENCY_FUND = 'emergency_fund',
  HOUSE_DEPOSIT_FUND = 'house_deposit_fund',
  DEBT_CONSOLIDATION = 'debt_consolidation',
  ACCELERATE_DEBT = 'accelerate_debt',
  STUDENT_LOAN = 'student_loan',
  PENSION_CONTRIBUTION = 'pension_contribution',
  START_INVESTING_ISA = 'start_investing_isa',
  START_INVESTING_GIA = 'start_investing_gia',
  TRANSFER_BALANCE = 'transfer_balance',
  CUSTOM_GOAL = 'custom_goal',

  // HOUSING & ASSETS (7 scenarios)
  BUY_HOME = 'buy_home',
  APPLY_MORTGAGE = 'apply_mortgage',
  REFINANCE_MORTGAGE = 'refinance_mortgage',
  HOME_IMPROVEMENT = 'home_improvement',
  BUY_VEHICLE = 'buy_vehicle',
  SELL_ASSET = 'sell_asset',
  PROPERTY_DAMAGE = 'property_damage',

  // FAMILY & CARE (8 scenarios)
  MARRIAGE = 'marriage',
  CHILDBIRTH = 'childbirth',
  IVF_TREATMENT = 'ivf_treatment',
  EDUCATION_FUND = 'education_fund',
  ELDER_CARE = 'elder_care',
  DIVORCE = 'divorce',
  DEATH_PARTNER = 'death_partner',

  // CAREER & INCOME (12 scenarios - includes removed scenarios counted in total reduction)
  SALARY_INCREASE = 'salary_increase',
  SIDE_INCOME = 'side_income',
  REDUCE_EXPENSES = 'reduce_expenses',
  QUIT_JOB = 'quit_job',
  JOB_LOSS = 'job_loss',
  INCOME_REDUCTION = 'income_reduction',
  INCOME_INTERRUPTION = 'income_interruption',
  BUSINESS_VENTURE = 'business_venture',
  SELL_BUSINESS = 'sell_business',
  TRAINING = 'training',
  WORK_EQUIPMENT = 'work_equipment',
  SABBATICAL = 'sabbatical',

  // HEALTH & PROTECTION (7 scenarios)
  MEDICAL_EMERGENCY = 'medical_emergency',
  FAMILY_ILLNESS = 'family_illness',
  LONG_TERM_ILLNESS = 'long_term_illness',
  DISABILITY_SUPPORT = 'disability_support',
  UNEXPECTED_EXPENSE = 'unexpected_expense',
  TAX_BILL = 'tax_bill',
  FRAUD_THEFT = 'fraud_theft',

  // MARKET & ECONOMIC FORCES (12 scenarios)
  MARKET_CRASH = 'market_crash',
  MARKET_BOOM = 'market_boom',
  INTEREST_RATE_INCREASE = 'interest_rate_increase',
  INTEREST_RATE_DECREASE = 'interest_rate_decrease',
  COST_OF_LIVING_SHOCK = 'cost_of_living_shock',
  INHERITANCE = 'inheritance',
  LARGE_WINDFALL = 'large_windfall',
  INSURANCE_PAYOUT = 'insurance_payout',
  PENSION_WITHDRAWAL_ONEOFF = 'pension_withdrawal_oneoff',
  PENSION_WITHDRAWAL_RECURRING = 'pension_withdrawal_recurring',
  ISA_WITHDRAWAL = 'isa_withdrawal',
  RETIREMENT_DRAWDOWN_TEST = 'retirement_drawdown_test',
}
