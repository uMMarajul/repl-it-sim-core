import { useMemo } from 'react'
import { useScenarioStore, type ScenarioConfig } from '../state/scenarioStore'
import {
  ScenarioSimulator,
  BalanceAccount,
  type SimulationScenario,
  type ScenarioModifier,
  type ProjectionPoint,
  type SolvencyAnalysis,
  calculateTaxOnIncome,
  calculateNationalInsurance
} from '../../../sim-core/src/index'
import { AssetClass } from '../../../sim-core/src/engine/scenarioSimulator'
import { getScenarioById } from '../../../sim-core/src/config/scenarioRegistry'
import { ScenarioId } from '../../../sim-core/src/config/scenarioTypes'
import type { TestProfile } from '../data/testProfiles'

export interface ChartDataPoint {
  year: number
  yearLabel: string
  actualYear: number
  age: number
  baselineNetCashFlow?: number
  scenarioNetCashFlow?: number
  // Stacked bar chart values for cash flow
  baselineCashFlowBar?: number
  scenarioDeltaBar?: number  // Deprecated - kept for backward compatibility
  baseline?: number  // Baseline net worth
  scenario?: number  // Scenario net worth
  cash?: number  // Unallocated cash (0% interest)
  pension?: number
  pensionWithdrawal?: number  // Pension withdrawals (negative in retirement)
  isa?: number  // Private ISA contributions (ISA-wrapped equities)
  investments?: number  // Taxable investments (non-ISA equities)
  debt?: number  // Debt payments (mortgage, loans)
  savingsGoals?: Record<string, number>  // Individual savings goal contributions by fund name (Emergency Fund, Education Fund, etc.)
  // Breakdown for tooltips
  income?: number
  grossSalary?: number  // Gross annual salary (before tax/NI) - SCENARIO
  salary?: number  // Net annual salary (after tax/NI) - deprecated, use grossSalary instead
  incomeTax?: number  // Annual income tax deducted - SCENARIO
  nationalInsurance?: number  // Annual National Insurance deducted - SCENARIO
  baselineGrossSalary?: number  // Baseline gross salary (for comparison)
  baselineIncomeTax?: number  // Baseline income tax (for comparison)
  baselineNationalInsurance?: number  // Baseline national insurance (for comparison)
  // Business income tracking (separate from employment income)
  businessRevenue?: number  // Annual business revenue
  businessCosts?: number  // Annual business operating costs
  businessProfit?: number  // Annual business profit before tax (revenue - costs)
  corporationTax?: number  // Annual corporation tax on business profit
  businessNetProfit?: number  // Annual business profit after corporation tax
  baselineBusinessRevenue?: number  // Baseline business revenue (for comparison)
  baselineBusinessCosts?: number  // Baseline business costs (for comparison)
  baselineBusinessProfit?: number  // Baseline business profit (for comparison)
  baselineCorporationTax?: number  // Baseline corporation tax (for comparison)
  baselineBusinessNetProfit?: number  // Baseline business net profit (for comparison)
  pensionIncome?: number
  statePensionIncome?: number
  privatePensionIncome?: number
  expenses?: number
  housing?: number
  utilities?: number
  food?: number
  transport?: number
  subscriptions?: number
  leisure?: number
  other?: number
  // Asset class balances and growth rates (for detailed tooltips)
  baselineAssetBreakdown?: Array<{
    name: string
    value: number
    annualRate?: number
  }>
  scenarioAssetBreakdown?: Array<{
    name: string
    value: number
    annualRate?: number
  }>
  baselineDebtBreakdown?: Array<{
    name: string
    value: number
    annualRate?: number
  }>
  scenarioDebtBreakdown?: Array<{
    name: string
    value: number
    annualRate?: number
  }>
  // Annual growth calculations
  baselineGrowth?: number  // £ change from previous year
  scenarioGrowth?: number  // £ change from previous year
  baselineGrowthRate?: number  // % change from previous year
  scenarioGrowthRate?: number  // % change from previous year
  // Asset/Debt split for net wealth chart (assets - debts = net wealth)
  baselineAssets?: number  // Total asset value
  baselineDebts?: number   // Total debt value (positive number)
  scenarioAssets?: number  // Total asset value
  scenarioDebts?: number   // Total debt value (positive number)
  // Verification: ΔNetWorth = netCashFlow + investmentReturns (netCashFlow defined at lines 27-28)
  baselineTotalContributions?: number  // Total annual contributions to all accounts
  scenarioTotalContributions?: number  // Total annual contributions to all accounts
  baselineInvestmentReturns?: number  // Investment growth (ΔNW - netCashBefore)
  scenarioInvestmentReturns?: number  // Investment growth (ΔNW - netCashBefore)
  // Goal/Action/Event breakdowns from sim-core
  goalBreakdowns?: Array<{
    name: string
    type: 'goal' | 'action' | 'event'
    cashFlowImpact: number
    netWorthImpact: number
  }>
  // NEW: Individual account contributions with return rates
  accountBreakdown?: Array<{
    name: string
    amount: number
    returnRate: number
  }>
  // Growth driver tracking - shows what's driving net wealth changes (SCENARIO)
  compoundGrowth?: number  // Interest/returns earned this period (scenario)
  totalContributionsThisPeriod?: number  // Total contributions (scenario)
  // Growth driver tracking - shows what's driving net wealth changes (BASELINE)
  baselineCompoundGrowth?: number  // Interest/returns earned this period (baseline)
  baselineTotalContributionsThisPeriod?: number  // Total contributions this period (baseline)
  // Dynamic scenario impact fields (created at runtime)
  // Format: scenario_<scenarioId>: number (cash flow impact for that scenario)
  [key: string]: any  // Allow dynamic scenario fields
}

export interface SimulationResults {
  baseline: {
    finalBalance: number
    accounts: any[]
  }
  scenarios: Record<string, any>
  chartData: {
    cashFlow: ChartDataPoint[]
    netWealth: ChartDataPoint[]
    attribution: ChartDataPoint[]
  }
  modifiers?: any[]  // ScenarioModifiers with assumptions for tooltip metadata
  solvency?: SolvencyAnalysis // Feasibility metrics
  simulationTimestamp?: number // NEW: Timestamp of when this result was generated
}

/**
 * Validate that multi-modifier arrays have matching scenarioId fields
 * This ensures proper grouping in charts and aggregation
 */
function validateMultiModifierArray(modifiers: ScenarioModifier[], scenarioId: string): void {
  if (modifiers.length <= 1) return

  const firstScenarioId = modifiers[0].scenarioId
  const allMatch = modifiers.every(m => m.scenarioId === firstScenarioId)

  if (!allMatch) {
    console.error(`[buildScenarioModifiers] Multi-modifier array for ${scenarioId} has mismatched scenarioId:`,
      modifiers.map(m => ({ id: m.id, scenarioId: m.scenarioId })))
    throw new Error(`Multi-modifier arrays must have matching scenarioId for proper grouping (scenario: ${scenarioId})`)
  }

  if (!firstScenarioId) {
    console.warn(`[buildScenarioModifiers] Multi-modifier array for ${scenarioId} is missing scenarioId field - components may not group correctly`)
  }
}

/**
 * Convert enabled scenarios to ScenarioModifiers for sim-core
 * Now uses ACTUAL user configuration from config.data (transformed by simplifiedTemplates)
 * Supports both single modifiers and arrays (for multi-component scenarios like business)
 */
