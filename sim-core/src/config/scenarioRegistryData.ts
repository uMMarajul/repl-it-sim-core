/**
 * SCENARIO REGISTRY DATA - Complete Catalog of All 54 Financial Scenarios
 * 
 * This module populates the SCENARIO_REGISTRY with metadata for all scenarios
 * organized into 6 user-centric themes.
 * 
 * Migration Status: Wave 1.1 - Registry Population
 */

import { ScenarioTheme, ScenarioId } from './scenarioTypes'
import type { ScenarioDescriptor } from './scenarioRegistry'
import { ScenarioArchetype } from './archetypes'

// ============================================================================
// THEME 1: FOUNDATIONAL STABILITY (9 scenarios)
// ============================================================================

const FOUNDATIONAL_STABILITY_SCENARIOS: ScenarioDescriptor[] = [
  {
    id: ScenarioId.EMERGENCY_FUND,
    displayName: 'Emergency Fund Setup',
    description: 'Build a safety net to cover 3-6 months of essential expenses in a high-yield savings account',
    theme: ScenarioTheme.FOUNDATIONAL_STABILITY,
    archetypes: [ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION],
    isMultiModifier: false,
    tags: ['savings', 'safety-net', 'hysa', 'priority-1'],
    guidanceText: 'Financial advisors recommend 3-6 months of expenses in an accessible emergency fund. This is your first line of defense against unexpected costs.',
  },
  {
    id: ScenarioId.HOUSE_DEPOSIT_FUND,
    displayName: 'Save for House Deposit',
    description: 'Build up savings for a property deposit over time with HYSA returns',
    theme: ScenarioTheme.FOUNDATIONAL_STABILITY,
    archetypes: [ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION],
    isMultiModifier: false,
    tags: ['savings', 'property', 'hysa', 'priority-3'],
    guidanceText: 'Save for a house deposit (typically 10-20% of property value). UK first-time buyers may qualify for Help to Buy ISA or Lifetime ISA with government bonuses.',
  },
  {
    id: ScenarioId.DEBT_CONSOLIDATION,
    displayName: 'Debt Consolidation',
    description: 'Pay off high-interest debt (credit cards, loans, overdrafts) to improve financial health',
    theme: ScenarioTheme.FOUNDATIONAL_STABILITY,
    archetypes: [ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION],
    isMultiModifier: false,
    tags: ['debt', 'consolidation', 'financial-health'],
    guidanceText: 'Consolidate and pay off high-interest debt (credit cards: 20-30% APR, overdrafts: 35-40% APR). Prioritize highest interest rates first.',
  },
  {
    id: ScenarioId.ACCELERATE_DEBT,
    displayName: 'Accelerate Debt Repayment',
    description: 'Make extra payments beyond minimum to pay off debt faster and save on interest',
    theme: ScenarioTheme.FOUNDATIONAL_STABILITY,
    archetypes: [ScenarioArchetype.RECURRING_EXPENSE],
    isMultiModifier: false,
    tags: ['debt', 'overpayment', 'mortgage', 'interest-savings'],
    guidanceText: 'Extra payments beyond minimum reduce principal faster, saving thousands in interest. Most effective on highest-rate debts or short-term mortgage acceleration.',
  },
  {
    id: ScenarioId.STUDENT_LOAN,
    displayName: 'Student Loan (All Plans)',
    description: 'Model UK student loan repayment with income-contingent payments (Plan 1/2/4/5)',
    theme: ScenarioTheme.FOUNDATIONAL_STABILITY,
    archetypes: [ScenarioArchetype.STUDENT_LOAN],
    isMultiModifier: false,
    tags: ['debt', 'student-loan', 'uk-tax', 'income-contingent'],
    guidanceText: 'UK student loans: 9% of income above threshold (Plan 2: £27,295). Written off after 30 years. Interest: RPI + 0-3% based on income.',
  },
  {
    id: ScenarioId.PENSION_CONTRIBUTION,
    displayName: 'Regular Pension Contributions',
    description: 'Increase pension contributions to maximize tax relief and employer matching',
    theme: ScenarioTheme.FOUNDATIONAL_STABILITY,
    archetypes: [ScenarioArchetype.ALLOCATION_CONFIG_CHANGE],
    isMultiModifier: false,
    tags: ['pension', 'retirement', 'tax-relief', 'employer-match'],
    guidanceText: 'UK pension contributions: 20-45% tax relief, employer match (typically 3-5%), annual allowance £60k. Locked until age 55 (rising to 57 in 2028).',
  },
  {
    id: ScenarioId.START_INVESTING_ISA,
    displayName: 'Start Investing (ISA)',
    description: 'Begin tax-free investing in a Stocks & Shares ISA (£20k annual limit)',
    theme: ScenarioTheme.FOUNDATIONAL_STABILITY,
    archetypes: [ScenarioArchetype.ALLOCATION_CONFIG_CHANGE],
    isMultiModifier: false,
    tags: ['investment', 'isa', 'tax-free', 'equities'],
    guidanceText: 'ISA: Tax-free growth and withdrawals, £20k/year limit (April-March). Ideal for long-term investing. Historical equity returns: 7-10% annually.',  // Legacy PORTFOLIO_SWITCH maps to ISA (most common use case),
  },
  {
    id: ScenarioId.START_INVESTING_GIA,
    displayName: 'Start Investing (General Investment Account)',
    description: 'Begin investing in a General Investment Account (taxable, no contribution limits)',
    theme: ScenarioTheme.FOUNDATIONAL_STABILITY,
    archetypes: [ScenarioArchetype.ALLOCATION_CONFIG_CHANGE],
    isMultiModifier: false,
    tags: ['investment', 'gia', 'taxable', 'capital-gains'],
    guidanceText: 'GIA: No contribution limits, but subject to Capital Gains Tax (£3k annual allowance). Use after maxing ISA allowance.',  // No legacy mapping (new split from PORTFOLIO_SWITCH),  // Allocation changes are actions,  // Uses archetype defaults, not legacy transformers
    isNew: true
  },
  {
    id: ScenarioId.TRANSFER_BALANCE,
    displayName: 'Transfer Portfolio Balance',
    description: 'Move existing investment balance from one account type to another',
    theme: ScenarioTheme.FOUNDATIONAL_STABILITY,
    archetypes: [ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION],
    isMultiModifier: false,
    tags: ['transfer', 'portfolio', 'rebalance'],
    guidanceText: 'Transfer existing balances between accounts (e.g., GIA → ISA, Cash → Investment). May trigger CGT on gains outside ISA/pension.',
  },
  {
    id: ScenarioId.CUSTOM_GOAL,
    displayName: 'Custom Goal',
    description: 'Create a unique financial goal with your own name and parameters',
    theme: ScenarioTheme.FOUNDATIONAL_STABILITY,
    archetypes: [
      ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION,
      ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION,
      ScenarioArchetype.ONE_OFF_EXPENSE,
      ScenarioArchetype.RECURRING_EXPENSE,
      ScenarioArchetype.ONE_OFF_INFLOW,
      ScenarioArchetype.RECURRING_INCOME,
      ScenarioArchetype.NEW_DEBT,
      ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL,
      ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL
    ],
    isMultiModifier: true,
    tags: ['custom', 'unique', 'goal', 'savings', 'expense'],
    guidanceText: 'Define your own financial goal. Give it a unique name (e.g., "Space Trip") and set your target amount and date.'
  }
]

