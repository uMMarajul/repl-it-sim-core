import type { ConfigField } from '../../../sim-core/src/config/configSchema'

export interface SimplifiedField extends Omit<ConfigField<any>, 'section' | 'advanced'> {
  helpText?: string
}

export interface SimplifiedTemplate {
  fields: SimplifiedField[]
  guidanceText?: string
}

function getDefaultTargetDate(monthsFromNow: number): Date {
  const date = new Date(2025, 0, 1)
  date.setMonth(date.getMonth() + monthsFromNow)
  return date
}

function getDefaultDateAtAge(targetAge: number, currentAge: number = 34): Date {
  const yearsUntilTarget = targetAge - currentAge
  const date = new Date(2025, 0, 1)
  date.setFullYear(date.getFullYear() + yearsUntilTarget)
  return date
}

/**
 * Extract default values from a simplified template to create initial scenario data
 * This allows scenarios to be immediately active when checkbox is toggled
 * 
 * Wave 3 WIP: Template keys need to be mapped to ScenarioId enum values
 */
export function getDefaultsFromTemplate(scenarioId: string): Record<string, any> | null {
  const template = SIMPLIFIED_TEMPLATES[scenarioId]
  if (!template) {
    return null
  }

  const defaults: Record<string, any> = {}

  for (const field of template.fields) {
    if (field.defaultValue !== undefined) {
      defaults[field.key] = field.defaultValue
    }
  }

  return defaults
}

/**
 * Get a simplified template by scenario ID
 * Wave 3 WIP: Template keys need to be mapped to ScenarioId enum values
 */
export function getTemplate(scenarioId: string): SimplifiedTemplate | null {
  const template = SIMPLIFIED_TEMPLATES[scenarioId]

  // Debug logging to diagnose template lookup issues
  if (!template && scenarioId) {
    console.warn(`[getTemplate] Template not found for "${scenarioId}"`)
    console.log(`[getTemplate] Available template keys:`, Object.keys(SIMPLIFIED_TEMPLATES).slice(0, 10))
  }

  return template || null
}