function buildScenarioModifiers(
  enabledScenarios: Record<string, ScenarioConfig>,
  _currentAge: number,
  _profile: TestProfile
): ScenarioModifier[] {
  const modifiers: ScenarioModifier[] = []

  Object.entries(enabledScenarios).forEach(([id, config]) => {
    if (!config.enabled) {
      return
    }

    // Get archetype from registry if missing in data
    let archetype = config.data?.archetype
    if (!archetype) {
      const def = getScenarioById(id as ScenarioId)
      if (def && def.archetypes && def.archetypes.length > 0) {
        archetype = def.archetypes[0]
      }
    }

    // Helper to map UI fields to engine fields (targetAmount)
    const normalizeModifier = (data: any, defaultArchetype?: string): any => {
      const normalized = { ...data }

      // Inject archetype if missing
      if (!normalized.archetype && defaultArchetype) {
        normalized.archetype = defaultArchetype
      }

      // Map varied UI fields to targetAmount
      if (normalized.targetAmount === undefined) {
        if (normalized.totalBudget !== undefined) normalized.targetAmount = normalized.totalBudget
        else if (normalized.totalCost !== undefined) normalized.targetAmount = normalized.totalCost
        else if (normalized.propertyPrice !== undefined) normalized.targetAmount = normalized.propertyPrice
        else if (normalized.loanAmount !== undefined) normalized.targetAmount = normalized.loanAmount
        else if (normalized.saleProceeds !== undefined) normalized.targetAmount = normalized.saleProceeds
        else if (normalized.withdrawalAmount !== undefined) normalized.targetAmount = normalized.withdrawalAmount
        else if (normalized.lumpSumPayment !== undefined) normalized.targetAmount = normalized.lumpSumPayment
        else if (normalized.billAmount !== undefined) normalized.targetAmount = normalized.billAmount
        else if (normalized.lossAmount !== undefined) normalized.targetAmount = normalized.lossAmount
        else if (normalized.payoutAmount !== undefined) normalized.targetAmount = normalized.payoutAmount
        else if (normalized.amount !== undefined) normalized.targetAmount = normalized.amount
        else if (normalized.repairCost !== undefined) normalized.targetAmount = normalized.repairCost
        else if (normalized.oneOffCosts !== undefined) normalized.targetAmount = normalized.oneOffCosts
        else if (normalized.oneOffCost !== undefined) normalized.targetAmount = normalized.oneOffCost
      }

      // Map varied UI fields to monthlyContribution (for recurring)
      if (normalized.monthlyContribution === undefined) {
        if (normalized.monthlyAmount !== undefined) normalized.monthlyContribution = normalized.monthlyAmount
        else if (normalized.monthlyPayment !== undefined) normalized.monthlyContribution = normalized.monthlyPayment
        else if (normalized.monthlyCost !== undefined) normalized.monthlyContribution = normalized.monthlyCost
        else if (normalized.monthlyCosts !== undefined) normalized.monthlyContribution = normalized.monthlyCosts
        else if (normalized.monthlyIncome !== undefined) normalized.monthlyContribution = normalized.monthlyIncome
        else if (normalized.monthlyRevenue !== undefined) normalized.monthlyContribution = normalized.monthlyRevenue
        else if (normalized.monthlyReduction !== undefined) normalized.monthlyContribution = normalized.monthlyReduction
        else if (normalized.monthlyLivingCosts !== undefined) normalized.monthlyContribution = normalized.monthlyLivingCosts
        else if (normalized.monthlyCareCosts !== undefined) normalized.monthlyContribution = normalized.monthlyCareCosts
        else if (normalized.monthlyMedicalCosts !== undefined) normalized.monthlyContribution = normalized.monthlyMedicalCosts
        else if (normalized.monthlyIncomeLost !== undefined) normalized.monthlyContribution = normalized.monthlyIncomeLost
        else if (normalized.extraMonthlyPayment !== undefined) normalized.monthlyContribution = normalized.extraMonthlyPayment
      }

      // Map varied UI fields to targetDate (for one-off events)
      if (normalized.targetDate === undefined) {
        if (normalized.weddingDate !== undefined) normalized.targetDate = normalized.weddingDate
        else if (normalized.purchaseDate !== undefined) normalized.targetDate = normalized.purchaseDate
        else if (normalized.saleDate !== undefined) normalized.targetDate = normalized.saleDate
        else if (normalized.payoutDate !== undefined) normalized.targetDate = normalized.payoutDate
        else if (normalized.billDate !== undefined) normalized.targetDate = normalized.billDate
        else if (normalized.damageDate !== undefined) normalized.targetDate = normalized.damageDate
        else if (normalized.crashDate !== undefined) normalized.targetDate = normalized.crashDate
        else if (normalized.boomDate !== undefined) normalized.targetDate = normalized.boomDate
        else if (normalized.effectiveDate !== undefined) normalized.targetDate = normalized.effectiveDate
        else if (normalized.separationDate !== undefined) normalized.targetDate = normalized.separationDate
        else if (normalized.deathDate !== undefined) normalized.targetDate = normalized.deathDate
        else if (normalized.fraudDate !== undefined) normalized.targetDate = normalized.fraudDate
        else if (normalized.receiptDate !== undefined) normalized.targetDate = normalized.receiptDate
        else if (normalized.treatmentDate !== undefined) normalized.targetDate = normalized.treatmentDate
        else if (normalized.withdrawalDate !== undefined) normalized.targetDate = normalized.withdrawalDate
        else if (normalized.repairDate !== undefined) normalized.targetDate = normalized.repairDate
        else if (normalized.expenseDate !== undefined) normalized.targetDate = normalized.expenseDate
      }

      // Map varied UI fields to startDate (for recurring/duration events)
      if (normalized.startDate === undefined) {
        if (normalized.jobLossDate !== undefined) normalized.startDate = normalized.jobLossDate
        else if (normalized.interruptionDate !== undefined) normalized.startDate = normalized.interruptionDate
        else if (normalized.diagnosisDate !== undefined) normalized.startDate = normalized.diagnosisDate
      }

      return normalized
    }

    // Transformers return ScenarioModifier | ScenarioModifier[]
    if (config.data && Object.keys(config.data).length > 0) {
      // Check if it's an array of modifiers (multi-component scenarios)
      if (Array.isArray(config.data)) {
        // Validate multi-modifier array has matching scenarioId
        validateMultiModifierArray(config.data, id)

        config.data.forEach((mod: ScenarioModifier) => {
          // Normalize each modifier in the array
          const normalized = normalizeModifier(mod, archetype)

          if ('archetype' in normalized && 'targetAmount' in normalized) {
            modifiers.push(normalized)
          } else {
            console.warn(`[useSimulation] Invalid modifier in array for ${id}`, normalized)
          }
        })
      } else {
        // Single modifier (traditional scenarios)
        // Normalize the modifier
        const normalized = normalizeModifier(config.data, archetype)

        if ('archetype' in normalized && 'targetAmount' in normalized) {
          modifiers.push(normalized as ScenarioModifier)
        } else {
          console.warn(`[useSimulation] Invalid scenario data for ${id} - missing archetype or targetAmount`, normalized)
        }
      }
    }
  })

  return modifiers
}

// REMOVED: 800+ lines of hardcoded switch cases - now using actual config.data!

/**
 * Import archetype mapping helper
 */