// ============================================================================
// THEME 2: HOUSING & ASSETS (7 scenarios)
// ============================================================================

const HOUSING_ASSETS_SCENARIOS: ScenarioDescriptor[] = [
  {
    id: ScenarioId.BUY_HOME,
    displayName: 'Buy First Home',
    description: 'Purchase property with deposit, stamp duty, and fees - tracks property appreciation',
    theme: ScenarioTheme.HOUSING_ASSETS,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE, ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION],
    isMultiModifier: true,
    tags: ['property', 'purchase', 'asset', 'appreciation', 'stamp-duty'],
    guidanceText: 'UK property purchase: 10-20% deposit + 2-5% stamp duty + 2-3% fees (solicitor, survey). Property value appreciates ~3-5% annually (varies by region).',
  },
  {
    id: ScenarioId.APPLY_MORTGAGE,
    displayName: 'Apply for Mortgage/Loan',
    description: 'Take out a mortgage or loan with monthly repayments and interest',
    theme: ScenarioTheme.HOUSING_ASSETS,
    archetypes: [ScenarioArchetype.NEW_DEBT, ScenarioArchetype.ONE_OFF_INFLOW],
    isMultiModifier: true,
    tags: ['mortgage', 'loan', 'debt', 'interest', 'amortization'],
    guidanceText: 'UK mortgages: Typically 3-6% interest, 25-35 year terms. Fixed rates (2-5 years) or variable. Overpayment typically allowed (10% per year).',
  },
  {
    id: ScenarioId.REFINANCE_MORTGAGE,
    displayName: 'Remortgage / Refinance',
    description: 'Switch to a lower interest rate mortgage to reduce monthly payments',
    theme: ScenarioTheme.HOUSING_ASSETS,
    archetypes: [ScenarioArchetype.INTEREST_RATE_CHANGE],
    isMultiModifier: false,
    tags: ['mortgage', 'refinance', 'interest-rate', 'savings'],
    guidanceText: 'Remortgaging when fixed term ends can save hundreds per month. Refinance fees: £1-2k. Savings depend on rate difference (e.g., 5% → 3.5% = significant).',
  },
  {
    id: ScenarioId.HOME_IMPROVEMENT,
    displayName: 'Home Improvement / Renovation',
    description: 'Renovate or improve your property (kitchen, extension, loft conversion)',
    theme: ScenarioTheme.HOUSING_ASSETS,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['property', 'renovation', 'improvement', 'expense'],
    guidanceText: 'Home improvements: Kitchen £15-30k, extension £30-60k, loft conversion £25-50k. Adds property value but costs vary widely by region and spec.',
  },
  {
    id: ScenarioId.BUY_VEHICLE,
    displayName: 'Buy Vehicle',
    description: 'Purchase a car or vehicle - tracks depreciation over time',
    theme: ScenarioTheme.HOUSING_ASSETS,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE, ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION],
    isMultiModifier: true,
    tags: ['vehicle', 'car', 'asset', 'depreciation'],
    guidanceText: 'New cars depreciate ~15-35% in year 1, ~10-15% annually thereafter. Running costs: insurance (£500-1500/year), fuel, maintenance, tax.',
  },
  {
    id: ScenarioId.SELL_ASSET,
    displayName: 'Sell Property / Vehicle / Asset',
    description: 'Sell an asset and receive cash proceeds (property, vehicle, investment, collectible)',
    theme: ScenarioTheme.HOUSING_ASSETS,
    archetypes: [ScenarioArchetype.ONE_OFF_INFLOW],
    isMultiModifier: false,
    tags: ['sale', 'asset', 'cash-inflow', 'cgt'],
    guidanceText: 'Asset sales generate cash inflows. Property sales may incur CGT on gains (£3k allowance, 18-28% tax). Enter net proceeds after costs/tax.',
  },
  {
    id: ScenarioId.PROPERTY_DAMAGE,
    displayName: 'Property Damage',
    description: 'Major property damage requiring repairs (fire, flood, storm) - amount after insurance',
    theme: ScenarioTheme.HOUSING_ASSETS,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['property', 'damage', 'emergency', 'insurance'],
    guidanceText: 'Major property damage costs after insurance payout. Typical insurance excess: £100-500. Uninsured costs can be £5k-50k+ depending on damage.',
  }
]