export const SIMPLIFIED_TEMPLATES: Record<string, SimplifiedTemplate> = {
  'custom_goal': {
    fields: [
      { key: 'scenarioName', label: 'Goal Name', controlType: 'text', defaultValue: 'My Custom Goal', helpText: 'Give your goal a unique name (e.g. Space Trip)' },
      {
        key: 'direction', label: 'Goal Type', controlType: 'radio', defaultValue: 'save',
        choices: [
          { value: 'save', label: 'Save / Invest (Asset)', description: 'Build wealth or save for a purchase' },
          { value: 'spend', label: 'Spend (Expense)', description: 'One-off or recurring cost' },
          { value: 'income', label: 'Income (Inflow)', description: 'Earnings, windfalls, or side hustles' },
          { value: 'debt', label: 'Debt (Loan)', description: 'Take out a loan or credit' },
          { value: 'withdraw', label: 'Withdrawal', description: 'Take money out of savings/pension' }
        ]
      },
      {
        key: 'frequency', label: 'Frequency', controlType: 'radio', defaultValue: 'lump_sum',
        choices: [
          { value: 'lump_sum', label: 'Lump Sum', description: 'One-time event' },
          { value: 'monthly', label: 'Monthly', description: 'Recurring monthly amount' },
          { value: 'both', label: 'Both', description: 'Upfront amount + monthly' }
        ]
      },
      {
        key: 'targetAmount', label: 'Lump Sum Amount', controlType: 'currency', units: '£', defaultValue: 1000,
        helpText: 'One-time amount',
        showIf: (data) => data.frequency === 'lump_sum' || data.frequency === 'both'
      },
      {
        key: 'monthlyAmount', label: 'Monthly Amount', controlType: 'currency', units: '£', defaultValue: 200,
        helpText: 'Recurring monthly amount',
        showIf: (data) => data.frequency === 'monthly' || data.frequency === 'both'
      },
      {
        key: 'sourceAccountId', label: 'From Account (Optional)', controlType: 'account_picker',
        helpText: 'Select account to withdraw from (Defaults to Cash if empty)',
        showIf: (data) => data.direction === 'withdraw'
      },
      { key: 'targetDate', label: 'Target / Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When does this happen?' }
    ],
    guidanceText: 'Create a custom financial goal. Choose whether to Save or Spend, and if it is a One-off or Recurring event.'
  },
  'business_venture': {
    fields: [
      { key: 'startDate', label: 'Launch Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When do you plan to launch?' },
      { key: 'oneOffCosts', label: 'One-Off Setup Costs', controlType: 'currency', units: '£', defaultValue: 20000, helpText: 'Total upfront costs (legal, equipment, marketing, initial inventory)' },
      { key: 'monthlyCosts', label: 'Monthly Running Costs', controlType: 'currency', units: '£/month', defaultValue: 3500, helpText: 'Rent, utilities, supplies, insurance, your salary draw' },
      { key: 'monthlyRevenue', label: 'Target Monthly Revenue (Year 1)', controlType: 'currency', units: '£/month', defaultValue: 8000, helpText: 'Realistic first-year revenue target' },
      { key: 'revenueDelayMonths', label: 'Months Until First Revenue', controlType: 'number', units: 'months', defaultValue: 3, min: 0, max: 24, helpText: 'Ramp-up period before consistent revenue' }
    ],
    guidanceText: 'Simplified business launch planning. Setup costs are one-time expenses. Monthly costs include all operating expenses and your salary. Revenue typically starts after a ramp-up period.'
  },

  'house_deposit_fund': {
    fields: [
      { key: 'targetAmount', label: 'Deposit Goal', controlType: 'currency', units: '£', defaultValue: 50000, helpText: 'Total deposit needed (e.g., 10-20% of property value)' },
      { key: 'targetDate', label: 'Target Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(36), helpText: 'When do you want to wrap up saving?' }
    ],
    guidanceText: 'Save for a property deposit in a high-interest account. Consider Lifetime ISA (LISA) limits (£4k/year) if applicable.'
  },





  'apply_mortgage': {
    fields: [
      { key: 'loanAmount', label: 'Mortgage Amount', controlType: 'currency', units: '£', defaultValue: 280000, helpText: 'Price minus deposit' },
      { key: 'interestRate', label: 'Interest Rate', controlType: 'percentage', units: '%', defaultValue: 4.5, helpText: 'Fixed/variable rate' },
      { key: 'termYears', label: 'Term Length', controlType: 'duration_years', units: 'years', defaultValue: 25, helpText: 'Standard is 25-30 years' },
      { key: 'startDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(24), helpText: 'When does the mortgage start?' }
    ],
    guidanceText: 'Add a mortgage loan. Calculates monthly repayments (principal + interest) automatically.'
  },

  'salary_increase': {
    fields: [
      { key: 'targetAmount', label: 'Annual Raise Amount', controlType: 'currency', units: '£/year', defaultValue: 5000, helpText: 'Increase in annual gross salary' },
      { key: 'startDate', label: 'Effective Date', controlType: 'month_year', defaultValue: new Date(), helpText: 'When does the raise start?' }
    ],
    guidanceText: 'Model a permanent salary increase. Enter the ADDITIONAL amount (e.g. £5k), not the new total.'
  },

  'training': {
    fields: [
      { key: 'startDate', label: 'Course Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When does the program begin?' },
      { key: 'oneOffCosts', label: 'Course Fees & Materials', controlType: 'currency', units: '£', defaultValue: 15000, helpText: 'Total tuition, books, and materials' },
      { key: 'monthlyCosts', label: 'Monthly Living Expenses (if full-time)', controlType: 'currency', units: '£/month', defaultValue: 1200, helpText: 'Extra costs while studying full-time (leave 0 if part-time)' },
      { key: 'durationMonths', label: 'Program Duration', controlType: 'number', units: 'months', defaultValue: 12, min: 1, max: 36, helpText: 'How long is the program?' },
      { key: 'salaryIncreasePercent', label: 'Expected Salary Increase', controlType: 'percentage', units: '%', defaultValue: 20, helpText: 'Post-completion salary uplift' }
    ],
    guidanceText: 'Consider the full cost of education including fees and living expenses, and weigh against expected career benefits.'
  },
  'work_equipment': {
    fields: [
      { key: 'purchaseDate', label: 'Purchase Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When do you need the equipment?' },
      { key: 'totalCost', label: 'Equipment Cost', controlType: 'currency', units: '£', defaultValue: 3000, helpText: 'Total cost of equipment/tools' }
    ],
    guidanceText: 'Professional equipment for work. Claim as business expense if self-employed. Employer may provide equipment allowance.'
  },

  'buy_vehicle': {
    fields: [
      { key: 'purchaseDate', label: 'Purchase Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(24), helpText: 'When do you want to buy?' },
      { key: 'totalCost', label: 'Car Price', controlType: 'currency', units: '£', defaultValue: 25000, helpText: 'Total purchase price' },
      {
        key: 'financingOption', label: 'Payment Method', controlType: 'radio', choices: [
          { value: 'cash', label: 'Pay Cash' },
          { value: 'finance', label: 'Finance/Loan' }
        ], defaultValue: 'cash', helpText: 'How will you pay?'
      }
    ],
    guidanceText: 'Budget for the car purchase and monthly savings needed. Consider insurance, tax, and fuel costs separately.'
  },

  'buy_home': {
    fields: [
      { key: 'purchaseDate', label: 'Target Purchase Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(54), helpText: 'When do you want to buy?' },
      { key: 'propertyPrice', label: 'Property Price', controlType: 'currency', units: '£', defaultValue: 300000, helpText: 'Total property purchase price' },
      { key: 'depositAmount', label: 'Deposit Amount', controlType: 'currency', units: '£', defaultValue: 60000, helpText: 'Cash deposit you will pay (typically 10-20%)' },
      { key: 'interestRate', label: 'Mortgage Rate', controlType: 'percentage', units: '%', defaultValue: 4.5, min: 0, max: 15, helpText: 'Interest rate for the remaining amount' },
      { key: 'termYears', label: 'Mortgage Term', controlType: 'duration_years', units: 'years', defaultValue: 25, min: 5, max: 40, helpText: 'Length of the mortgage' },
      { key: 'annualAppreciation', label: 'Expected Annual Appreciation', controlType: 'percentage', units: '%', defaultValue: 3, min: -5, max: 15, helpText: 'UK property averages 3-5% annually' }
    ],
    guidanceText: 'Purchase a property with a mortgage. The system calculates the mortgage amount (Price - Deposit) and automatically schedules monthly repayments. Property value appreciates over time.'
  },

  'marriage': {
    fields: [
      { key: 'weddingDate', label: 'Wedding Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(18), helpText: 'When is the wedding?' },
      { key: 'totalBudget', label: 'Total Wedding Budget', controlType: 'currency', units: '£', defaultValue: 20000, helpText: 'Venue, catering, photography, outfits, rings, honeymoon' }
    ],
    guidanceText: 'Average UK wedding costs £18-25k. Include venue, catering, photography, attire, rings, and honeymoon. Consider payment schedules and deposits.'
  },

  'emergency_fund': {
    fields: [
      { key: 'targetAmount', label: 'Target Emergency Fund', controlType: 'currency', units: '£', defaultValue: 15000, helpText: 'Typically 3-6 months of expenses' },
      { key: 'initialTransfer', label: 'Transfer from Existing Cash', controlType: 'currency', units: '£', defaultValue: 0, helpText: 'Optional: Move existing cash to jump-start this fund' }
    ],
    guidanceText: 'Creates Priority 1 savings account with 4.5% HYSA rate. System automatically tops this up from surplus (after debts/pensions/investments) until target reached. Optional: transfer existing cash to jump-start.'
  },

  'debt_consolidation': {
    fields: [
      { key: 'paymentDate', label: 'Payment Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(3), helpText: 'When will you make this payment?' },
      { key: 'lumpSumPayment', label: 'Lump Sum Payment', controlType: 'currency', units: '£', defaultValue: 10000, helpText: 'One-time payment to reduce/clear debt' },
      {
        key: 'debtType', label: 'Debt Type', controlType: 'select', defaultValue: 'credit_card', choices: [
          { value: 'credit_card', label: 'Credit Card / Personal Loan' },
          { value: 'mortgage', label: 'Mortgage Overpayment' }
        ], helpText: 'What type of debt are you paying off?'
      }
    ],
    guidanceText: 'One-time lump sum payment to reduce or clear debt. For ongoing increased payments, use "Accelerate Debt/Mortgage Repayment" action instead.'
  },

  'education_fund': {
    fields: [
      { key: 'targetAmount', label: 'Target Fund Amount', controlType: 'currency', units: '£', defaultValue: 50000, helpText: 'Total needed for university (£9k/year tuition + £8k/year living × 3 years)' },
      { key: 'childAge', label: "Child's Current Age", controlType: 'number', units: 'years', defaultValue: 3, min: 0, max: 17, helpText: 'How old is your child now?' },
      { key: 'universityAge', label: 'University Start Age', controlType: 'number', units: 'years', defaultValue: 18, min: 16, max: 25, helpText: 'When will they start university?' },
      { key: 'initialTransfer', label: 'Transfer from Existing Cash', controlType: 'currency', units: '£', defaultValue: 0, helpText: 'Optional: Move existing cash to jump-start this fund' }
    ],
    guidanceText: 'Creates Priority 2 savings account with 4.5% HYSA rate (filled after emergency fund). System automatically tops up from surplus until target reached. UK university: ~£27k tuition + ~£24k living for 3-year degree.'
  },

  'pension_contribution': {
    fields: [
      { key: 'startDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(1), helpText: 'When to start allocating surplus to pension?' },
      { key: 'allocationPercentage', label: 'Surplus Allocation', controlType: 'percentage', units: '%', defaultValue: 20, min: 0, max: 100, helpText: 'What % of spare cash to allocate to pension?' }
    ],
    guidanceText: 'Automatically redirect spare net cash flow to your pension. Pension contributions get 20% basic rate tax relief automatically (40% for higher rate taxpayers). Annual allowance: £60k. Surplus is allocated AFTER savings goals (emergency fund, etc.).'
  },

  'childbirth': {
    fields: [
      { key: 'dueDate', label: 'Due Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(9), helpText: 'Expected due date' },
      { key: 'oneOffCosts', label: 'One-Off Baby Costs', controlType: 'currency', units: '£', defaultValue: 5000, helpText: 'Pram, cot, car seat, baby clothes, maternity clothes' }
    ],
    guidanceText: 'Budget for initial baby costs: pram, cot, car seat, clothes. Typical one-off costs £3-6k. Consider secondhand items to save money.'
  },

  'ivf_treatment': {
    fields: [
      { key: 'treatmentDate', label: 'Treatment Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When will treatment begin?' },
      { key: 'totalCost', label: 'Total Treatment Cost', controlType: 'currency', units: '£', defaultValue: 15000, helpText: 'Single IVF cycle: £5k, multiple cycles: £10-20k' }
    ],
    guidanceText: 'Private IVF costs £5k per cycle. Success rates vary by age. Budget for 2-3 cycles. Some NHS funding may be available.'
  },

  'elder_care': {
    fields: [
      { key: 'startDate', label: 'Support Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(3), helpText: 'When does support begin?' },
      { key: 'monthlyAmount', label: 'Monthly Support Amount', controlType: 'currency', units: '£/month', defaultValue: 500, helpText: 'Monthly financial support' },
      { key: 'durationYears', label: 'Support Duration', controlType: 'number', units: 'years', defaultValue: 10, min: 1, max: 20, helpText: 'How many years of support?' }
    ],
    guidanceText: 'Plan for ongoing financial support. Consider your own financial stability and retirement plans when committing to long-term support.'
  },

  'sabbatical': {
    fields: [
      { key: 'startDate', label: 'Time Off Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When will you take time off?' },
      { key: 'durationMonths', label: 'Duration (Months)', controlType: 'number', units: 'months', defaultValue: 6, min: 1, max: 24, helpText: 'Sabbatical, career break, or travel?' },
      { key: 'monthlyLivingCosts', label: 'Monthly Expenses During Break', controlType: 'currency', units: '£/month', defaultValue: 2500, helpText: 'Living costs without salary' }
    ],
    guidanceText: 'Plan for career break or sabbatical. Budget for full living expenses plus any travel/project costs during time off.'
  },



  'home_improvement': {
    fields: [
      { key: 'purchaseDate', label: 'Purchase Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When will you make this purchase?' },
      { key: 'totalCost', label: 'Total Cost', controlType: 'currency', units: '£', defaultValue: 5000, helpText: 'Furniture, renovations, home improvements' }
    ],
    guidanceText: 'Budget for furniture, renovations, or home improvements. Consider phasing major work over time.'
  },

  // ===== ACTIONS =====


  'side_income': {
    fields: [
      { key: 'startDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(3), helpText: 'When does side income start?' },
      { key: 'monthlyIncome', label: 'Monthly Side Income', controlType: 'currency', units: '£/month', defaultValue: 1000, helpText: 'Net monthly income from side hustle' },
      { key: 'durationMonths', label: 'Duration (Months)', controlType: 'number', units: 'months', defaultValue: 24, min: 1, max: 120, helpText: 'How long will this continue?' }
    ],
    guidanceText: 'Side income from freelancing, consulting, or part-time work. Remember to account for tax and NI contributions.'
  },
  'reduce_expenses': {
    fields: [
      { key: 'startDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(1), helpText: 'When will you reduce expenses?' },
      { key: 'monthlyReduction', label: 'Monthly Savings', controlType: 'currency', units: '£/month', defaultValue: 300, helpText: 'Monthly expense reduction' },
      { key: 'durationMonths', label: 'Duration (Months)', controlType: 'number', units: 'months', defaultValue: 36, min: 1, max: 120, helpText: 'How long will this last?' }
    ],
    guidanceText: 'Cut unnecessary spending (subscriptions, dining out, utilities). Small changes add up over time.'
  },

  'income_reduction': {
    fields: [
      { key: 'startDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(3), helpText: 'When does your income reduce?' },
      { key: 'scenarioGrossSalary', label: 'New Lower Salary', controlType: 'currency', units: '£/year', defaultValue: 35000, helpText: 'Your reduced annual gross salary' },
      { key: 'durationYears', label: 'Duration (Years)', controlType: 'number', units: 'years', defaultValue: 2, min: 1, max: 10, helpText: 'How long will income be reduced?' }
    ],
    guidanceText: 'Permanent income reduction (e.g., taking a lower-paid role, reducing hours). Net impact calculated after UK tax and NI.'
  },
  'sell_business': {
    fields: [
      { key: 'saleDate', label: 'Sale Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When will you sell the business?' },
      { key: 'saleProceeds', label: 'Sale Proceeds', controlType: 'currency', units: '£', defaultValue: 100000, helpText: 'Expected proceeds from business sale' }
    ],
    guidanceText: 'One-time cash inflow from selling your business. Remember to disable the business scenario to stop recurring cash flows.'
  },
  'quit_job': {
    fields: [
      { key: 'quitDate', label: 'Last Day of Work', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When will you quit your job?' }
    ],
    guidanceText: 'Stops your salary and workplace pension contributions from this date onwards. Other income sources (side income, State pension, rental income, etc.) continue unchanged. Useful for early retirement, career break, or lifestyle change scenarios.'
  },

  'accelerate_debt': {
    fields: [
      { key: 'linkedAccountName', label: 'Debt Account Name', controlType: 'text', defaultValue: 'Mortgage', helpText: 'Enter the exact name of the debt account (case-sensitive)' },
      { key: 'startDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(1), helpText: 'When will you increase payments?' },
      { key: 'extraMonthlyPayment', label: 'Extra Monthly Payment', controlType: 'currency', units: '£/month', defaultValue: 250, helpText: 'Additional amount to pay each month' },
      { key: 'durationYears', label: 'Duration (Years)', controlType: 'number', units: 'years', defaultValue: 2, min: 1, max: 30, helpText: 'How long will you make extra payments?' }
    ],
    guidanceText: 'Accelerate debt repayment by paying extra each month. Reduces total interest paid and clears debt faster. Check for early repayment penalties (common on mortgages). Pairs well with "Pay Off Debt (Lump Sum)" for one-time payments.'
  },

  'refinance_mortgage': {
    fields: [
      { key: 'linkedAccountName', label: 'Debt Account Name', controlType: 'text', defaultValue: 'Mortgage', helpText: 'Enter the exact name of the debt account (case-sensitive)' },
      { key: 'startDate', label: 'Refinance Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(3), helpText: 'When does the new rate take effect?' },
      { key: 'currentRate', label: 'Current Rate (%)', controlType: 'percentage', defaultValue: 4.5, min: 0, max: 30, step: 0.1, helpText: 'Existing interest rate (APR)' },
      { key: 'newRate', label: 'New Rate (%)', controlType: 'percentage', defaultValue: 3.5, min: 0, max: 30, step: 0.1, helpText: 'Refinanced interest rate (APR)' }
    ],
    guidanceText: 'Change the interest rate on an existing debt from a specific date onward. Great for modeling mortgage refinancing or balance transfers. The account name must match exactly (e.g., "Mortgage"). Lower rates reduce interest charges and accelerate debt payoff.'
  },


  'student_loan': {
    fields: [
      {
        key: 'studentLoanPlan', label: 'Student Loan Plan', controlType: 'select', defaultValue: 'plan2', choices: [
          { value: 'plan1', label: 'Plan 1 (Pre-2012, Scotland)' },
          { value: 'plan2', label: 'Plan 2 (2012+, England/Wales)' },
          { value: 'plan4', label: 'Plan 4 (Scotland 2007+)' },
          { value: 'plan5', label: 'Plan 5 (2023+, England/Wales)' }
        ], helpText: 'Your UK student loan plan type'
      },
      { key: 'startDate', label: 'Repayment Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(-12), helpText: 'When did repayments begin? (April after graduation)' },
      { key: 'targetAmount', label: 'Outstanding Balance', controlType: 'currency', units: '£', defaultValue: 45000, min: 1000, max: 200000, helpText: 'Current student loan debt' }
    ],
    guidanceText: 'UK student loan with income-contingent repayment (9% of salary above threshold). Plan 2 threshold: £27,295. Interest: RPI + 0-3% based on income. Written off after 30 years or at age 65. Note: Dynamic payment calculation not yet implemented - placeholder 6.5% interest rate used.'
  },

  'pension_withdrawal_oneoff': {
    fields: [
      {
        key: 'accountType', label: 'Withdraw From', controlType: 'select', defaultValue: 'pension', choices: [
          { value: 'pension', label: 'Pension (25% tax-free, 75% taxed)' },
          { value: 'isa', label: 'ISA (100% tax-free)' }
        ], helpText: 'Which account to withdraw from?'
      },
      { key: 'withdrawalDate', label: 'Withdrawal Date', controlType: 'month_year', defaultValue: getDefaultDateAtAge(67), helpText: 'When will you make this withdrawal? Defaults to age 67 (UK state pension age)' },
      { key: 'withdrawalAmount', label: 'Withdrawal Amount', controlType: 'currency', units: '£', defaultValue: 10000, helpText: 'How much to withdraw?' }
    ],
    guidanceText: 'Withdraw from Pension or ISA. **Pension**: Minimum age 55. **Lifetime allowance**: 25% of total pension pot at first access is tax-free (capped at £268,275), shared across ALL withdrawals. Remaining withdrawals taxed at marginal rate. **Best practice**: First take a one-off 25% tax-free lump sum at retirement (e.g., £50k from £200k pot), then use recurring withdrawals for ongoing drawdown (100% taxed). May trigger MPAA (£10k contribution limit). **ISA**: 100% tax-free at any age, no restrictions.'
  },

  'pension_withdrawal_recurring': {
    fields: [
      {
        key: 'accountType', label: 'Withdraw From', controlType: 'select', defaultValue: 'pension', choices: [
          { value: 'pension', label: 'Pension (taxed at marginal rate)' },
          { value: 'isa', label: 'ISA (100% tax-free)' }
        ], helpText: 'Which account to withdraw from?'
      },
      { key: 'startDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultDateAtAge(67), helpText: 'When to start monthly withdrawals? Defaults to age 67 (UK state pension age)' },
      { key: 'monthlyAmount', label: 'Monthly Withdrawal', controlType: 'currency', units: '£/month', defaultValue: 2000, helpText: 'Monthly withdrawal amount' },
      { key: 'durationYears', label: 'Duration (Years)', controlType: 'number', units: 'years', defaultValue: 20, min: 1, max: 50, helpText: 'How long to continue withdrawals?' }
    ],
    guidanceText: 'Regular monthly withdrawals from Pension or ISA. **Pension**: Minimum age 55. **Lifetime allowance**: 25% of total pension pot at first access is tax-free (capped at £268,275), shared across ALL withdrawals. **Best practice**: Take your 25% tax-free lump sum first (using one-off withdrawal), then use this for ongoing pension drawdown (all subsequent withdrawals taxed at marginal rate). MPAA applies (£10k contribution limit). **ISA**: 100% tax-free at any age.'
  },

  'isa_withdrawal': {
    fields: [
      { key: 'withdrawalDate', label: 'Withdrawal Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When will you withdraw?' },
      { key: 'withdrawalAmount', label: 'Withdrawal Amount', controlType: 'currency', units: '£', defaultValue: 10000, helpText: 'Amount to withdraw' }
    ],
    guidanceText: 'Withdraw from your ISA (tax-free at any time). No age restrictions, no tax implications. You can replace ISA withdrawals in the same tax year without affecting your £20k annual allowance.'
  },
  'sell_asset': {
    fields: [
      { key: 'saleDate', label: 'Sale Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When will the sale complete?' },
      { key: 'saleProceeds', label: 'Expected Sale Proceeds', controlType: 'currency', units: '£', defaultValue: 50000, helpText: 'Total cash you expect to receive' },
      {
        key: 'assetType', label: 'Asset Type', controlType: 'select', defaultValue: 'investment', choices: [
          { value: 'property', label: 'Property (not main residence)' },
          { value: 'vehicle', label: 'Vehicle' },
          { value: 'investment', label: 'Investment Portfolio' },
          { value: 'collectible', label: 'Collectible/Art' }
        ], helpText: 'What type of asset are you selling?'
      }
    ],
    guidanceText: 'Sell an asset and receive cash proceeds. **Tax implications**: Sale of investment property or assets may trigger Capital Gains Tax (CGT) - consult HMRC guidance. Main residence is usually CGT-exempt. Vehicles are typically CGT-exempt. The cash received appears as positive income and can be allocated to savings/investments according to your configured allocation percentages.'
  },

  'start_investing_isa': {
    fields: [
      { key: 'startDate', label: 'Switch Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(1), helpText: 'When to redirect allocations?' },
      {
        key: 'fromAccountType', label: 'Stop Allocating To', controlType: 'select', defaultValue: 'default_savings', choices: [
          { value: 'default_savings', label: 'Cash Savings (0%)' },
          { value: 'general_investment', label: 'General Investment Account (GIA)' },
          { value: 'isa', label: 'Stocks & Shares ISA' },
          { value: 'pension', label: 'Pension' },
          { value: 'hysa', label: 'High-Yield Savings Account' }
        ], helpText: 'Which account type to reduce?'
      },
      {
        key: 'toAccountType', label: 'Start Allocating To', controlType: 'select', defaultValue: 'isa', choices: [
          { value: 'default_savings', label: 'Cash Savings (0%)' },
          { value: 'general_investment', label: 'General Investment Account (GIA)' },
          { value: 'isa', label: 'Stocks & Shares ISA' },
          { value: 'pension', label: 'Pension' },
          { value: 'hysa', label: 'High-Yield Savings Account' }
        ], helpText: 'Which account type to increase?'
      },
      { key: 'allocationPercentage', label: 'Percentage to Redirect', controlType: 'percentage', units: '%', defaultValue: 100, min: 0, max: 100, helpText: 'What % of automated surplus to move?' }
    ],
    guidanceText: 'Redirect future surplus allocation from one account type to another. This ONLY affects NEW contributions going forward - it does NOT move existing balances. Example: Stop allocating surplus to Cash Savings (0%), start allocating to ISA (7%) instead.'
  },

  'transfer_balance': {
    fields: [
      { key: 'transferAmount', label: 'Amount to Transfer', controlType: 'currency', units: '£', defaultValue: 10000, min: 0, max: 10000000, helpText: 'How much to move between accounts?' },
      { key: 'startDate', label: 'Transfer Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(1), helpText: 'When to execute the transfer?' },
      {
        key: 'fromAccountType', label: 'Transfer From', controlType: 'select', defaultValue: 'default_savings', choices: [
          { value: 'default_savings', label: 'Cash Savings (0%)' },
          { value: 'general_investment', label: 'General Investment Account (GIA)' },
          { value: 'isa', label: 'Stocks & Shares ISA' },
          { value: 'pension', label: 'Pension' },
          { value: 'hysa', label: 'High-Yield Savings Account' }
        ], helpText: 'Which account to withdraw from?'
      },
      {
        key: 'toAccountType', label: 'Transfer To', controlType: 'select', defaultValue: 'isa', choices: [
          { value: 'default_savings', label: 'Cash Savings (0%)' },
          { value: 'general_investment', label: 'General Investment Account (GIA)' },
          { value: 'isa', label: 'Stocks & Shares ISA' },
          { value: 'pension', label: 'Pension' },
          { value: 'hysa', label: 'High-Yield Savings Account' }
        ], helpText: 'Which account to deposit into?'
      }
    ],
    guidanceText: 'One-time transfer of existing money from one account to another. This moves your CURRENT balance (e.g., from 0% Cash Savings to 7% ISA). Use "Switch Future Allocation" to change where NEW contributions go.'
  },

  // ===== EVENTS =====
  'job_loss': {
    fields: [
      { key: 'jobLossDate', label: 'Job Loss Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When might job loss occur?' },
      { key: 'unemploymentDuration', label: 'Unemployment Duration', controlType: 'number', units: 'months', defaultValue: 6, min: 1, max: 24, helpText: 'Time until new job found' }
    ],
    guidanceText: 'Simulates income loss while unemployed. Budget using emergency fund. If you receive severance/redundancy pay, add it as a separate "Windfall" event on the same date. Job Seekers Allowance: ~£85/week.'
  },
  'large_windfall': {
    fields: [
      { key: 'inflowDate', label: 'Inflow Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When will you receive it?' },
      {
        key: 'sourceType', label: 'Source Type', controlType: 'select', defaultValue: 'lottery', choices: [
          { value: 'lottery', label: 'Lottery/Gift (tax-free)' },
          { value: 'inheritance', label: 'Inheritance (tax-free to recipient)' },
          { value: 'life_insurance', label: 'Life Insurance Payout (tax-free)' },
          { value: 'asset_sale', label: 'Asset Sale (subject to CGT)' },
          { value: 'employment_bonus', label: 'Employment Bonus (taxed as income)' }
        ], helpText: 'Source determines UK tax treatment'
      },
      { key: 'amount', label: 'Gross Amount', controlType: 'currency', units: '£', defaultValue: 50000, helpText: 'Total amount before tax' },
      { key: 'purchasePrice', label: 'Original Purchase Price (for asset sales)', controlType: 'currency', units: '£', defaultValue: 35000, helpText: 'For CGT calculation on asset sales (20% on gains above £3k exemption). Leave as default for non-asset sales.' }
    ],
    guidanceText: 'Large cash inflow from various sources. UK tax treatment varies: Lottery/gifts/inheritance/insurance are tax-free. Asset sales subject to Capital Gains Tax (20% on gains above £3,000 annual exemption). Employment bonuses taxed as income with NI.'
  },

  'medical_emergency': {
    fields: [
      { key: 'expenseDate', label: 'Expense Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When might this occur?' },
      { key: 'totalCost', label: 'Total Medical Cost', controlType: 'currency', units: '£', defaultValue: 8000, helpText: 'Private treatment or procedure cost' }
    ],
    guidanceText: 'Unexpected medical expenses (private treatment, dental, optical). NHS doesn\'t cover everything.'
  },

  'unexpected_expense': {
    fields: [
      { key: 'repairDate', label: 'Repair Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When might this occur?' },
      { key: 'repairCost', label: 'Repair Cost', controlType: 'currency', units: '£', defaultValue: 2500, helpText: 'Car, boiler, roof, etc.' }
    ],
    guidanceText: 'Unexpected car or property repairs. This is why you need an emergency fund!'
  },
  'cost_of_living_shock': {
    fields: [
      { key: 'reductionDate', label: 'Reduction Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When does the income reduction start?' },
      { key: 'monthlyReduction', label: 'Monthly Income Reduction (Gross)', controlType: 'currency', units: '£/month', defaultValue: 1000, helpText: 'How much less will you earn per month (before tax)?' }
    ],
    guidanceText: 'Permanent reduction in monthly income (e.g., reduced hours, salary cut, part-time work). Enter the gross (before tax) monthly reduction. The simulation will calculate the net impact after tax and NI adjustments.'
  },
  'income_interruption': {
    fields: [
      { key: 'interruptionDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When does the interruption start?' },
      { key: 'monthlyIncomeLost', label: 'Monthly Income Lost (Gross)', controlType: 'currency', units: '£/month', defaultValue: 2000, helpText: 'How much income will you lose per month?' },
      { key: 'durationMonths', label: 'Duration', controlType: 'number', units: 'months', defaultValue: 3, min: 1, max: 24, helpText: 'How long will the interruption last?' }
    ],
    guidanceText: 'Temporary income reduction (sabbatical, unpaid leave, career break, reduced hours). Simulates net income loss after UK tax adjustments.'
  },

  'inheritance': {
    fields: [
      { key: 'receiptDate', label: 'Receipt Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When will you receive it?' },
      { key: 'amount', label: 'Amount', controlType: 'currency', units: '£', defaultValue: 30000, helpText: 'Total amount received' }
    ],
    guidanceText: 'One-time cash lump sum (inheritance, property sale proceeds, settlement). Tax-free unless from employment or asset sale with capital gains.'
  },

  'insurance_payout': {
    fields: [
      { key: 'payoutDate', label: 'Payout Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When will the payout be received?' },
      { key: 'payoutAmount', label: 'Payout Amount', controlType: 'currency', units: '£', defaultValue: 100000, helpText: 'Total life insurance payout amount' }
    ],
    guidanceText: 'Life insurance payout received. Tax-free in the UK. Money is allocated according to your automated allocation settings.'
  },

  'family_illness': {
    fields: [
      { key: 'diagnosisDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When does the illness begin?' },
      { key: 'monthlyCareCosts', label: 'Monthly Care Cost', controlType: 'currency', units: '£/month', defaultValue: 1500, helpText: 'Monthly costs for care, treatment, equipment' },
      { key: 'durationMonths', label: 'Duration', controlType: 'number', units: 'months', defaultValue: 24, min: 1, max: 120, helpText: 'How long will the costs continue?' }
    ],
    guidanceText: 'Ongoing costs for caring for ill family member (private care, equipment, reduced work hours to provide care). NHS provides basic care but private support costs money.'
  },

  'long_term_illness': {
    fields: [
      { key: 'startDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When does the illness begin?' },
      { key: 'monthlyMedicalCosts', label: 'Monthly Care Cost', controlType: 'currency', units: '£/month', defaultValue: 500, helpText: 'Ongoing medical costs' },
      { key: 'durationMonths', label: 'Duration', controlType: 'number', units: 'months', defaultValue: 24, min: 1, max: 120, helpText: 'How long will costs continue?' }
    ],
    guidanceText: 'Covers ongoing medical expenses not covered by NHS or private insurance. Distinct from disability support (income loss).'
  },

  'disability_support': {
    fields: [
      { key: 'diagnosisDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When does the disability begin?' },
      { key: 'monthlyIncomeLost', label: 'Monthly Income Loss (Gross)', controlType: 'currency', units: '£/month', defaultValue: 2000, helpText: 'If unable to work or reduced hours (gross income lost before tax)' }
    ],
    guidanceText: 'Long-term disability affecting income (models net income loss after UK tax). Consider applying for Personal Independence Payment (PIP) and Employment and Support Allowance (ESA) separately. Extra disability costs can be added as a separate "Recurring Expense" scenario.'
  },

  'tax_bill': {
    fields: [
      { key: 'billDate', label: 'Bill Due Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When is the tax bill due?' },
      { key: 'billAmount', label: 'Tax Bill Amount', controlType: 'currency', units: '£', defaultValue: 5000, helpText: 'Total tax owed to HMRC' }
    ],
    guidanceText: 'Unexpected tax bill from HMRC (underpaid tax, self-assessment, capital gains). One-time expense that reduces your savings or investments.'
  },
  'property_damage': {
    fields: [
      { key: 'damageDate', label: 'Damage Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When does the damage occur?' },
      { key: 'repairCost', label: 'Repair Cost', controlType: 'currency', units: '£', defaultValue: 12000, helpText: 'Total repair cost (after insurance excess)' }
    ],
    guidanceText: 'Major property damage (fire, flood, storm). Enter the amount YOU pay after insurance covers the rest. Typical home insurance excess: £100-£500.'
  },
  'market_crash': {
    fields: [
      { key: 'crashDate', label: 'Crash Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When does the market crash occur?' },
      { key: 'portfolioDeclinePercent', label: 'Annual Return Decline', controlType: 'percentage', units: '%', defaultValue: 5, min: 1, max: 10, helpText: 'Annual percentage reduction in investment returns (e.g., 7% → 2%)' }
    ],
    guidanceText: 'Market crash scenario: reduces annual investment returns by specified percentage. Default -5% decline (e.g., baseline 7% → scenario 2%). Conservative: -3%, severe: -8%.'
  },
  'market_boom': {
    fields: [
      { key: 'boomDate', label: 'Boom Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When does the market boom begin?' },
      { key: 'portfolioGainPercent', label: 'Annual Return Boost', controlType: 'percentage', units: '%', defaultValue: 3, min: 1, max: 8, helpText: 'Annual percentage increase in investment returns (e.g., 7% → 10%)' }
    ],
    guidanceText: 'Market boom scenario: increases annual investment returns by specified percentage. Default +3% boost (e.g., baseline 7% → scenario 10%). Conservative: +2%, aggressive: +5%.'
  },

  'interest_rate_increase': {
    fields: [
      { key: 'effectiveDate', label: 'Rate Change Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When does the Bank of England raise rates?' },
      { key: 'percentageIncrease', label: 'Rate Increase', controlType: 'percentage', units: '%', defaultValue: 1, min: 0.25, max: 5, helpText: 'How much do rates increase? (e.g., 1% means 4.5% → 5.5%)' }
    ],
    guidanceText: 'Bank of England raises base rate, increasing mortgage payments and savings returns. Affects variable rate mortgages and savings account interest. Default +1% increase (e.g., 4.5% → 5.5%).'
  },

  'interest_rate_decrease': {
    fields: [
      { key: 'effectiveDate', label: 'Rate Change Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When does the Bank of England cut rates?' },
      { key: 'percentageDecrease', label: 'Rate Decrease', controlType: 'percentage', units: '%', defaultValue: 0.5, min: 0.25, max: 5, helpText: 'How much do rates decrease? (e.g., 0.5% means 4.5% → 4.0%)' }
    ],
    guidanceText: 'Bank of England cuts base rate, reducing mortgage payments but also savings returns. Affects variable rate mortgages and savings account interest. Default -0.5% decrease (e.g., 4.5% → 4.0%).'
  },

  'divorce': {
    fields: [
      { key: 'separationDate', label: 'Separation Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When does the separation occur?' },
      { key: 'settlementCost', label: 'Total Settlement Cost', controlType: 'currency', units: '£', defaultValue: 50000, helpText: 'Legal fees + asset division payment (e.g., buying out partner\'s share of house)' }
    ],
    guidanceText: 'Divorce/separation total costs including legal fees and any settlement payment to ex-partner. Average UK divorce legal costs: £14k. Settlement costs vary widely based on assets.'
  },
  'death_partner': {
    fields: [
      { key: 'deathDate', label: 'Date of Death', controlType: 'month_year', defaultValue: getDefaultTargetDate(12), helpText: 'When does the death occur?' },
      { key: 'monthlyIncomeLost', label: 'Monthly Income Lost', controlType: 'currency', units: '£/month', defaultValue: 3000, helpText: 'How much monthly net income is lost?' },
      { key: 'durationYears', label: 'Years of Income Loss', controlType: 'number', units: 'years', defaultValue: 10, min: 1, max: 30, helpText: 'How long to model the income loss (until retirement/pension starts)?' }
    ],
    guidanceText: 'Death of income earner models ongoing income loss (until survivor retires or gets pension). Model funeral costs and life insurance payouts as separate one-off scenarios. Bereavement Support Payment from DWP: £3.5k upfront + £350/month for 18 months.'
  },
  'fraud_theft': {
    fields: [
      { key: 'fraudDate', label: 'Fraud/Theft Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(6), helpText: 'When does the fraud occur?' },
      { key: 'lossAmount', label: 'Total Financial Loss', controlType: 'currency', units: '£', defaultValue: 8000, helpText: 'Amount lost (after bank reimbursement if any)' }
    ],
    guidanceText: 'Financial fraud or theft (scam, identity theft, burglary). Enter the NET loss after any insurance/bank reimbursement. Banks usually reimburse authorized push payment fraud unless you were negligent.'
  },

  'retirement_drawdown_test': {
    fields: [
      { key: 'startDate', label: 'Drawdown Start Date', controlType: 'month_year', defaultValue: getDefaultDateAtAge(67), helpText: 'When do you start withdrawing?' },
      { key: 'targetAmount', label: 'Monthly Withdrawal Amount', controlType: 'currency', units: '£/month', defaultValue: 2000, helpText: '4% rule: £600k pot = £2k/month sustainable' },
      {
        key: 'accountType', label: 'Account Type', controlType: 'radio', choices: [
          { value: 'pension', label: 'Pension (25% tax-free lump sum available)' },
          { value: 'isa', label: 'ISA (100% tax-free)' }
        ], defaultValue: 'pension', helpText: 'Which account to draw from?'
      }
    ],
    guidanceText: 'Test retirement drawdown strategy. Default: £2k/month from age 67 from pension. 4% rule: withdraw 4% of pot annually for sustainable retirement income. Pension withdrawals: 25% of FIRST withdrawal is tax-free, rest taxed at your marginal rate.'
  },
  'start_investing_gia': {
    fields: [
      { key: 'startDate', label: 'Start Date', controlType: 'month_year', defaultValue: getDefaultTargetDate(1), helpText: 'When do you start investing?' },
      { key: 'monthlyAmount', label: 'Monthly Investment Amount', controlType: 'currency', units: '£/month', defaultValue: 500, helpText: 'How much to invest monthly?' },
      { key: 'allocationPercentage', label: 'Portfolio Allocation to GIA', controlType: 'number', units: '%', defaultValue: 20, min: 0, max: 100, helpText: 'What % of surplus cash goes to General Investment Account?' }
    ],
    guidanceText: 'Start investing in a General Investment Account (GIA). Unlike ISAs, GIAs have no contribution limits but are subject to Capital Gains Tax. Suitable for investors who have maxed out their £20k ISA allowance. Default allocation: 20% to GIA, remainder to other accounts per profile settings.'
  }
}