function buildSimulationScenario(
  profile: TestProfile,
  currentAge: number,
  retirementAge: number,
  enabledScenarios: Record<string, ScenarioConfig>,
  pensionConfig?: {
    plans: Array<{
      id: string
      type: 'employer_match' | 'salary_sacrifice' | 'personal_sipp'
      providerName: string
      balance: number
      employeePercent?: number
      employerPercent?: number
      maxSacrificePercent?: number
      taxReliefMethod?: 'relief_at_source' | 'net_pay'
      monthlyContribution?: number
    }>
    employeePercent?: number
    employerPercent?: number
  }
): SimulationScenario {
  // UK State Pension: £11,500/year from age 67
  const STATE_PENSION_ANNUAL = 11500
  const STATE_PENSION_MONTHLY = STATE_PENSION_ANNUAL / 12

  // Alpha 2 specific financial data from spreadsheet
  const baselineAccounts = []

  if (profile.id === 'alpha2') {
    // Private ISA: £110,000 at 7% growth (UK equity market historical average)
    // Note: ISA contributions handled by automated allocator (10% to equities)
    // ISA detection is automatic from account name containing 'isa'
    baselineAccounts.push(new BalanceAccount({
      name: 'Private ISA',
      startingBalance: 110000,
      contribution: 0, // No scheduled contribution - uses automated allocation instead
      frequency: 'monthly',
      performance: 7, // UK equity market historical average
      isDebt: false
    }))

    // Process all pension plans from pensionConfig
    if (pensionConfig && pensionConfig.plans && pensionConfig.plans.length > 0) {
      let totalAnnualPensionContributions = 0
      const UK_ANNUAL_ALLOWANCE = 60000  // £60k annual allowance for pension contributions

      for (const plan of pensionConfig.plans) {
        let monthlyContribution = 0

        if (plan.type === 'employer_match' && plan.employeePercent && plan.employerPercent) {
          // Standard employer matching: employee + employer contributions
          monthlyContribution = (profile.currentSalary * (plan.employeePercent + plan.employerPercent) / 100) / 12
        } else if (plan.type === 'salary_sacrifice' && plan.employeePercent) {
          // Salary sacrifice: pre-tax contributions
          // Employee sacrifices salary, employer adds their match
          const employeeSacrifice = (profile.currentSalary * plan.employeePercent / 100) / 12
          const employerMatch = plan.employerPercent ? (profile.currentSalary * plan.employerPercent / 100) / 12 : 0
          monthlyContribution = employeeSacrifice + employerMatch
        } else if (plan.type === 'personal_sipp' && plan.monthlyContribution) {
          // Personal SIPP: relief-at-source tax treatment
          // User pays net amount (80%), HMRC adds 25% of net as basic rate relief (20% of gross)
          // Example: User pays £80, HMRC adds £20, total £100 goes into pension
          const netContribution = plan.monthlyContribution
          const hmrcGrossUp = netContribution * 0.25  // 25% of net = 20% of gross
          monthlyContribution = netContribution + hmrcGrossUp
        }

        totalAnnualPensionContributions += monthlyContribution * 12

        baselineAccounts.push(new BalanceAccount({
          name: plan.providerName,
          startingBalance: plan.balance,
          contribution: monthlyContribution,
          frequency: 'monthly',
          performance: 6.0, // Assumed equity growth rate for all pensions
          isDebt: false
        }))
      }

      // Check annual allowance and warn if exceeded
      if (totalAnnualPensionContributions > UK_ANNUAL_ALLOWANCE) {
        console.warn(`⚠️ [Pension] Total annual pension contributions (£${totalAnnualPensionContributions.toLocaleString()}) exceed the UK annual allowance (£${UK_ANNUAL_ALLOWANCE.toLocaleString()}). You may face tax charges on the excess.`)
      } else {
        console.log(`✅ [Pension] Total annual contributions: £${totalAnnualPensionContributions.toLocaleString()} (within £${UK_ANNUAL_ALLOWANCE.toLocaleString()} allowance)`)
      }
    } else {
      // Fallback: Create default workplace pension if no plans configured
      const legacyPensionContribution = pensionConfig
        ? (profile.currentSalary * ((pensionConfig.employeePercent || 0) + (pensionConfig.employerPercent || 0)) / 100) / 12
        : 0
      baselineAccounts.push(new BalanceAccount({
        name: 'Workplace Pension',
        startingBalance: 53000,
        contribution: legacyPensionContribution,
        frequency: 'monthly',
        performance: 6.0,
        isDebt: false
      }))
    }

    // House (their share): £123,333 value at 0% growth (property appreciation separate from mortgage)
    baselineAccounts.push(new BalanceAccount({
      name: 'House (Share)',
      startingBalance: 123333,
      contribution: 0,
      frequency: 'monthly',
      performance: 0, // No appreciation modeled
      isDebt: false
    }))

    // Mortgage Debt: Their share is HALF of £346,257 = £173,128.50 at 4.5% interest, £1,110/month payment (half share)
    // BalanceAccount automatically handles debt signs (negative balance, payment reduces debt)
    baselineAccounts.push(new BalanceAccount({
      name: 'Mortgage',
      startingBalance: 173128.50,  // Half of £346,257 (their share)
      contribution: 1110, // Half of monthly payment (£2,220 split with partner)
      frequency: 'monthly',
      performance: 4.5, // Interest rate on outstanding balance (realistic UK mortgage rate)
      isDebt: true
    }))

    // Cash Savings (Emergency Fund / General Savings) from profile
    baselineAccounts.push(new BalanceAccount({
      name: 'Cash Savings',
      startingBalance: profile.savingsBalance || 0,
      contribution: 0,
      frequency: 'monthly',
      performance: 1.5, // Assumed mild interest
      isDebt: false
    }))
  } else {
    // Fallback for other profiles (Alpha 3, etc.) - keep mock data
    baselineAccounts.push(
      new BalanceAccount({
        name: 'Pension',
        startingBalance: profile.pensionBalance,
        contribution: 500,
        frequency: 'monthly',
        performance: 6.0,
        isDebt: false
      }),
      new BalanceAccount({
        name: 'Cash Savings',
        startingBalance: 0,
        contribution: 0,
        frequency: 'monthly',
        performance: 0,
        isDebt: false
      }),
      new BalanceAccount({
        name: 'General Investment',
        startingBalance: 0,
        contribution: 100,
        frequency: 'monthly',
        performance: 7.0,
        isDebt: false
      })
    )
  }

  // Calculate salary sacrifice reductions for taxable income
  let adjustedSalary = profile.currentSalary
  let totalSalarySacrificePercent = 0

  if (pensionConfig && pensionConfig.plans && pensionConfig.plans.length > 0) {
    totalSalarySacrificePercent = pensionConfig.plans
      .filter(p => p.type === 'salary_sacrifice')
      .reduce((sum, p) => sum + (p.employeePercent || 0), 0)

    if (totalSalarySacrificePercent > 0) {
      const annualSacrifice = profile.currentSalary * (totalSalarySacrificePercent / 100)
      adjustedSalary = profile.currentSalary - annualSacrifice
    }
  }

  // Calculate tax and NI on ADJUSTED salary (after salary sacrifice)
  // This is where the tax and NI savings from salary sacrifice are realized
  const incomeTax = calculateTaxOnIncome(adjustedSalary)
  const nationalInsurance = calculateNationalInsurance(adjustedSalary)

  // Use profile-specific allocations if configured, otherwise use defaults (10% equities, 5% pension)
  // Scheduled contributions (baseline account contributions) stack ON TOP of automated allocations
  // This ensures scenario-driven surplus (salary increases, etc.) gets invested and compounds over time
  const allocationConfig = profile.allocationConfig
    ? {
      automatedAllocationPercentages: {
        [AssetClass.EQUITIES]: profile.allocationConfig.equities,
        [AssetClass.PENSION]: profile.allocationConfig.pension
      }
    }
    : undefined  // undefined = use defaults (10% equities, 5% pension)

  return {
    baseline: {
      accounts: baselineAccounts,
      monthlyIncome: adjustedSalary / 12,  // ADJUSTED monthly income (after salary sacrifice, before tax/NI)
      monthlyExpenses: profile.monthlyExpenses,
      currentAge,
      retirementAge,
      statePensionMonthly: STATE_PENSION_MONTHLY,
      monthlyIncomeTax: incomeTax / 12,  // Tax on adjusted salary
      monthlyNI: nationalInsurance / 12,  // NI on adjusted salary
      grossAnnualSalary: adjustedSalary,  // Adjusted salary for display
      allocationConfig  // Use profile-specific allocation if available
    },
    modifiers: buildScenarioModifiers(enabledScenarios, currentAge, profile)
  }
}

/**
 * Aggregate monthly ProjectionPoints into annual ChartDataPoints with BOTH baseline and scenario data
 * Accumulates all 12 months for each year to get accurate annual totals
 */