// ============================================================================
// THEME 3: FAMILY & CARE (7 scenarios)
// ============================================================================

const FAMILY_CARE_SCENARIOS: ScenarioDescriptor[] = [
  {
    id: ScenarioId.MARRIAGE,
    displayName: 'Marriage / Civil Partnership',
    description: 'Wedding costs and celebration expenses',
    theme: ScenarioTheme.FAMILY_CARE,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['family', 'wedding', 'celebration'],
    guidanceText: 'UK average wedding: £17-30k (venue, catering, photography, rings, honeymoon). Budget weddings: £5-10k, luxury: £40k+.',
  },
  {
    id: ScenarioId.CHILDBIRTH,
    displayName: 'Childbirth',
    description: 'Baby preparation costs and ongoing childcare expenses',
    theme: ScenarioTheme.FAMILY_CARE,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE, ScenarioArchetype.RECURRING_EXPENSE],
    isMultiModifier: true,
    tags: ['family', 'children', 'childcare', 'baby'],
    guidanceText: 'Baby preparation: £2-5k (cot, pram, clothes, nursery). Childcare: £600-1200/month (nursery/childminder). Parental leave: model separately as income loss.',
  },
  {
    id: ScenarioId.IVF_TREATMENT,
    displayName: 'IVF / Fertility Treatment',
    description: 'Private fertility treatment costs (IVF, ICSI, etc)',
    theme: ScenarioTheme.FAMILY_CARE,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['family', 'fertility', 'medical', 'ivf'],
    guidanceText: 'Private IVF UK: £5-8k per cycle, medication £500-1500. NHS offers limited free cycles (varies by region). Average 3 cycles needed.',
  },
  {
    id: ScenarioId.EDUCATION_FUND,
    displayName: 'Education Fund',
    description: 'Save for child education costs (university, private school, childcare)',
    theme: ScenarioTheme.FAMILY_CARE,
    archetypes: [ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION],
    isMultiModifier: false,
    tags: ['family', 'education', 'savings', 'children', 'priority-2'],
    guidanceText: 'University: £9,250/year tuition + £9-12k/year living (3 years). Private school: £15-30k/year. Start saving early to spread costs.',
  },
  {
    id: ScenarioId.ELDER_CARE,
    displayName: 'Elder Care Responsibilities',
    description: 'Support aging parents or relatives with care costs',
    theme: ScenarioTheme.FAMILY_CARE,
    archetypes: [ScenarioArchetype.RECURRING_EXPENSE],
    isMultiModifier: false,
    tags: ['family', 'care', 'elderly', 'support'],
    guidanceText: 'UK care home costs: £600-1000/week (£31-52k/year). Home care: £15-30/hour. NHS/council funding available based on means testing.',
  },
  {
    id: ScenarioId.DIVORCE,
    displayName: 'Divorce / Separation',
    description: 'Legal fees and settlement costs from relationship breakdown',
    theme: ScenarioTheme.FAMILY_CARE,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['family', 'divorce', 'legal', 'settlement'],
    guidanceText: 'UK divorce costs: Legal fees £5-20k, settlement varies widely (50/50 asset split typical). Mediation cheaper than court (£3k vs £15k+).',
  },
  {
    id: ScenarioId.DEATH_PARTNER,
    displayName: 'Death of Partner / Breadwinner',
    description: 'Model income loss from death of primary earner',
    theme: ScenarioTheme.FAMILY_CARE,
    archetypes: [ScenarioArchetype.RECURRING_EXPENSE],
    isMultiModifier: false,
    tags: ['family', 'death', 'income-loss', 'protection'],
    guidanceText: 'Models ongoing income loss until survivor retires. DWP Bereavement Support: £3.5k + £350/month for 18 months. Life insurance should cover gap.',
  }
]