function aggregateBothToAnnual(
  baselineProjection: ProjectionPoint[],
  scenarioProjection: ProjectionPoint[],
  startAge: number,
  startYear: number,
  _retirementAge: number = 67,
  profile?: TestProfile,
  scenarios?: Record<string, any>,
  accountsMetadata?: Array<{ name: string, performance: number }>
): ChartDataPoint[] {
  const annualData: ChartDataPoint[] = []

  // Build account metadata map (account name → return rate)
  const accountReturnRates = new Map<string, number>()
  if (accountsMetadata) {
    accountsMetadata.forEach(account => {
      accountReturnRates.set(account.name, account.performance)
    })
  }

  // Group by year and accumulate all 12 months from BOTH projections
  const totalYears = Math.floor(Math.min(baselineProjection.length, scenarioProjection.length) / 12)

  for (let yearIndex = 0; yearIndex < totalYears; yearIndex++) {
    const startMonth = yearIndex * 12
    const endMonth = Math.min(startMonth + 12, Math.min(baselineProjection.length, scenarioProjection.length))

    // Accumulate values across all months in this year for BOTH baseline and scenario
    let baselineAnnualNetCashFlow = 0
    let scenarioAnnualNetCashFlow = 0
    // Separate contribution tracking for baseline vs scenario
    let baselineAnnualPensionContribution = 0
    let baselineAnnualPensionWithdrawal = 0  // Track withdrawals separately (negative values)
    let baselineAnnualSavingsContribution = 0
    let baselineAnnualHYSAContribution = 0  // Track HYSA (4.5% savings goals) separately
    let baselineAnnualInvestmentContribution = 0
    let scenarioAnnualPensionContribution = 0
    let scenarioAnnualPensionWithdrawal = 0  // Track withdrawals separately (negative values)
    let scenarioAnnualISAContribution = 0  // Track ISA-wrapped equities separately
    let scenarioAnnualSavingsContribution = 0  // Track 0% cash savings (currentAccount, generalInvestment, defaultSavings)
    let scenarioAnnualHYSAContribution = 0  // Track HYSA (4.5% savings goals: Emergency Fund, Education Fund, House Deposit)
    let scenarioAnnualInvestmentContribution = 0  // Track taxable equities (non-ISA)
    let scenarioAnnualDebtPayment = 0  // Track debt payments (mortgage, loans)
    // Track individual savings goal contributions by fund name across all months
    const savingsGoalContributions: Record<string, number> = {}

    // NEW: Track individual account contributions by name (for detailed chart display)
    const accountContributions: Record<string, number> = {}
    // Use scenario for income/expense display (includes goal impacts)
    let annualIncome = 0
    let annualBaselineIncome = 0
    let annualScenarioIncome = 0  // UNIFIED: All scenarios (goals/events/actions)
    let annualStatePensionIncome = 0  // From scenario engine breakdown
    let annualPrivatePensionIncome = 0  // From scenario engine breakdown
    let annualIncomeTax = 0  // From scenario engine breakdown
    let annualNationalInsurance = 0  // From scenario engine breakdown
    let baselineAnnualStatePensionIncome = 0  // From baseline engine breakdown
    let baselineAnnualPrivatePensionIncome = 0  // From baseline engine breakdown
    let baselineAnnualIncomeTax = 0  // From baseline engine breakdown
    let baselineAnnualNationalInsurance = 0  // From baseline engine breakdown
    let annualExpenses = 0
    let baselineAnnualExpenses = 0
    // Business income tracking (separate from employment income)
    let annualBusinessRevenue = 0
    let annualBusinessCosts = 0
    let annualBusinessProfit = 0
    let annualCorporationTax = 0
    let annualBusinessNetProfit = 0
    let baselineAnnualBusinessRevenue = 0
    let baselineAnnualBusinessCosts = 0
    let baselineAnnualBusinessProfit = 0
    let baselineAnnualCorporationTax = 0
    let baselineAnnualBusinessNetProfit = 0
    // Surplus cash tracking (available for allocation after automated allocations & savings goals)
    let annualSurplusCash = 0
    // Growth driver tracking - shows what's driving net wealth changes (SCENARIO)
    let annualCompoundGrowth = 0  // Interest/returns earned this year
    let annualTotalContributions = 0  // Total contributions (scheduled + allocated) this year
    // Growth driver tracking - shows what's driving net wealth changes (BASELINE)
    let baselineAnnualCompoundGrowth = 0  // Interest/returns earned this year (baseline)
    let baselineAnnualTotalContributions = 0  // Total contributions (scheduled + allocated) this year (baseline)

    // Use the last month of the year for point-in-time values (net worth, age)
    const lastMonthBaseline = baselineProjection[endMonth - 1]
    const lastMonthScenario = scenarioProjection[endMonth - 1]

    // Accumulate goal breakdowns across ALL months (not just last month!)
    const yearScenarioImpacts = new Map<string, { name: string; type: 'goal' | 'action' | 'event'; cashFlowImpact: number; netWorthImpact: number }>()

    // Detect allocation changes early so we can use this info when tracking contributions
    // Check if scenario data has toAccountType/fromAccountType (Portfolio Switch pattern)
    const activeAllocationChanges: string[] = []
    if (scenarios) {
      Object.entries(scenarios).forEach(([scenarioId, config]) => {
        // Portfolio Switch scenarios have toAccountType and fromAccountType in data
        // This is robust regardless of scenario renaming or ID changes
        const hasAllocationChange = config.data?.toAccountType && config.data?.fromAccountType
        if (config.enabled && hasAllocationChange) {
          activeAllocationChanges.push(scenarioId)
        }
      })
    }

    for (let month = startMonth; month < endMonth; month++) {
      const baselinePoint = baselineProjection[month]
      const scenarioPoint = scenarioProjection[month]
      if (!baselinePoint || !scenarioPoint) continue

      // Accumulate baseline net cash flow (AFTER contributions)
      baselineAnnualNetCashFlow += baselinePoint.cashFlow

      // Accumulate scenario net cash flow (AFTER contributions)
      scenarioAnnualNetCashFlow += scenarioPoint.cashFlow

      // Note: cashFlow now represents netIncome - expenses (where netIncome = gross - tax - NI)
      // No separate "before contributions" field needed - it's the same as cashFlow

      // Track BASELINE contributions separately
      if (baselinePoint.breakdown.cashFlowAllocations) {
        const baselineAllocs = baselinePoint.breakdown.cashFlowAllocations
        baselineAnnualPensionContribution += baselineAllocs.pension || 0
        // Separate HYSA (4.5% savings goals) from 0% cash savings
        baselineAnnualHYSAContribution += baselineAllocs.hysa || 0  // Emergency Fund, Education Fund, House Deposit (4.5%)
        baselineAnnualSavingsContribution += (baselineAllocs.currentAccount || 0) +  // 0% checking
          (baselineAllocs.generalInvestment || 0) +  // 0% auto-savings
          (baselineAllocs.defaultSavings || 0)  // 0% cash savings
        baselineAnnualInvestmentContribution += baselineAllocs.equities || 0
      }
      if (baselinePoint.breakdown.cashFlowLiquidations) {
        const baselineLiqs = baselinePoint.breakdown.cashFlowLiquidations
        // Track pension withdrawals separately (as negative values)
        baselineAnnualPensionWithdrawal -= (baselineLiqs.pension || 0)  // Make it negative
        // Separate HYSA liquidations from 0% cash liquidations
        baselineAnnualHYSAContribution -= baselineLiqs.hysa || 0
        baselineAnnualSavingsContribution -= (baselineLiqs.currentAccount || 0) +
          (baselineLiqs.generalInvestment || 0) +
          (baselineLiqs.defaultSavings || 0)
        baselineAnnualInvestmentContribution -= baselineLiqs.equities || 0
      }

      // Use scenario projection for income/expense breakdown (includes goal impacts)
      const point = scenarioPoint
      annualIncome += point.breakdown.income  // Scenario total income (baseline + goals)
      annualScenarioIncome += point.breakdown.scenarioNetCashFlow  // Net cash flow impact from scenarios
      annualExpenses += point.breakdown.expenses  // Scenario total expenses (baseline + goals)

      // Use baseline projection for baseline-only income/expenses (no goal impacts)
      annualBaselineIncome += baselinePoint.breakdown.income  // TRUE baseline income from baseline projection
      baselineAnnualExpenses += baselinePoint.breakdown.expenses  // TRUE baseline expenses from baseline projection

      // Aggregate engine-calculated pension income and tax/NI values for BOTH baseline and scenario
      // SCENARIO values (includes goal impacts)
      annualStatePensionIncome += point.breakdown.statePensionIncome || 0
      annualPrivatePensionIncome += point.breakdown.privatePensionIncome || 0
      annualIncomeTax += point.breakdown.incomeTax || 0
      annualNationalInsurance += point.breakdown.nationalInsurance || 0

      // BASELINE values (no goal impacts)
      baselineAnnualStatePensionIncome += baselinePoint.breakdown.statePensionIncome || 0
      baselineAnnualPrivatePensionIncome += baselinePoint.breakdown.privatePensionIncome || 0
      baselineAnnualIncomeTax += baselinePoint.breakdown.incomeTax || 0
      baselineAnnualNationalInsurance += baselinePoint.breakdown.nationalInsurance || 0

      // Business income aggregation for SCENARIO
      annualBusinessRevenue += point.breakdown.businessRevenue || 0
      annualBusinessCosts += point.breakdown.businessCosts || 0
      annualBusinessProfit += point.breakdown.businessProfit || 0
      annualCorporationTax += point.breakdown.corporationTax || 0
      annualBusinessNetProfit += point.breakdown.businessNetProfit || 0

      // Business income aggregation for BASELINE
      baselineAnnualBusinessRevenue += baselinePoint.breakdown.businessRevenue || 0
      baselineAnnualBusinessCosts += baselinePoint.breakdown.businessCosts || 0
      baselineAnnualBusinessProfit += baselinePoint.breakdown.businessProfit || 0
      baselineAnnualCorporationTax += baselinePoint.breakdown.corporationTax || 0
      baselineAnnualBusinessNetProfit += baselinePoint.breakdown.businessNetProfit || 0

      // Accumulate surplus cash (available for allocation after automated allocations & savings goals)
      annualSurplusCash += point.breakdown.surplusCash || 0

      // Accumulate growth drivers (compound growth and contributions) for SCENARIO
      annualCompoundGrowth += point.breakdown.compoundGrowth || 0
      annualTotalContributions += point.breakdown.totalContributionsThisPeriod || 0

      // Accumulate growth drivers for BASELINE
      baselineAnnualCompoundGrowth += baselinePoint.breakdown.compoundGrowth || 0
      baselineAnnualTotalContributions += baselinePoint.breakdown.totalContributionsThisPeriod || 0

      // Accumulate goal breakdowns from this month
      if (point.breakdown.goalBreakdowns) {
        point.breakdown.goalBreakdowns.forEach((goal: any) => {
          // Group by scenarioId (for multi-component scenarios) or name (for single-component)
          const scenarioId = goal.scenarioId || goal.name
          const existing = yearScenarioImpacts.get(scenarioId)
          if (existing) {
            // Sum cash flow impacts across all months and all components
            existing.cashFlowImpact += goal.cashFlowImpact
            existing.netWorthImpact += goal.netWorthImpact  // Sum net worth impacts too
          } else {
            // First occurrence this year
            yearScenarioImpacts.set(scenarioId, {
              name: scenarioId,  // Use scenarioId as display name for grouping
              type: goal.type || 'goal',  // Fallback to 'goal' if type is undefined
              cashFlowImpact: goal.cashFlowImpact,
              netWorthImpact: goal.netWorthImpact
            })
          }
        })
      }

      // Track individual savings goal contributions by name (Emergency Fund, Education Fund, etc.)
      const savingsGoalNames = ['Emergency Fund', 'Education Fund', 'House Deposit']

      // Track SCENARIO contributions separately (for display in charts)
      // 1. First add scheduled contributions (fixed monthly payments like ISA, mortgage)
      if (point.breakdown.scheduledContributions) {
        Object.entries(point.breakdown.scheduledContributions).forEach(([accountName, amount]) => {
          const name = accountName.toLowerCase()

          // NEW: Track individual account contributions
          accountContributions[accountName] = (accountContributions[accountName] || 0) + amount

          // Check if this is a savings goal fund (Emergency Fund, Education Fund, House Deposit)
          const isSavingsGoal = savingsGoalNames.some(goalName =>
            accountName.toLowerCase().includes(goalName.toLowerCase())
          )

          // Keep legacy aggregated tracking for backward compatibility
          if (isSavingsGoal) {
            savingsGoalContributions[accountName] = (savingsGoalContributions[accountName] || 0) + amount
            scenarioAnnualHYSAContribution += amount
          } else if (name.includes('isa')) {
            scenarioAnnualISAContribution += amount
          } else if (name.includes('pension')) {
            scenarioAnnualPensionContribution += amount
          } else if (name.includes('mortgage') || name.includes('loan') || name.includes('debt')) {
            scenarioAnnualDebtPayment += amount
          } else if (name.includes('cash') || name.includes('savings')) {
            scenarioAnnualSavingsContribution += amount
          } else {
            // Default: treat unknown accounts as cash
            scenarioAnnualSavingsContribution += amount
          }
        })
      }

      // 2. Then add automated allocations (percentage-based surplus allocation)
      if (point.breakdown.cashFlowAllocations) {
        const scenarioAllocs = point.breakdown.cashFlowAllocations

        // Map asset class allocations to account names for individual tracking
        if (scenarioAllocs.pension) {
          // Check if there's already a pension account from scheduled contributions
          const existingPensionAccount = Object.keys(accountContributions).find(name =>
            name.toLowerCase().includes('pension') && !name.toLowerCase().includes('state')
          )
          const pensionAccountName = existingPensionAccount || 'Pension Contributions'
          accountContributions[pensionAccountName] = (accountContributions[pensionAccountName] || 0) + scenarioAllocs.pension
          scenarioAnnualPensionContribution += scenarioAllocs.pension
        }

        if (scenarioAllocs.equities) {
          const isaAccountName = 'Private ISA'
          accountContributions[isaAccountName] = (accountContributions[isaAccountName] || 0) + scenarioAllocs.equities
          scenarioAnnualISAContribution += scenarioAllocs.equities
        }

        if (scenarioAllocs.hysa) {
          const hysaAccountName = 'HYSA (Savings Goals)'
          accountContributions[hysaAccountName] = (accountContributions[hysaAccountName] || 0) + scenarioAllocs.hysa
          scenarioAnnualHYSAContribution += scenarioAllocs.hysa
        }

        // Check if general investment is going to investment account (7% returns) or cash (0% returns)
        const generalInvestmentAmount = scenarioAllocs.generalInvestment || 0
        const currentAccountAmount = scenarioAllocs.currentAccount || 0
        const defaultSavingsAmount = scenarioAllocs.defaultSavings || 0

        const hasInvestmentAllocation = activeAllocationChanges.some(scenarioId => {
          const config = scenarios?.[scenarioId]
          // Check both surplusAllocation (100% routing) and automatedAllocationPercentages (Portfolio Switch)
          const hasSurplusGIA = config?.data?.assumptions?.surplusAllocation?.assetClass === 'generalInvestment'
          const hasAutomatedGIA = config?.data?.toAccountType === 'general_investment'
          return hasSurplusGIA || hasAutomatedGIA
        })

        if (hasInvestmentAllocation && generalInvestmentAmount > 0) {
          // General investment allocated to 7% investment account
          const giaAccountName = 'General Investment Account'
          accountContributions[giaAccountName] = (accountContributions[giaAccountName] || 0) + generalInvestmentAmount
          scenarioAnnualInvestmentContribution += generalInvestmentAmount
        } else if (generalInvestmentAmount > 0) {
          // General investment going to 0% cash account (only when not explicitly allocated)
          const cashAccountName = 'Cash Savings'
          accountContributions[cashAccountName] = (accountContributions[cashAccountName] || 0) + generalInvestmentAmount
          scenarioAnnualSavingsContribution += generalInvestmentAmount
        }

        // Current account and default savings always 0% cash
        if (currentAccountAmount > 0) {
          accountContributions['Current Account'] = (accountContributions['Current Account'] || 0) + currentAccountAmount
          scenarioAnnualSavingsContribution += currentAccountAmount
        }
        if (defaultSavingsAmount > 0) {
          accountContributions['Cash Savings'] = (accountContributions['Cash Savings'] || 0) + defaultSavingsAmount
          scenarioAnnualSavingsContribution += defaultSavingsAmount
        }
      }
      // 3. NEW: Add account-level withdrawals (liquidationAccounts from sim-core)
      if (point.breakdown.liquidationAccounts) {
        Object.entries(point.breakdown.liquidationAccounts).forEach(([accountName, amount]) => {
          // Withdrawals are positive in liquidationAccounts, so negate them for display
          accountContributions[accountName] = (accountContributions[accountName] || 0) - amount
        })
      }

      // 4. Track asset class liquidations for legacy fields
      if (point.breakdown.cashFlowLiquidations) {
        const scenarioLiqs = point.breakdown.cashFlowLiquidations

        // Track pension withdrawals separately (DON'T subtract from contributions!)
        scenarioAnnualPensionWithdrawal -= (scenarioLiqs.pension || 0)  // Make it negative

        // Subtract ISA liquidations
        scenarioAnnualISAContribution -= scenarioLiqs.equities || 0
        // Separate HYSA liquidations from 0% cash liquidations
        scenarioAnnualHYSAContribution -= scenarioLiqs.hysa || 0
        scenarioAnnualSavingsContribution -= (scenarioLiqs.currentAccount || 0) +
          (scenarioLiqs.generalInvestment || 0) +
          (scenarioLiqs.defaultSavings || 0)
        // Subtract taxable investment liquidations
        scenarioAnnualInvestmentContribution -= 0  // Reserved for non-ISA taxable equities
      }
    }

    // Add allocation changes to yearScenarioImpacts (they don't create goalBreakdowns automatically)
    if (scenarios) {
      activeAllocationChanges.forEach(scenarioId => {
        const config = scenarios[scenarioId]
        const isQuitJob = config?.data?.name === 'Quit Job'

        // Calculate cash flow impact for QUIT_JOB by summing monthly net cash flow differences
        // This must be recalculated every year, not just the first year
        let cashFlowImpact = 0
        if (isQuitJob) {
          // Find the quit date to determine when the modifier becomes active
          const quitDate = config?.data?.startDate
          const quitPeriod = quitDate ?
            (new Date(quitDate).getFullYear() - startYear) * 12 + new Date(quitDate).getMonth() :
            0

          // Only sum cash flow deltas for months after the quit date
          for (let i = startMonth; i < endMonth; i++) {
            // Skip months before the quit date
            if (i < quitPeriod) continue

            const baselinePoint = baselineProjection[i]
            const scenarioPoint = scenarioProjection[i]

            if (baselinePoint && scenarioPoint) {
              cashFlowImpact += (scenarioPoint.cashFlow - baselinePoint.cashFlow)
            }
          }
        }

        if (!yearScenarioImpacts.has(scenarioId)) {
          // First time seeing this scenario - create entry
          yearScenarioImpacts.set(scenarioId, {
            name: scenarioId,
            type: config.type as 'goal' | 'action' | 'event',
            cashFlowImpact: isQuitJob ? cashFlowImpact : 0,  // Calculate for QUIT_JOB, 0 for other allocation changes
            netWorthImpact: 0   // Will be calculated below
          })
        } else if (isQuitJob) {
          // Scenario already exists - update cash flow impact for QUIT_JOB
          const existing = yearScenarioImpacts.get(scenarioId)
          if (existing) {
            existing.cashFlowImpact = cashFlowImpact
          }

          // Debug logging for key years
          if (actualYear === 2026 || actualYear === 2027 || actualYear === 2030) {
            console.log(`💸 Year ${actualYear} QUIT_JOB Cash Flow Impact: £${Math.round(cashFlowImpact).toLocaleString()}`)
          }
        }
      })
    }

    // Calculate net worth impact for allocation changes
    // First: calculate total delta, then subtract what's already attributed to non-allocation scenarios
    const baselineNetWorth = lastMonthBaseline?.netWorth || 0
    const scenarioNetWorth = lastMonthScenario?.netWorth || 0
    const totalNetWorthDelta = scenarioNetWorth - baselineNetWorth

    // Calculate net worth already attributed to non-allocation scenarios
    let nonAllocationNetWorth = 0
    yearScenarioImpacts.forEach((impact, scenarioId) => {
      const scenarioData = scenarios?.[scenarioId]
      const isAllocationChange = scenarioData?.data?.archetype === 'allocation_config_change'
      if (!isAllocationChange) {
        nonAllocationNetWorth += impact.netWorthImpact || 0
      }
    })

    // Remaining net worth delta attributable to allocation changes
    const allocationNetWorthDelta = totalNetWorthDelta - nonAllocationNetWorth

    if (activeAllocationChanges.length === 1) {
      // Single allocation change active - attribute remaining delta to it
      const scenarioId = activeAllocationChanges[0]
      const existing = yearScenarioImpacts.get(scenarioId)
      if (existing) {
        existing.netWorthImpact = allocationNetWorthDelta
      }
    } else if (activeAllocationChanges.length > 1 && scenarios) {
      // Multiple allocation changes active - distribute proportionally based on contribution amounts
      // Calculate allocation deltas for each account type
      const pensionDelta = scenarioAnnualPensionContribution - baselineAnnualPensionContribution
      const savingsDelta = scenarioAnnualSavingsContribution - baselineAnnualSavingsContribution
      const totalAbsDelta = Math.abs(pensionDelta) + Math.abs(savingsDelta)

      if (totalAbsDelta > 0) {
        // Distribute remaining net worth delta proportionally to contribution deltas
        activeAllocationChanges.forEach((scenarioId) => {
          const scenarioData = scenarios[scenarioId]
          const targetAccount = scenarioData?.data?.assumptions?.surplusAllocation?.assetClass

          // Estimate this scenario's share of total contribution delta
          let shareRatio = 0
          if (targetAccount === 'pension') {
            shareRatio = Math.abs(pensionDelta) / totalAbsDelta
          } else if (targetAccount === 'generalInvestment' || targetAccount === 'defaultSavings') {
            shareRatio = Math.abs(savingsDelta) / totalAbsDelta
          }

          const existing = yearScenarioImpacts.get(scenarioId)
          if (existing) {
            existing.netWorthImpact = allocationNetWorthDelta * shareRatio
          }
        })
      }
    }

    const age = startAge + yearIndex
    const actualYear = startYear + yearIndex

    // Log net worth impact for key years to debug allocation changes
    if (activeAllocationChanges.length === 1 && (actualYear === 2025 || actualYear === 2030 || actualYear === 2035 || actualYear === 2040)) {
      const scenarioId = activeAllocationChanges[0]
      console.log(`💰 Year ${actualYear} Net Worth Impact:`, {
        baselineNetWorth: Math.round(baselineNetWorth),
        scenarioNetWorth: Math.round(scenarioNetWorth),
        delta: Math.round(allocationNetWorthDelta),
        scenarioId
      })
    }

    // ALWAYS show allocated accounts even if amount is zero (similar to Cash Savings)
    // Check for ANY active allocation (pension, savings, investments) that is active THIS YEAR
    // Only show if we can confirm the allocation has started (conservative approach)

    // Map allocation types to their destination account names (camelCase for asset classes)
    const allocationAccountMap: Record<string, string> = {
      'generalInvestment': 'General Investment Account',
      'pension': 'Pension Contributions',
      'defaultSavings': 'Cash Savings',
      'hysa': 'Emergency Fund (HYSA)',
      'equities': 'Private ISA'
    }

    // Map to return rates (defaults if not specified)
    const allocationReturnRates: Record<string, number> = {
      'generalInvestment': 7,
      'pension': 6,
      'defaultSavings': 0,
      'hysa': 4.5,
      'equities': 7
    }

    // Find all active allocations and seed their destination accounts
    activeAllocationChanges.forEach(scenarioId => {
      const config = scenarios?.[scenarioId]

      // Check if allocation is active in this year (respect start date)
      const startDate = config?.data?.startDate ? new Date(config.data.startDate) : null
      if (!startDate) {
        return
      }

      const startYearOfAllocation = startDate.getFullYear()

      // Only show accounts if allocation has started by this year
      if (actualYear < startYearOfAllocation) {
        return
      }

      // Collect all asset classes from both surplusAllocation and automatedAllocationPercentages
      const assetClassesToSeed = new Set<string>()

      // Check surplusAllocation (100% routing to single asset class)
      if (config?.data?.assumptions?.surplusAllocation?.assetClass) {
        assetClassesToSeed.add(config.data.assumptions.surplusAllocation.assetClass)
      }

      // Check automatedAllocationPercentages (partial percentages across multiple asset classes)
      if (config?.data?.assumptions?.automatedAllocationPercentages) {
        Object.keys(config.data.assumptions.automatedAllocationPercentages).forEach(assetClass => {
          const percentage = config.data.assumptions.automatedAllocationPercentages[assetClass]
          // Only seed if percentage is greater than 0
          if (percentage > 0) {
            assetClassesToSeed.add(assetClass)
          }
        })
      }

      // Seed account for each asset class
      assetClassesToSeed.forEach(assetClass => {
        const accountName = allocationAccountMap[assetClass]
        if (accountName && !(accountName in accountContributions)) {
          accountContributions[accountName] = 0

          // Set return rate from allocation config's expectedReturn or default
          const returnRate = config.data?.assumptions?.expectedReturn || allocationReturnRates[assetClass] || 7
          accountReturnRates.set(accountName, returnRate)
        }
      })
    })

    // Get asset and debt breakdowns from last month of the year
    const baselineAssetBreakdown = lastMonthBaseline?.breakdown.assetCategories || []
    const scenarioAssetBreakdown = lastMonthScenario?.breakdown.assetCategories || []
    const baselineDebtBreakdown = lastMonthBaseline?.breakdown.debtCategories || []
    const scenarioDebtBreakdown = lastMonthScenario?.breakdown.debtCategories || []


    // Calculate growth rates (compare to previous year)
    const currentBaselineNetWorth = lastMonthBaseline?.netWorth || 0
    const currentScenarioNetWorth = lastMonthScenario?.netWorth || 0
    const previousYearData = annualData[yearIndex - 1]

    let baselineGrowth = 0
    let scenarioGrowth = 0
    let baselineGrowthRate = 0
    let scenarioGrowthRate = 0

    if (previousYearData) {
      baselineGrowth = currentBaselineNetWorth - (previousYearData.baseline || 0)
      scenarioGrowth = currentScenarioNetWorth - (previousYearData.scenario || 0)

      if (previousYearData.baseline && previousYearData.baseline !== 0) {
        baselineGrowthRate = (baselineGrowth / previousYearData.baseline) * 100
      }
      if (previousYearData.scenario && previousYearData.scenario !== 0) {
        scenarioGrowthRate = (scenarioGrowth / previousYearData.scenario) * 100
      }
    }

    // Net wealth growth attribution:
    // ΔNetWorth = Contributions + Investment Returns
    // 
    // Contributions = Positive cash contributions to accounts (pension, savings, investments)
    //                 Includes ALL deposited amounts, whether from income or other sources
    // Investment Returns = Compound growth on existing balances + growth on new contributions
    //                      This is the residual: ΔNW - Contributions

    // Total contributions (pension + cash + HYSA + investments) tracked separately for baseline vs scenario
    const baselineTotalContributions = baselineAnnualPensionContribution + baselineAnnualSavingsContribution + baselineAnnualHYSAContribution + baselineAnnualInvestmentContribution
    const scenarioTotalContributions = scenarioAnnualPensionContribution + scenarioAnnualSavingsContribution + scenarioAnnualHYSAContribution + scenarioAnnualInvestmentContribution

    // Investment returns = ΔNW - Total Contributions
    // (Growth from compound interest on existing assets + partial-year growth on new contributions)
    const baselineInvestmentReturns = baselineGrowth - baselineTotalContributions
    const scenarioInvestmentReturns = scenarioGrowth - scenarioTotalContributions

    // Tolerance check: verify ΔNW = Contributions + Investment Returns (within £5 or 0.1%)
    const baselineVerification = Math.abs(baselineGrowth - (baselineTotalContributions + baselineInvestmentReturns))
    const scenarioVerification = Math.abs(scenarioGrowth - (scenarioTotalContributions + scenarioInvestmentReturns))
    const verificationTolerance = Math.max(5, Math.abs(baselineGrowth) * 0.001) // £5 or 0.1% of growth

    if (previousYearData && baselineVerification > verificationTolerance) {
      console.warn(`Year ${actualYear}: Baseline verification failed - ΔNW: £${baselineGrowth.toFixed(2)}, Expected: £${(baselineTotalContributions + baselineInvestmentReturns).toFixed(2)}, Diff: £${baselineVerification.toFixed(2)}`)
    }
    if (previousYearData && scenarioVerification > verificationTolerance) {
      console.warn(`Year ${actualYear}: Scenario verification failed - ΔNW: £${scenarioGrowth.toFixed(2)}, Expected: £${(scenarioTotalContributions + scenarioInvestmentReturns).toFixed(2)}, Diff: £${scenarioVerification.toFixed(2)}`)
    }


    // Tax and NI are now calculated by the engine and aggregated above
    // Use the engine-provided annual values directly for both baseline and scenario
    const scenarioAnnualTax = annualIncomeTax
    const scenarioAnnualNI = annualNationalInsurance
    const baselineAnnualTax = baselineAnnualIncomeTax
    const baselineAnnualNI = baselineAnnualNationalInsurance

    // Calculate employment income (gross income minus pension income) for display
    // Use scenario pension values for scenario employment income
    const scenarioEmploymentIncome = Math.max(0, annualIncome - annualStatePensionIncome - annualPrivatePensionIncome)
    // Use baseline pension values for baseline employment income
    const baselineEmploymentIncome = Math.max(0, annualBaselineIncome - baselineAnnualStatePensionIncome - baselineAnnualPrivatePensionIncome)

    // Net cash flow is already calculated as: netIncome - expenses (where netIncome = gross - tax - NI)
    // So cashFlow from sim-core already has tax/NI deducted - use it directly
    const baselineDisplayCashFlow = baselineAnnualNetCashFlow
    const scenarioDisplayCashFlow = scenarioAnnualNetCashFlow

    // Calculate scenario delta for stacked bar chart (backward compatibility)
    const scenarioDelta = scenarioDisplayCashFlow - baselineDisplayCashFlow

    // Build individual scenario impact fields from ACCUMULATED goal breakdowns
    // Store raw impact values (positive or negative) under single scenario key
    // Recharts will automatically render negative values below the x-axis
    // Use composite key (name::type) to match sim-core's yearGoalBreakdowns keying strategy
    const scenarioImpacts: Record<string, number> = {}

    yearScenarioImpacts.forEach((goal) => {
      // Create unique key using just the name (scenarioId already ensures uniqueness)
      const sanitizedKey = goal.name.replace(/[^a-zA-Z0-9]/g, '_')
      const impact = goal.cashFlowImpact
      const key = `scenario_${sanitizedKey}`

      // yearScenarioImpacts already contains the accumulated sum from all months (see lines 476-491)
      // Just assign the value - do NOT accumulate again (that was causing double-counting)
      scenarioImpacts[key] = impact
    })

    // ALWAYS show Cash Savings (0%) even if amount is zero
    // This makes allocation clear to users - they can see that £0 means everything is allocated
    // Note: Surplus Cash is calculated internally but NOT shown as a separate chart item
    // to avoid double-counting (surplus is already allocated to Cash Savings or other accounts)
    // IMPORTANT: Must be done BEFORE creating the dataPoint so it gets included in accountBreakdown + spread
    const cashAccountName = 'Cash Savings'
    if (!(cashAccountName in accountContributions)) {
      accountContributions[cashAccountName] = 0
    }

    const dataPoint: ChartDataPoint = {
      year: yearIndex,
      yearLabel: String(actualYear),
      actualYear,
      age,
      // Net cash flow for BOTH baseline and scenario (original values for tooltip)
      baselineNetCashFlow: baselineDisplayCashFlow,
      scenarioNetCashFlow: scenarioDisplayCashFlow,
      // Stacked bar chart values: baseline + delta
      baselineCashFlowBar: baselineDisplayCashFlow,
      scenarioDeltaBar: scenarioDelta,  // Deprecated - kept for backward compatibility
      // Individual scenario impacts (dynamic fields)
      ...scenarioImpacts,
      // Net cash flow impact from scenarios (all goals/events/actions combined) - use this for charts!
      scenarioIncome: annualScenarioIncome,  // Actually scenarioNetCashFlow, keeping name for chart compatibility
      // Income/expense breakdown from scenario
      income: annualIncome,
      // Show gross salary (before tax/NI) and tax/NI as separate line items
      // SCENARIO values (includes job loss impact)
      grossSalary: scenarioEmploymentIncome,
      salary: scenarioEmploymentIncome - scenarioAnnualTax - scenarioAnnualNI, // Net employment income after tax/NI
      incomeTax: scenarioAnnualTax,
      nationalInsurance: scenarioAnnualNI,
      // BASELINE values (for comparison when scenarios are active)
      baselineIncome: annualBaselineIncome,
      baselineExpenses: baselineAnnualExpenses,
      baselineGrossSalary: baselineEmploymentIncome,
      baselineIncomeTax: baselineAnnualTax,
      baselineNationalInsurance: baselineAnnualNI,
      // Business income tracking (separate from employment income)
      businessRevenue: annualBusinessRevenue,
      businessCosts: annualBusinessCosts,
      businessProfit: annualBusinessProfit,
      corporationTax: annualCorporationTax,
      businessNetProfit: annualBusinessNetProfit,
      baselineBusinessRevenue: baselineAnnualBusinessRevenue,
      baselineBusinessCosts: baselineAnnualBusinessCosts,
      baselineBusinessProfit: baselineAnnualBusinessProfit,
      baselineCorporationTax: baselineAnnualCorporationTax,
      baselineBusinessNetProfit: baselineAnnualBusinessNetProfit,
      pensionIncome: annualStatePensionIncome + annualPrivatePensionIncome, // Total pension income
      statePensionIncome: annualStatePensionIncome,
      privatePensionIncome: annualPrivatePensionIncome,
      expenses: annualExpenses,
      // Use profile's actual expense breakdown if available, otherwise fall back to percentages
      housing: profile?.expenseBreakdown ? profile.expenseBreakdown.housing * 12 : annualExpenses * 0.40,
      utilities: profile?.expenseBreakdown ? profile.expenseBreakdown.utilities * 12 : annualExpenses * 0.10,
      food: profile?.expenseBreakdown ? profile.expenseBreakdown.food * 12 : annualExpenses * 0.25,
      transport: profile?.expenseBreakdown ? profile.expenseBreakdown.transport * 12 : annualExpenses * 0.15,
      subscriptions: profile?.expenseBreakdown ? profile.expenseBreakdown.subscriptions * 12 : annualExpenses * 0.05,
      leisure: profile?.expenseBreakdown ? profile.expenseBreakdown.leisure * 12 : annualExpenses * 0.10,
      other: profile?.expenseBreakdown ? profile.expenseBreakdown.other * 12 : annualExpenses * 0.20,
      // Net worth for BOTH baseline and scenario
      baseline: currentBaselineNetWorth,
      scenario: currentScenarioNetWorth,
      // Asset/Debt split (assets - debts = net wealth)
      baselineAssets: lastMonthBaseline?.breakdown.assetValue || 0,
      baselineDebts: lastMonthBaseline?.breakdown.debtValue || 0,  // Already positive
      scenarioAssets: lastMonthScenario?.breakdown.assetValue || 0,
      scenarioDebts: lastMonthScenario?.breakdown.debtValue || 0,  // Already positive
      // Asset class breakdowns with growth rates
      baselineAssetBreakdown,
      scenarioAssetBreakdown,
      baselineDebtBreakdown,
      scenarioDebtBreakdown,
      // Annual growth calculations
      baselineGrowth,
      scenarioGrowth,
      baselineGrowthRate,
      scenarioGrowthRate,
      // Verification fields: ΔNW = netCashFlow + investmentReturns
      baselineTotalContributions,
      scenarioTotalContributions,
      baselineInvestmentReturns,
      scenarioInvestmentReturns,
      // Account contributions (annual accumulated values) - use scenario for display
      // Shows positive bars for contributions (working years) and negative bars for withdrawals (retirement)
      cash: scenarioAnnualSavingsContribution,  // 0% cash savings (currentAccount, generalInvestment, defaultSavings)
      hysa: scenarioAnnualHYSAContribution,  // 4.5% HYSA (Emergency Fund, Education Fund, House Deposit)
      pension: scenarioAnnualPensionContribution + scenarioAnnualPensionWithdrawal,  // Positive = contributions, Negative = withdrawals
      pensionWithdrawal: scenarioAnnualPensionWithdrawal,  // Keep for cash flow chart
      isa: scenarioAnnualISAContribution,  // Private ISA contributions (ISA-wrapped equities)
      investments: scenarioAnnualInvestmentContribution,  // Taxable investments (non-ISA equities)
      debt: scenarioAnnualDebtPayment,  // Debt payments (mortgage, loans)
      savingsGoals: savingsGoalContributions,  // Individual savings goal contributions by fund name
      // Goal/action/event impacts accumulated across the year
      goalBreakdowns: Array.from(yearScenarioImpacts.values()),
      // NEW: Individual account contributions with return rates (sorted alphabetically)
      accountBreakdown: Object.entries(accountContributions)
        .sort(([a], [b]) => a.localeCompare(b))  // Sort alphabetically
        .map(([name, amount]) => ({
          name,
          amount,
          returnRate: accountReturnRates.get(name) || 0  // Get return rate from metadata, default to 0%
        })),
      // Growth driver tracking - shows what's driving net wealth changes (SCENARIO)
      compoundGrowth: annualCompoundGrowth,  // Interest/returns earned this year (scenario)
      totalContributionsThisPeriod: annualTotalContributions,  // Total contributions (scenario)
      // Growth driver tracking - shows what's driving net wealth changes (BASELINE)
      baselineCompoundGrowth: baselineAnnualCompoundGrowth,  // Interest/returns earned this year (baseline)
      baselineTotalContributionsThisPeriod: baselineAnnualTotalContributions,  // Total contributions this period (baseline)
      // NEW: Transform accountContributions into individual properties for Recharts (sorted order)
      ...Object.fromEntries(
        Object.entries(accountContributions)
          .sort(([a], [b]) => a.localeCompare(b))  // Sort alphabetically
          .map(([name, amount]) => [
            `account_${name.replace(/[^a-zA-Z0-9]/g, '_')}`,  // Sanitize name for property key
            amount
          ])
      )
    }

    // Validation: Account contributions should equal net cash flow
    const totalAccountContributions =
      scenarioAnnualSavingsContribution +
      scenarioAnnualHYSAContribution +
      (scenarioAnnualPensionContribution + scenarioAnnualPensionWithdrawal) +
      scenarioAnnualISAContribution +
      scenarioAnnualInvestmentContribution +
      scenarioAnnualDebtPayment

    const difference = Math.abs(totalAccountContributions - scenarioDisplayCashFlow)
    const contributionTolerance = Math.max(10, Math.abs(scenarioDisplayCashFlow) * 0.01) // £10 or 1% of cash flow

    if (difference > contributionTolerance && yearIndex < 5) {
      console.warn(`[Year ${actualYear}] Account contributions mismatch:`)
      console.warn(`  Net Cash Flow: £${scenarioDisplayCashFlow.toLocaleString()}`)
      console.warn(`  Account Contributions Total: £${totalAccountContributions.toLocaleString()}`)
      console.warn(`  Components:`)
      console.warn(`    - Cash (0%): £${scenarioAnnualSavingsContribution.toLocaleString()}`)
      console.warn(`    - HYSA (4.5%): £${scenarioAnnualHYSAContribution.toLocaleString()}`)
      console.warn(`    - Pension: £${(scenarioAnnualPensionContribution + scenarioAnnualPensionWithdrawal).toLocaleString()}`)
      console.warn(`    - ISA: £${scenarioAnnualISAContribution.toLocaleString()}`)
      console.warn(`    - Investments: £${scenarioAnnualInvestmentContribution.toLocaleString()}`)
      console.warn(`    - Debt: £${scenarioAnnualDebtPayment.toLocaleString()}`)
      console.warn(`  Difference: £${difference.toLocaleString()}`)
    }

    annualData.push(dataPoint)
  }

  return annualData
}