// ============================================================================
// THEME 4: CAREER & INCOME (12 scenarios)
// ============================================================================

const CAREER_INCOME_SCENARIOS: ScenarioDescriptor[] = [
  {
    id: ScenarioId.SALARY_INCREASE,
    displayName: 'Salary Increase / Promotion',
    description: 'Permanent salary increase from promotion, raise, or job change',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.RECURRING_INCOME],
    isMultiModifier: false,
    tags: ['income', 'salary', 'promotion', 'career'],
    guidanceText: 'Model post-tax income increase. UK annual raises: 2-5% (inflation), promotions: 10-20%+. Factor in higher tax bracket if crossing £50k or £100k.',
  },
  {
    id: ScenarioId.SIDE_INCOME,
    displayName: 'Add Side Income',
    description: 'Additional income from freelancing, rental, or side business',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.RECURRING_INCOME],
    isMultiModifier: false,
    tags: ['income', 'side-hustle', 'freelance', 'passive'],
    guidanceText: 'Side income taxed as self-employment above £1k trading allowance. Remember NI and tax deductions. Popular: tutoring, consulting, rental income.',
  },
  {
    id: ScenarioId.REDUCE_EXPENSES,
    displayName: 'Reduce Expenses',
    description: 'Permanent reduction in monthly spending (lifestyle change, downsizing)',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.RECURRING_INCOME],
    isMultiModifier: false,
    tags: ['income', 'expenses', 'savings', 'frugality'],
    guidanceText: 'Model as positive cash flow. Common reductions: downgrade housing (£300-500/month), cut subscriptions (£50-100/month), meal prep (£200/month).',
  },
  {
    id: ScenarioId.QUIT_JOB,
    displayName: 'Quit Job / Career Break',
    description: 'Stop working temporarily or permanently - halts salary and pension contributions',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.ALLOCATION_CONFIG_CHANGE],
    isMultiModifier: false,
    tags: ['career', 'break', 'sabbatical', 'income-loss'],
    guidanceText: 'Stops salary and pension contributions from quit date. Plan for 3-12 months expenses. Consider part-time or contract work during break.',
  },
  {
    id: ScenarioId.JOB_LOSS,
    displayName: 'Job Loss (Temporary)',
    description: 'Temporary unemployment with eventual return to work',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.RECURRING_INCOME],
    isMultiModifier: false,
    tags: ['career', 'unemployment', 'income-loss', 'jobseekers'],
    guidanceText: 'UK Jobseeker\'s Allowance: £84/week (under 25), £67/week (25+). Typical unemployment: 3-6 months. Emergency fund critical.',
  },
  {
    id: ScenarioId.INCOME_REDUCTION,
    displayName: 'Career Change / Income Shift',
    description: 'Permanent change to lower-paying career (lifestyle choice, industry shift)',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.RECURRING_INCOME],
    isMultiModifier: false,
    tags: ['career', 'income-reduction', 'lifestyle', 'change'],
    guidanceText: 'Model as negative income. Common scenarios: corporate → startup (-30-50%), high-stress → work-life balance (-20-30%), career pivot (-40%).',
  },
  {
    id: ScenarioId.INCOME_INTERRUPTION,
    displayName: 'Temporary Income Interruption',
    description: 'Short-term income loss (parental leave, illness, sabbatical) with return to work',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.RECURRING_INCOME],
    isMultiModifier: false,
    tags: ['career', 'parental-leave', 'illness', 'temporary'],
    guidanceText: 'Parental leave: Statutory maternity pay £172/week (39 weeks). Sick pay: £109/week. Model as temporary negative income with fixed duration.',
  },
  {
    id: ScenarioId.BUSINESS_VENTURE,
    displayName: 'Business Venture',
    description: 'Launch and grow a business with setup costs, operating expenses, and revenue',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [
      ScenarioArchetype.RECURRING_INCOME,
      ScenarioArchetype.RECURRING_EXPENSE,
      ScenarioArchetype.ONE_OFF_EXPENSE,
      ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION
    ],
    isMultiModifier: true,
    tags: ['business', 'entrepreneurship', 'revenue', 'expenses', 'equity'],
    guidanceText: 'Business setup: £5-50k (legal, equipment, marketing). Monthly costs: £2-10k. Revenue ramp-up: 3-12 months. Tracks business equity value.',
  },
  {
    id: ScenarioId.SELL_BUSINESS,
    displayName: 'Sell Business',
    description: 'Sell business and receive proceeds after Capital Gains Tax',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.ONE_OFF_INFLOW, ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL],
    isMultiModifier: true,
    tags: ['business', 'sale', 'exit', 'cgt', 'windfall'],
    guidanceText: 'Business sale: 10% CGT on gains with Business Asset Disposal Relief (first £1m). Enter net proceeds after tax. Liquidates business equity.',
  },
  {
    id: ScenarioId.TRAINING,
    displayName: 'Professional Training / Education',
    description: 'Course fees and training costs with potential salary increase afterward',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE, ScenarioArchetype.RECURRING_EXPENSE, ScenarioArchetype.RECURRING_INCOME],
    isMultiModifier: true,
    tags: ['education', 'training', 'career', 'upskilling'],
    guidanceText: 'Professional courses: £1-10k (certification, bootcamp, part-time degree). Potential salary uplift: 10-30% post-qualification.',
  },
  {
    id: ScenarioId.WORK_EQUIPMENT,
    displayName: 'Work Equipment',
    description: 'One-off purchase of equipment needed for work (laptop, tools, vehicle)',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['equipment', 'tools', 'work', 'expense'],
    guidanceText: 'Work equipment costs: Laptop £500-2k, tools £300-3k, work vehicle £5-15k. May be tax-deductible if self-employed.',
  },
  {
    id: ScenarioId.SABBATICAL,
    displayName: 'Sabbatical / Extended Leave',
    description: 'Extended time off work for travel, study, or personal development',
    theme: ScenarioTheme.CAREER_INCOME,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['career', 'sabbatical', 'travel', 'break'],
    guidanceText: 'Sabbatical costs: Travel £5-20k, living expenses £1-3k/month. Duration: 3-12 months typical. Model income loss separately with "Quit Job".',
  }
]

// ============================================================================
// THEME 5: HEALTH & PROTECTION (7 scenarios)
// ============================================================================

const HEALTH_PROTECTION_SCENARIOS: ScenarioDescriptor[] = [
  {
    id: ScenarioId.MEDICAL_EMERGENCY,
    displayName: 'Medical Emergency',
    description: 'Unexpected medical costs not covered by NHS (private treatment, dental, specialist)',
    theme: ScenarioTheme.HEALTH_PROTECTION,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['health', 'medical', 'emergency', 'expense'],
    guidanceText: 'Private medical costs: Emergency £2-10k, specialist consultation £150-300, surgery £3-15k. NHS free but waiting times vary.',
  },
  {
    id: ScenarioId.FAMILY_ILLNESS,
    displayName: 'Family Member Illness',
    description: 'Ongoing care costs for ill family member (medical, care, support)',
    theme: ScenarioTheme.HEALTH_PROTECTION,
    archetypes: [ScenarioArchetype.RECURRING_EXPENSE],
    isMultiModifier: false,
    tags: ['health', 'family', 'care', 'ongoing'],
    guidanceText: 'Care costs for ill relative: Home care £15-30/hour, medical supplies £100-500/month, potential income loss from caring duties.',
  },
  {
    id: ScenarioId.LONG_TERM_ILLNESS,
    displayName: 'Long-Term Illness',
    description: 'Chronic health condition requiring ongoing treatment and support',
    theme: ScenarioTheme.HEALTH_PROTECTION,
    archetypes: [ScenarioArchetype.RECURRING_EXPENSE],
    isMultiModifier: false,
    tags: ['health', 'chronic', 'illness', 'disability'],
    guidanceText: 'Long-term illness costs: Medication £10-200/month, private physiotherapy £40-80/session, adaptations £2-20k. NHS support varies.',
  },
  {
    id: ScenarioId.DISABILITY_SUPPORT,
    displayName: 'Long-Term Disability Income Support',
    description: 'Government disability benefits (PIP, Universal Credit) to offset care costs',
    theme: ScenarioTheme.HEALTH_PROTECTION,
    archetypes: [ScenarioArchetype.RECURRING_INCOME],
    isMultiModifier: false,
    tags: ['health', 'disability', 'benefits', 'pip', 'income'],
    guidanceText: 'UK disability benefits: PIP £28-434/month (based on needs), Universal Credit disability element £390/month. Not means-tested.',  // Income scenarios are goals,  // Uses archetype defaults, not legacy transformers
    isNew: true
  },
  {
    id: ScenarioId.UNEXPECTED_EXPENSE,
    displayName: 'Major Repair / Unexpected Expense',
    description: 'Large unexpected cost (car breakdown, boiler replacement, urgent repair)',
    theme: ScenarioTheme.HEALTH_PROTECTION,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['emergency', 'repair', 'unexpected', 'expense'],
    guidanceText: 'Unexpected costs: Boiler £2-4k, car engine £1-3k, roof repair £5-15k. Emergency fund should cover 1-2 of these events.',
  },
  {
    id: ScenarioId.TAX_BILL,
    displayName: 'Unexpected Tax Bill',
    description: 'Surprise tax liability from self-employment, underpayment, or tax code change',
    theme: ScenarioTheme.HEALTH_PROTECTION,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['tax', 'hmrc', 'unexpected', 'expense'],
    guidanceText: 'Common for self-employed or those with multiple income sources. HMRC allows payment plans. Set aside 20-40% of self-employment income for tax.',
  },
  {
    id: ScenarioId.FRAUD_THEFT,
    displayName: 'Fraud / Theft',
    description: 'Financial loss from fraud, theft, or scam',
    theme: ScenarioTheme.HEALTH_PROTECTION,
    archetypes: [ScenarioArchetype.ONE_OFF_EXPENSE],
    isMultiModifier: false,
    tags: ['fraud', 'theft', 'scam', 'loss'],
    guidanceText: 'UK fraud victims lose average £1-5k. Banks may refund authorized push payment (APP) scams under voluntary code. Report to Action Fraud.',
  }
]