export function useSimulation(): SimulationResults {
  const { state } = useScenarioStore()

  return useMemo(() => {
    const years = 100 - state.currentAge // Project until age 100
    const startYear = 2025
    const startMonth = 0 // January (0-indexed)

    // Build sim-core scenario from profile and enabled scenarios
    const scenario = buildSimulationScenario(
      state.selectedProfile,
      state.currentAge,
      state.retirementAge,
      state.scenarios,
      state.pensionConfig
    )

    console.log('[useSimulation] 🧬 Scenario Built. Modifiers:',
      scenario.modifiers.map(m => ({ id: m.id, type: m.archetype, amount: (m as any).targetAmount ?? (m as any).monthlyContribution }))
    )

    // Run simulation - generate BOTH baseline and scenario projections
    const simulator = new ScenarioSimulator(scenario, years, startYear, startMonth)

    // Always run baseline for comparison
    const baselineResult = simulator.generateBaselineProjection()
    const baselineProjection = baselineResult.projection

    // Run scenario projection only if modifiers exist, otherwise reuse baseline
    let scenarioProjection = baselineProjection
    let solvency = baselineResult.solvency

    if (scenario.modifiers.length > 0) {
      const scenarioResult = simulator.generateScenarioProjection()
      scenarioProjection = scenarioResult.projection
      solvency = scenarioResult.solvency
    }

    // Extract account metadata (name + performance rate) from scenario baseline accounts
    // Convert monthly rate back to annual percentage (ratePerPeriod * 12 * 100)
    const accountsMetadata = scenario.baseline.accounts.map(account => ({
      name: account.getName(),
      performance: account.getRatePerPeriod() * 12 * 100  // Convert monthly rate to annual %
    }))

    // Aggregate monthly data to annual (merge both baseline and scenario into single dataset)
    const annualData = aggregateBothToAnnual(
      baselineProjection,
      scenarioProjection,
      state.currentAge,
      startYear,
      state.retirementAge,
      state.selectedProfile,
      state.scenarios,
      accountsMetadata
    )

    // Extract final values for summary
    // Baseline summary uses baseline projection
    const baselineFinalPoint = baselineProjection[baselineProjection.length - 1]

    const baseline = {
      finalBalance: baselineFinalPoint?.netWorth || 0,
      accounts: scenario.baseline.accounts
    }

    // All charts use the same merged dataset (contains both baseline and scenario)
    const cashFlowData: ChartDataPoint[] = annualData
    const netWealthData: ChartDataPoint[] = annualData
    const attributionData: ChartDataPoint[] = annualData

    return {
      baseline,
      scenarios: {},
      chartData: {
        cashFlow: cashFlowData,
        netWealth: netWealthData,
        attribution: attributionData
      },
      modifiers: scenario.modifiers,  // Expose modifiers for tooltip metadata
      solvency,
      simulationTimestamp: Date.now()
    }
  }, [state.currentAge, state.retirementAge, state.selectedProfile, state.scenarios])
}