// ============================================================================
// THEME 6: MARKET & ECONOMIC FORCES (12 scenarios)
// ============================================================================

const MARKET_ECONOMIC_SCENARIOS: ScenarioDescriptor[] = [
  {
    id: ScenarioId.MARKET_CRASH,
    displayName: 'Market Crash',
    description: 'Stock market decline reducing investment returns (e.g., 2008, 2020 COVID)',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.INTEREST_RATE_CHANGE],
    isMultiModifier: true,
    tags: ['market', 'crash', 'investments', 'recession'],
    guidanceText: 'Market crashes reduce annual returns: mild -3%, moderate -5%, severe -8%. Historical: 2008 crash -38%, 2020 COVID -34% (recovered within year).',
  },
  {
    id: ScenarioId.MARKET_BOOM,
    displayName: 'Market Boom',
    description: 'Stock market growth increasing investment returns above baseline',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.INTEREST_RATE_CHANGE],
    isMultiModifier: true,
    tags: ['market', 'boom', 'investments', 'growth'],
    guidanceText: 'Market booms boost returns: conservative +2%, moderate +3%, aggressive +5%. Tech booms (1990s, 2010s) saw 15-20% annual gains.',
  },
  {
    id: ScenarioId.INTEREST_RATE_INCREASE,
    displayName: 'Interest Rate Increase (BoE)',
    description: 'Bank of England raises base rate - increases mortgage costs and savings returns',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.INTEREST_RATE_CHANGE],
    isMultiModifier: true,
    tags: ['interest-rates', 'boe', 'mortgage', 'savings'],
    guidanceText: 'Rate rises increase variable mortgage payments and savings returns. UK 2022-23: 0.1% → 5.25% (52 rate rises in 18 months).',
  },
  {
    id: ScenarioId.INTEREST_RATE_DECREASE,
    displayName: 'Interest Rate Decrease (BoE)',
    description: 'Bank of England cuts base rate - reduces mortgage costs and savings returns',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.INTEREST_RATE_CHANGE],
    isMultiModifier: true,
    tags: ['interest-rates', 'boe', 'mortgage', 'savings'],
    guidanceText: 'Rate cuts reduce mortgage payments but also savings returns. COVID response: 5.25% → 0.1% in 2020.',
  },
  {
    id: ScenarioId.COST_OF_LIVING_SHOCK,
    displayName: 'Cost-of-Living Shock',
    description: 'Sudden spike in living costs (energy crisis, food inflation, supply chain disruption)',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.RECURRING_EXPENSE],
    isMultiModifier: false,
    tags: ['inflation', 'cost-of-living', 'energy', 'expenses'],
    guidanceText: '2022 UK energy crisis: bills rose £1-2k/year. Food inflation 2022-23: 15-20%. Model as temporary increase in monthly expenses.',  // Expense shocks are events,  // Uses archetype defaults, not legacy transformers
    isNew: true
  },
  {
    id: ScenarioId.INHERITANCE,
    displayName: 'Inheritance / Windfall',
    description: 'Receive inheritance from estate or large financial gift',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.ONE_OFF_INFLOW],
    isMultiModifier: false,
    tags: ['windfall', 'inheritance', 'gift', 'cash-inflow'],
    guidanceText: 'UK inheritance: No tax on first £325k (£500k with residence nil-rate band). Gifts over £3k/year may incur tax if donor dies within 7 years.',
  },
  {
    id: ScenarioId.LARGE_WINDFALL,
    displayName: 'Large Windfall / Bonus',
    description: 'One-off large payment (work bonus, lottery, settlement, asset sale)',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.ONE_OFF_INFLOW],
    isMultiModifier: false,
    tags: ['windfall', 'bonus', 'lottery', 'cash-inflow'],
    guidanceText: 'Large windfalls: Work bonus (taxed as income), lottery (tax-free UK), legal settlement (varies). Smart allocation: debt, emergency fund, ISA.',
  },
  {
    id: ScenarioId.INSURANCE_PAYOUT,
    displayName: 'Life Insurance Payout',
    description: 'Receive life insurance or critical illness payout',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.ONE_OFF_INFLOW],
    isMultiModifier: false,
    tags: ['insurance', 'payout', 'protection', 'cash-inflow'],
    guidanceText: 'Life insurance payouts tax-free in UK. Critical illness cover typically 3-5x salary. Use to replace lost income or pay off debts.',
  },
  {
    id: ScenarioId.PENSION_WITHDRAWAL_ONEOFF,
    displayName: 'Pension Withdrawal (One-Off)',
    description: 'Take a lump sum from pension (25% tax-free, rest taxed at marginal rate)',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.ONE_OFF_INFLOW],
    isMultiModifier: false,
    tags: ['pension', 'withdrawal', 'retirement', 'tax-free-lump-sum'],
    guidanceText: 'UK pension access age 55 (57 from 2028). 25% tax-free lump sum (max £268k), rest taxed as income. Consider tax bracket impact.',
  },
  {
    id: ScenarioId.PENSION_WITHDRAWAL_RECURRING,
    displayName: 'Pension Withdrawal (Recurring)',
    description: 'Regular pension drawdown for retirement income',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL],
    isMultiModifier: false,
    tags: ['pension', 'withdrawal', 'retirement', 'drawdown'],
    guidanceText: 'Pension drawdown: Flexible withdrawals taxed as income. Recommended: 4% annual withdrawal rate. Consider state pension £11k/year from age 67.',
  },
  {
    id: ScenarioId.ISA_WITHDRAWAL,
    displayName: 'ISA Withdrawal',
    description: 'Withdraw funds from ISA (tax-free, can replace allowance same year)',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.ONE_OFF_INFLOW],
    isMultiModifier: false,
    tags: ['isa', 'withdrawal', 'tax-free', 'flexible'],
    guidanceText: 'ISA withdrawals 100% tax-free, no penalties. Can replace withdrawn amount within same tax year without using allowance (flexible ISA).',
  },
  {
    id: ScenarioId.RETIREMENT_DRAWDOWN_TEST,
    displayName: 'Retirement Drawdown Stress-Test',
    description: 'Test retirement withdrawal strategy under different market/longevity scenarios',
    theme: ScenarioTheme.MARKET_ECONOMIC,
    archetypes: [ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL, ScenarioArchetype.INTEREST_RATE_CHANGE],
    isMultiModifier: true,
    tags: ['retirement', 'drawdown', 'stress-test', 'longevity'],
    guidanceText: 'Test withdrawal sustainability: 4% rule (safe), 3% (conservative), 5% (aggressive). Factor in state pension, market volatility, longevity risk.',  // Withdrawal scenarios are actions,  // Uses archetype defaults, not legacy transformers
    isNew: true
  }
]

// ============================================================================
// REGISTRY EXPORT
// ============================================================================

/**
 * Complete scenario registry with all 54 scenarios
 */
export const COMPLETE_SCENARIO_REGISTRY: Record<ScenarioId, ScenarioDescriptor> = {
  // Foundational Stability (9)
  ...Object.fromEntries(FOUNDATIONAL_STABILITY_SCENARIOS.map(s => [s.id, s])),
  // Housing & Assets (7)
  ...Object.fromEntries(HOUSING_ASSETS_SCENARIOS.map(s => [s.id, s])),
  // Family & Care (7)
  ...Object.fromEntries(FAMILY_CARE_SCENARIOS.map(s => [s.id, s])),
  // Career & Income (12)
  ...Object.fromEntries(CAREER_INCOME_SCENARIOS.map(s => [s.id, s])),
  // Health & Protection (7)
  ...Object.fromEntries(HEALTH_PROTECTION_SCENARIOS.map(s => [s.id, s])),
  // Market & Economic Forces (12)
  ...Object.fromEntries(MARKET_ECONOMIC_SCENARIOS.map(s => [s.id, s]))
} as Record<ScenarioId, ScenarioDescriptor>
