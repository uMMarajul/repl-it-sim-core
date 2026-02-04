import { BalanceAccount, Frequency } from './balanceAccount'
import { ScenarioArchetype } from '../config/archetypes'
import { ARCHETYPE_PARAMETER_DEFAULTS } from '../config/archetypeDefaults'
import {
  CashFlowAllocator,
  AllocationConfig,
  AllocationResult,
  AccountRegistry,
  AccountWrapper,
  RetirementContext,
  initializePensionState,
  resetPeriodTracking
} from './cashFlowAllocator'
import {
  PensionWithdrawalState,
  UK_PENSION_RULES,
  calculateWithdrawalCapacity,
  executePensionWithdrawalGross
} from '../config/ukPensionRules'
import { calculateTaxOnIncome, calculateNationalInsurance, calculateCorporationTax } from './ukTaxCalculator'
import { ScenarioId } from '../config/scenarioTypes'
import type {
  ScenarioModifier,
  TargetedModifier,
  ConfigModifier,
  StudentLoanModifier
} from '../config/archetypeContracts'
import {
  isTargetedModifier,
  isConfigModifier,
  isStudentLoanModifier
} from '../config/archetypeContracts'

export enum AssetClass {
  CURRENT_ACCOUNT = 'currentAccount',
  HYSA = 'hysa',
  GENERAL_INVESTMENT = 'generalInvestment',
  EQUITIES = 'equities',
  PENSION = 'pension',
  BUSINESS_EQUITY = 'businessEquity',
  OTHER_ASSETS = 'otherAssets',
  DEFAULT_SAVINGS = 'defaultSavings'
}

// Backward compatibility alias
export type Goal = ScenarioModifier

export interface SimulationScenario {
  baseline: {
    accounts: BalanceAccount[]
    monthlyIncome: number  // GROSS monthly income (before tax/NI) - used for cash flow calculations
    monthlyExpenses: number
    currentAge: number
    retirementAge: number
    statePensionMonthly?: number  // Optional UK state pension after statutory state pension age (67)
    allocationConfig?: AllocationConfig  // Optional user-configurable asset allocation percentages
    monthlyIncomeTax?: number  // Monthly income tax deduction (for display only, not deducted from cash flow)
    monthlyNI?: number  // Monthly National Insurance deduction (for display only, not deducted from cash flow)
    grossAnnualSalary?: number  // Gross annual salary (for display only)
  }
  modifiers: ScenarioModifier[]
}

export interface CategoryBreakdown {
  name: string
  value: number
  annualRate?: number  // Annual interest/growth rate (%)
}

export interface ProjectionPoint {
  period: number
  cashFlow: number  // Net cash flow: netIncome - expenses (where netIncome = gross - tax - NI)
  netWorth: number
  breakdown: {
    income: number
    baselineIncome: number
    goalIncome: number  // DEPRECATED: Use scenarioIncome instead (all goals/events/actions unified)
    scenarioIncome: number  // Income from ALL scenarios (goals, events, actions)
    scenarioExpenses: number  // Expenses from ALL scenarios
    scenarioNetCashFlow: number  // Net cash flow impact from scenarios (scenarioIncome - scenarioExpenses)
    expenses: number
    baselineExpenses: number
    accountContributions: number
    goalExpenses: number
    assetValue: number
    debtValue: number
    goalImpacts: Record<string, number>
    assetCategories: CategoryBreakdown[]
    debtCategories: CategoryBreakdown[]
    // Tax and NI tracking (monthly amounts)
    incomeTax?: number  // Income tax for this period (employment income only)
    nationalInsurance?: number  // National Insurance for this period (employment income only)
    statePensionIncome?: number  // State pension income for this period
    privatePensionIncome?: number  // Private pension income for this period (liquidations from pension accounts)
    // Business income tracking (separate from employment income)
    businessRevenue?: number  // Gross business revenue for this period
    businessCosts?: number  // Business operating costs for this period
    businessProfit?: number  // Business profit before tax (revenue - costs)
    corporationTax?: number  // Corporation tax on business profit
    businessNetProfit?: number  // Business profit after corporation tax
    // Detailed scenario contributions
    goalBreakdowns: Array<{
      name: string
      scenarioId: string  // Groups related modifiers (e.g., business revenue, costs, setup)
      cashFlowImpact: number
      netWorthImpact: number
    }>
    // Allocation tracking (% of positive cash flow) - flows by asset class
    cashFlowAllocations?: Record<AssetClass, number>
    // Liquidation tracking (when cash flow negative) - flows by asset class
    cashFlowLiquidations?: Record<AssetClass, number>
    // Liquidation tracking (when cash flow negative) - flows by account name (NEW: parallel to scheduledContributions)
    liquidationAccounts?: Record<string, number>
    // Scheduled contribution tracking (fixed monthly payments) - flows by account name
    scheduledContributions?: Record<string, number>
    // Surplus cash available for allocation (after automated allocations & savings goals)
    surplusCash?: number
    // Growth driver tracking - shows what's driving net wealth changes
    compoundGrowth?: number  // Interest/returns earned this period (before contributions)
    totalContributionsThisPeriod?: number  // Total contributions (scheduled + allocated) this period
  }
}

interface ModifierAccountWrapper {
  account: BalanceAccount
  modifierId: string
  startPeriod: number
}

interface StatefulAccountBalance {
  account: BalanceAccount
  currentBalance: number
  isDebt: boolean
  ratePerPeriod: number
}

// Shared ISA tracker for unified limit enforcement across scheduled + automated contributions
export interface ISATracker {
  taxYear: number  // Current UK tax year (April-March)
  ytd: number  // Year-to-date contributions (both scheduled + automated)
}

// Solvency analysis metrics for feasibility checks
export interface SolvencyAnalysis {
  isSolvent: boolean
  minNetWorth: number // Lowest point in the projection
  firstDeficitDate?: Date // When it first goes negative
  maxDeficit: number // Maximum negative net worth (magnitude of shortfall)
  monthlySurplus: number // Average monthly surplus (for timeline estimation)

  // NEW: Liquidity Metrics
  maxCashShortfall: number // Max negative balance in LIQUID accounts (Cash, HYSA)
  availableLiquidity: number // Total value of LIQUIDATABLE assets (ISA, GIA) at worst point
  requiredLiquidation: number // Amount needed to cover cash shortfall
  canFixWithLiquidation: boolean // true if availableLiquidity > maxCashShortfall
}

export interface SimulationResult {
  projection: ProjectionPoint[]
  solvency: SolvencyAnalysis
}

// Helper to calculate solvency from a projection
function calculateSolvency(projection: ProjectionPoint[], startYear: number, startMonth: number): SolvencyAnalysis {
  let minNetWorth = Infinity
  let maxDeficit = 0
  let firstDeficitPeriod = -1
  let totalSurplus = 0
  let surplusCount = 0

  // Liquidity Tracking
  let maxCashShortfall = 0
  let worstPointLiquidatableAssets = 0

  projection.forEach((p, index) => {
    // Track min net worth
    if (p.netWorth < minNetWorth) {
      minNetWorth = p.netWorth
    }

    // Track deficit (Net Worth Insolvency)
    if (p.netWorth < 0) {
      if (firstDeficitPeriod === -1) {
        firstDeficitPeriod = index
      }
      if (Math.abs(p.netWorth) > maxDeficit) {
        maxDeficit = Math.abs(p.netWorth)
      }
    }

    // NEW: Track Liquidity Shortfall
    // We assume specific AssetClasses represent "Cash" vs "Investments"
    // Cash = CURRENT_ACCOUNT, HYSA, DEFAULT_SAVINGS
    // Liquidatable = EQUITIES (ISA), GENERAL_INVESTMENT

    // Sum liquid cash balances from breakdown if available, or approximate from netWorth - non-liquid
    // Ideally, we sum account balances directly if preserved in breakdown
    // For now, we will rely on the fact that 'debt' is negative and 'assets' are positive

    // Parse breakdown to find Cash vs Investments
    // Note: This relies on category breakdown naming conventions or additional data
    // Optimally, we simply check relevant asset categories if available

    let currentLiquidCash = 0
    let currentLiquidatableAssets = 0

    if (p.breakdown.assetCategories) {
      p.breakdown.assetCategories.forEach(cat => {
        if (['Cash Savings', 'Emergency Fund (HYSA)', 'Current Account'].includes(cat.name)) {
          currentLiquidCash += cat.value
        } else if (['Stocks & Shares ISA', 'General Investment Account'].includes(cat.name)) {
          currentLiquidatableAssets += cat.value
        }
      })
    }

    // Add surplusCash (unallocated) to liquid cash
    if (p.breakdown.surplusCash) {
      currentLiquidCash += p.breakdown.surplusCash
    }

    // Check for Cash Shortfall (Simulated by negative cash balance / overdraft)
    // Note: The simulator currently clamps assets to 0, so we might not see negative cash *balances* directly
    // unless we allow negative cash flow to accumulate as negative cash.
    // However, if netWorth is positive but cash is low, we need to infer the shortfall.

    // IMPROVEMENT: Identifying specific cash shortfalls is tricky if the engine auto-rebalances or stops at 0.
    // If the engine allows "implicit overdraft" (negative cash), we detect it here.
    // If not, we might need to verify if expenses > liquid assets in a period.

    // For this implementation, we assume the simulator has been updated (or behaves) such that
    // negative cash flow manifests as a drop in liquid assets.
    // If we can't see negative balances, we rely on NetWorth checks or assume the user is "liquid" 
    // unless NetWorth < 0.

    // REVISION based on User Request:
    // "if the user is required to liquidate assets to cover this cost"
    // This implies we check if (Liquid Cash - Expenses) < 0.

    // Since we don't have granular transaction logs here, we look for:
    // 1. Is Net Worth Positive? (Solvent)
    // 2. Is Liquid Cash near zero? (Illiquid)

    // ACTUALLY: The best proxy without deep engine changes is: 
    // If Net Worth > 0 BUT we have a "Deficit" recorded (which implies negative some-account), 
    // AND we have Investments > 0.

    // But wait, `p.netWorth` sums EVERYTHING.
    // If `p.netWorth` drops, it means we spent money.
    // If `p.netWorth` is still positive, we are Solvent.
    // We need to know if we went *negative* in specific accounts.

    // Let's assume purely negative cash flow for a moment results in negative net worth contributions? 
    // No, `evolveAccountBalance` clamps non-debt accounts to 0. 
    // So valid accounts sit at 0. 

    // CRITICAL: We need to detect "Unmet Expenses". 
    // However, the `ScenarioSimulator` doesn't currently output "Unmet Expenses".
    // It simply deducts expenses. If balance hits 0, it stays 0.

    // BUT, the `minNetWorth` check (lines 167-169) detects if TOTAL assets < debts.

    // RE-READING `evolveAccountBalance` (viewed earlier):
    // "Step 5: For assets, allow negative balance (implicit overdraft) ... currently commented out"
    // // if (!isDebt && newBalance < 0) { newBalance = 0 }

    // WAIT! I need to UNCOMMENT that logic in `evolveAccountBalance` to allow negative balances for Cash accounts!
    // Then `calculateSolvency` can see the negative cash.

    // For now, I will implement the interface and logic assuming I will fix `evolveAccountBalance` next.
    // I will scan for negative entries in `assetCategories`.

    if (p.breakdown.assetCategories) {
      p.breakdown.assetCategories.forEach(cat => {
        // Check for negative 'Cash' type accounts
        if (['Cash Savings', 'Emergency Fund (HYSA)', 'Current Account'].includes(cat.name)) {
          if (cat.value < 0) {
            // Found a cash shortfall!
            if (cat.value < maxCashShortfall) { // More negative
              maxCashShortfall = cat.value
              worstPointLiquidatableAssets = currentLiquidatableAssets // Snapshot assets at this worst moment
            }
          }
        } else if (['Stocks & Shares ISA', 'General Investment Account'].includes(cat.name)) {
          currentLiquidatableAssets += cat.value
        }
      })
    }

    // ALSO check debtCategories for Cash accounts (which appear here if negative)
    if (p.breakdown.debtCategories) {
      p.breakdown.debtCategories.forEach(cat => {
        if (['Cash Savings', 'Emergency Fund (HYSA)', 'Current Account'].includes(cat.name)) {
          // Value in debtCategories is positive (absolute debt amount)
          // Convert to negative for shortfall tracking
          const effectiveBalance = -cat.value
          if (effectiveBalance < maxCashShortfall) {
            maxCashShortfall = effectiveBalance
            worstPointLiquidatableAssets = currentLiquidatableAssets
          }
        }
      })
    }

    // Calculate average surplus (using surplusCash from breakdown)
    if (p.breakdown.surplusCash !== undefined) {
      totalSurplus += p.breakdown.surplusCash
      surplusCount++
    }
  })

  // Calculate first deficit date
  let firstDeficitDate: Date | undefined
  if (firstDeficitPeriod !== -1) {
    const totalMonths = firstDeficitPeriod
    const year = startYear + Math.floor((startMonth + totalMonths) / 12)
    const month = (startMonth + totalMonths) % 12
    firstDeficitDate = new Date(year, month, 1)
  }

  const monthlySurplus = surplusCount > 0 ? totalSurplus / surplusCount : 0

  // Normalize shortfall to positive magnitude
  const absCashShortfall = Math.abs(maxCashShortfall)

  return {
    isSolvent: minNetWorth >= 0,
    minNetWorth,
    firstDeficitDate,
    maxDeficit,
    monthlySurplus,
    // NEW Metrics
    maxCashShortfall: absCashShortfall,
    availableLiquidity: worstPointLiquidatableAssets,
    requiredLiquidation: absCashShortfall,
    canFixWithLiquidation: worstPointLiquidatableAssets >= absCashShortfall
  }
}

export class ScenarioSimulator {
  private scenario: SimulationScenario
  private periodsToProject: number
  private allocationConfig: AllocationConfig
  private baselineAllocationConfig: AllocationConfig  // Original baseline allocation (no modifiers)
  private simulationStartYear: number
  private simulationStartMonth: number
  // UK ISA contribution limit tracking (£20k annual limit, April-March tax year)
  // Shared object ensures both scheduled and automated contributions update same YTD
  // Use -999 to force reset on first period (ensures proper initialization)
  private isaTracker: ISATracker = { taxYear: -999, ytd: 0 }

  constructor(
    scenario: SimulationScenario,
    yearsToProject: number = 25,
    simulationStartYear?: number,
    simulationStartMonth?: number
  ) {
    this.scenario = scenario
    this.periodsToProject = yearsToProject * 12
    // Use provided start year/month, or default to current date for backward compatibility
    const now = new Date()
    this.simulationStartYear = simulationStartYear ?? now.getFullYear()
    this.simulationStartMonth = simulationStartMonth ?? now.getMonth()

    // Use user-provided allocation config or fall back to defaults
    const originalAllocation = scenario.baseline.allocationConfig || {
      automatedAllocationPercentages: {
        // Default: allocate 10% of surplus to equities, 5% to pension
        // Note: Savings goals (emergency fund, etc.) are now managed via explicit ScenarioModifiers
        [AssetClass.EQUITIES]: 10,
        [AssetClass.PENSION]: 5
      }
    }

    // Store original baseline allocation (deep copy to prevent mutation)
    this.baselineAllocationConfig = JSON.parse(JSON.stringify(originalAllocation))

    // Start with baseline for scenario allocation (will be modified by ALLOCATION_CONFIG_CHANGE modifiers)
    this.allocationConfig = JSON.parse(JSON.stringify(originalAllocation))

    // Apply allocation config from ALL ALLOCATION_CONFIG_CHANGE modifiers
    // Process all modifiers to aggregate their allocation settings
    const allocationModifiers = this.scenario.modifiers.filter(m =>
      m.archetype === ScenarioArchetype.ALLOCATION_CONFIG_CHANGE
    )

    // Track if any modifier sets automatedAllocationPercentages
    // If yes, REPLACE baseline entirely (user expects custom allocation, not merge)
    let hasCustomPercentages = false
    const customPercentages: Partial<Record<AssetClass, number>> = {}

    for (const modifier of allocationModifiers) {
      // Check for automatedAllocationPercentages (partial allocation support)
      if (modifier.assumptions?.automatedAllocationPercentages) {
        hasCustomPercentages = true
        // Accumulate percentages from ALL modifiers (multiple can coexist)
        const modifierPercentages = modifier.assumptions.automatedAllocationPercentages
        for (const [assetClass, percentage] of Object.entries(modifierPercentages)) {
          // Sanitize: skip NaN, negative, or invalid values
          const numPercentage = Number(percentage)
          if (isNaN(numPercentage) || numPercentage < 0) {
            console.warn(`⚠️ Invalid percentage ${percentage} for ${assetClass}, skipping`)
            continue
          }
          // Sum percentages for same asset class across multiple modifiers
          customPercentages[assetClass as AssetClass] =
            (customPercentages[assetClass as AssetClass] || 0) + numPercentage
        }
      }

      // Check for surplusAllocation (100% routing)
      // Last modifier wins if multiple set surplusAllocation
      if (modifier.assumptions?.surplusAllocation) {
        this.allocationConfig.surplusAllocation = {
          assetClass: modifier.assumptions.surplusAllocation.assetClass as AssetClass
        }
      }
    }

    // If user configured custom percentages, MERGE with baseline
    // This preserves baseline allocations for unspecified asset classes
    if (hasCustomPercentages) {
      // Start with baseline, then merge custom percentages (custom overrides baseline)
      const mergedPercentages: Partial<Record<AssetClass, number>> = {
        ...this.allocationConfig.automatedAllocationPercentages,
        ...customPercentages
      }

      // Cap total percentages at 100% to prevent over-allocation
      const totalPercentage = Object.values(mergedPercentages).reduce((sum, pct) => sum + pct, 0)
      if (totalPercentage > 100) {
        console.warn(`⚠️ Total automated percentages exceed 100% (${totalPercentage}%). Capping at 100%.`)
        // Proportionally scale down all percentages to sum to 100%
        const scaleFactor = 100 / totalPercentage
        for (const assetClass of Object.keys(mergedPercentages) as AssetClass[]) {
          mergedPercentages[assetClass] = (mergedPercentages[assetClass] || 0) * scaleFactor
        }
      }

      this.allocationConfig.automatedAllocationPercentages = mergedPercentages
      console.log(`📊 Merged allocation percentages (baseline + custom):`, mergedPercentages)
    }

    // Log allocation configs to verify baseline vs scenario separation
    console.log(`🔵 BASELINE allocation:`, this.baselineAllocationConfig.automatedAllocationPercentages)
    console.log(`🟢 SCENARIO allocation:`, this.allocationConfig.automatedAllocationPercentages)

    // Log final surplus allocation if set
    if (this.allocationConfig.surplusAllocation) {
      console.log(`📊 Surplus allocation: all surplus → ${this.allocationConfig.surplusAllocation.assetClass}`)
    }

    // Auto-create accounts if user has relevant modifiers but no baseline accounts
    this.ensurePensionAccountIfNeeded()
    this.ensureInvestmentAccountIfNeeded()

    // Auto-create accounts for allocation changes (e.g., if user allocates to equities but has no equities account)
    this.ensureAllocationTargetAccountsExist()

    // Always ensure a default cash savings account exists for tracking unallocated surplus
    this.ensureDefaultSavingsAccountExists()
  }

  /**
   * Create a fresh CashFlowAllocator for each projection run
   * This ensures baseline and scenario projections have isolated pension states
   * For baseline projections, uses baseline config
   * For scenario projections, can optionally use period-specific config
   */
  private createAllocator(config?: AllocationConfig): CashFlowAllocator {
    return new CashFlowAllocator(config || this.allocationConfig, this.scenario.baseline.monthlyExpenses)
  }

  /**
   * Auto-create a baseline pension account if user has pension-related modifiers but no existing pension.
   * This ensures retirement liquidation logic works correctly.
   */
  private ensurePensionAccountIfNeeded(): void {
    // Check if any modifiers are pension-related
    const hasPensionModifiers = this.scenario.modifiers.some(modifier => {
      const name = modifier.name.toLowerCase()
      return name.includes('pension') ||
        name.includes('retirement')
    })

    if (!hasPensionModifiers) {
      return  // No pension modifiers, no need to create account
    }

    // Check if baseline already has a pension account
    const hasPensionAccount = this.scenario.baseline.accounts.some(account => {
      const name = account.getName().toLowerCase()
      return name.includes('pension') ||
        name.includes('401k') ||
        name.includes('retirement')
    })

    if (hasPensionAccount) {
      return  // Already has pension, no need to create
    }

    // Calculate pension contribution stop period (retirement age)
    const currentAge = this.scenario.baseline.currentAge
    const retirementAge = this.scenario.baseline.retirementAge
    const yearsToRetirement = Math.max(0, retirementAge - currentAge)
    const periodsToRetirement = yearsToRetirement * 12

    // Calculate monthly pension contribution (8% of gross income - UK standard)
    const monthlyIncome = this.scenario.baseline.monthlyIncome
    const pensionContribution = Math.round(monthlyIncome * 0.08)  // 8% total (5% employee + 3% employer)

    // Create default workplace pension account starting at £0 (builds via contributions)
    const defaultPensionAccount = new BalanceAccount({
      name: 'Workplace Pension',
      startingBalance: 0,  // Starts empty, builds through contributions
      contribution: pensionContribution,
      frequency: 'monthly',
      performance: 6,  // 6% annual growth (UK pension default)
      contributionStopAfterPeriods: periodsToRetirement
    })

    // Inject into baseline accounts
    this.scenario.baseline.accounts.push(defaultPensionAccount)

    console.log(`✨ Auto-created Workplace Pension: £0 starting, £${pensionContribution}/month contribution`)
  }

  /**
   * Auto-create a baseline investment account if user has investment-related modifiers but no existing equities/ISA.
   * This creates a general investment account (not ISA) to model the impact of switching to ISAs later.
   */
  private ensureInvestmentAccountIfNeeded(): void {
    // Check if any modifiers are investment-related
    const hasInvestmentModifiers = this.scenario.modifiers.some(modifier => {
      const name = modifier.name.toLowerCase()
      return name.includes('investment') ||
        name.includes('portfolio') ||
        name.includes('rebalancing') ||
        name.includes('rebalance') ||
        name.includes('isa') ||
        name.includes('equities') ||
        name.includes('equity') ||
        name.includes('stocks') ||
        name.includes('shares') ||
        name.includes('contribution') ||
        name.includes('lump sum')
    })

    if (!hasInvestmentModifiers) {
      return  // No investment modifiers, no need to create account
    }

    // Check if baseline already has an investment/equity account
    const hasInvestmentAccount = this.scenario.baseline.accounts.some(account => {
      const name = account.getName().toLowerCase()
      return name.includes('equity') ||
        name.includes('equities') ||
        name.includes('isa') ||
        name.includes('investment') ||
        name.includes('stocks') ||
        name.includes('shares')
    })

    if (hasInvestmentAccount) {
      return  // Already has investment account, no need to create
    }

    // Calculate modest monthly investment contribution (5% of income - conservative default)
    const monthlyIncome = this.scenario.baseline.monthlyIncome
    const investmentContribution = Math.round(monthlyIncome * 0.05)  // 5% of income

    // Create default general investment account starting at £0 (builds via contributions)
    const defaultInvestmentAccount = new BalanceAccount({
      name: 'General Investment Account',
      startingBalance: 0,  // Starts empty, builds through contributions
      contribution: investmentContribution,
      frequency: 'monthly',
      performance: 7,  // 7% annual growth (UK equity market historical average)
      contributionStopAfterPeriods: undefined  // Continue until retirement by default
    })

    // Inject into baseline accounts
    this.scenario.baseline.accounts.push(defaultInvestmentAccount)

    console.log(`✨ Auto-created General Investment Account: £0 starting, £${investmentContribution}/month contribution`)
  }

  /**
   * Ensure a default cash savings account exists to track unallocated surplus.
   * This creates a 0% interest account so users can see the opportunity cost of not allocating surplus.
   */
  private ensureDefaultSavingsAccountExists(): void {
    // Check if baseline already has a default savings/cash account (non-debt)
    const hasSavingsAccount = this.scenario.baseline.accounts.some(account => {
      const name = account.getName().toLowerCase()

      // Only match true savings accounts (not debts) with savings/cash in name
      if (!(name.includes('savings') || name.includes('cash'))) {
        return false  // Not a savings/cash account
      }

      // Exclude emergency funds, pensions, and high-yield savings (different asset classes)
      if (name.includes('emergency') || name.includes('hysa') ||
        name.includes('high yield') || name.includes('pension')) {
        return false
      }

      // Exclude known debt patterns
      const isDebtByFlag = account.getIsDebt()
      const isDebtByName = name.includes('credit') || name.includes('loan') ||
        name.includes('mortgage') || name.includes('debt') ||
        name.includes('advance') || name.includes('line') ||
        name.includes('card') || name.includes('overdraft')

      if (isDebtByFlag || isDebtByName) {
        return false  // This is a debt, not a savings account
      }

      // At this point: name has "savings"/"cash", not emergency/pension, not obvious debt
      // Only block creation if it has positive balance or contribution (true savings)
      const hasPositiveBalance = account.getStartingBalance() > 0
      const hasPositiveContribution = account.getContribution() > 0

      return hasPositiveBalance || hasPositiveContribution
    })

    if (hasSavingsAccount) {
      return  // Already has a savings account for surplus
    }

    // Create default cash savings account with 0% interest to track unallocated surplus
    const defaultCashAccount = new BalanceAccount({
      name: 'Cash Savings',
      startingBalance: 0,  // Start empty - will accumulate surplus
      contribution: 0,     // No regular contributions (surplus only)
      frequency: 'monthly',
      performance: 0,      // 0% interest - shows opportunity cost
      contributionStopAfterPeriods: undefined
    })

    // Inject into baseline accounts
    this.scenario.baseline.accounts.push(defaultCashAccount)

    console.log(`✨ Auto-created Cash Savings account: 0% interest, tracks unallocated surplus`)
  }

  /**
   * Auto-create accounts for allocation config changes if they don't exist
   * E.g., if user sets surplus allocation to GIA, create GIA account
   */
  private ensureAllocationTargetAccountsExist(): void {
    const targetAssetClasses = new Set<AssetClass>()

    // Collect asset classes from baseline allocation config (default 10% equities + 5% pension)
    if (this.allocationConfig.automatedAllocationPercentages) {
      Object.keys(this.allocationConfig.automatedAllocationPercentages).forEach(assetClass => {
        targetAssetClasses.add(assetClass as AssetClass)
      })
    }

    // Collect all asset classes targeted by allocation config changes (modifiers)
    if (this.scenario.modifiers) {
      this.scenario.modifiers.forEach(modifier => {
        if (modifier.archetype === ScenarioArchetype.ALLOCATION_CONFIG_CHANGE) {
          // Collect from surplusAllocation (100% routing)
          if (modifier.assumptions?.surplusAllocation) {
            targetAssetClasses.add(modifier.assumptions.surplusAllocation.assetClass as AssetClass)
          }

          // Collect from automatedAllocationPercentages (partial percentages like 50%)
          if (modifier.assumptions?.automatedAllocationPercentages) {
            Object.keys(modifier.assumptions.automatedAllocationPercentages).forEach(assetClass => {
              targetAssetClasses.add(assetClass as AssetClass)
            })
          }
        }
      })
    }

    // Create accounts for each target asset class if missing
    targetAssetClasses.forEach(assetClass => {
      switch (assetClass) {
        case AssetClass.GENERAL_INVESTMENT: {
          // General Investment Account (GIA) - taxable equity investment
          const hasGIA = this.scenario.baseline.accounts.some(account => {
            const name = account.getName().toLowerCase()
            return name.includes('general investment') ||
              (name.includes('investment') && !name.includes('isa'))
          })

          if (!hasGIA) {
            const giaAccount = new BalanceAccount({
              name: 'General Investment Account',
              startingBalance: 0,
              contribution: 0,
              frequency: 'monthly',
              performance: 7,  // 7% annual growth (taxable)
              contributionStopAfterPeriods: undefined
            })
            this.scenario.baseline.accounts.push(giaAccount)
            console.log(`✨ Auto-created General Investment Account (GIA) for GENERAL_INVESTMENT allocation`)
          }
          break
        }

        case AssetClass.EQUITIES: {
          // ISA - UK tax-free wrapper for equities
          const hasISA = this.scenario.baseline.accounts.some(account => {
            return account.isISA()  // Use canonical accessor for metadata-driven ISA detection
          })

          if (!hasISA) {
            const isaAccount = new BalanceAccount({
              name: 'Stocks & Shares ISA',
              startingBalance: 0,
              contribution: 0,
              frequency: 'monthly',
              performance: 7,  // 7-10% annual growth (tax-free)
              contributionStopAfterPeriods: undefined
            })
            this.scenario.baseline.accounts.push(isaAccount)
            console.log(`✨ Auto-created Stocks & Shares ISA for EQUITIES allocation`)
          }
          break
        }

        case AssetClass.HYSA: {
          // High-Yield Savings Account for priority-based savings goals
          const hasHYSA = this.scenario.baseline.accounts.some(account => {
            const name = account.getName().toLowerCase()
            return name.includes('emergency') || name.includes('education') ||
              name.includes('house deposit') || name.includes('hysa')
          })

          if (!hasHYSA) {
            const hysaAccount = new BalanceAccount({
              name: 'Emergency Fund (HYSA)',
              startingBalance: 0,
              contribution: 0,
              frequency: 'monthly',
              performance: 4.5,  // ~4.5% HYSA rate
              contributionStopAfterPeriods: undefined
            })
            this.scenario.baseline.accounts.push(hysaAccount)
            console.log(`✨ Auto-created Emergency Fund (HYSA) for HYSA allocation`)
          }
          break
        }

        case AssetClass.PENSION: {
          // Pension accounts - create if missing
          const hasPension = this.scenario.baseline.accounts.some(account => {
            const name = account.getName().toLowerCase()
            return name.includes('pension') || name.includes('401k') || name.includes('retirement')
          })

          if (!hasPension) {
            const pensionAccount = new BalanceAccount({
              name: 'Personal Pension',
              startingBalance: 0,
              contribution: 0,
              frequency: 'monthly',
              performance: 6,  // 6% annual growth
              contributionStopAfterPeriods: undefined
            })
            this.scenario.baseline.accounts.push(pensionAccount)
            console.log(`✨ Auto-created Personal Pension for PENSION allocation`)
          }
          break
        }

        case AssetClass.DEFAULT_SAVINGS:
        case AssetClass.CURRENT_ACCOUNT:
        case AssetClass.OTHER_ASSETS:
          // These are typically pre-existing or created elsewhere
          // DEFAULT_SAVINGS is auto-created by ensureDefaultCashSavingsAccount
          // CURRENT_ACCOUNT and OTHER_ASSETS are user-defined
          break
      }
    })
  }

  /**
   * Initialize stateful account balances from baseline accounts
   */
  private initializeStatefulBalances(accounts: BalanceAccount[]): StatefulAccountBalance[] {
    return accounts.map(account => ({
      account,
      currentBalance: account.getStartingBalance(),
      isDebt: account.getIsDebt(),
      ratePerPeriod: account.getRatePerPeriod()
    }))
  }

  /**
   * Evolve a single account balance forward by one period
   * CORRECT ORDER: compound first, then apply cash flows
   * Applies BOTH scheduled contributions AND allocator adjustments
   * Returns: { newBalance, interestEarned }
   */
  private evolveAccountBalance(
    state: StatefulAccountBalance,
    period: number,
    scheduledContribution: number,
    allocatorAdjustment: number
  ): { newBalance: number; interestEarned: number } {
    const { account, currentBalance, isDebt, ratePerPeriod } = state

    // For debts: check if already paid off (stop all activity)
    if (isDebt && currentBalance >= 0) {
      return { newBalance: 0, interestEarned: 0 }
    }

    // Step 1: Apply growth/interest compounding FIRST (on beginning balance)
    const balanceAfterGrowth = currentBalance * (1 + ratePerPeriod)
    const interestEarned = balanceAfterGrowth - currentBalance

    // Step 2: Apply scheduled contribution (debt payments, etc.)
    let newBalance = balanceAfterGrowth + scheduledContribution

    // Step 3: Apply allocator adjustments (automated allocations)
    newBalance += allocatorAdjustment

    // Step 4: For debts, ensure they don't flip positive (paid off and stop)
    if (isDebt && newBalance >= 0) {
      newBalance = 0
    }

    // Step 5: For assets, allow negative balance (implicit overdraft)
    // This allows solvency checks to detect when a plan runs out of money
    // Step 5: For assets, allow negative balance (implicit overdraft)
    // This allows solvency checks to detect when a plan runs out of money
    if (!isDebt && newBalance < 0) {
      // Allow negative balance to persist for solvency checking
      // newBalance = 0  <-- DISABLED CLAMPING
    }

    return { newBalance, interestEarned }
  }

  /**
   * Distribute allocator results (per-asset-class) to individual accounts proportionally
   * Returns array of adjustments matching accounts array
   * NOTE: Scheduled contributions are applied separately in evolveAccountBalance
   */
  private distributeAllocatorResults(
    accounts: BalanceAccount[],
    statefulBalances: StatefulAccountBalance[],
    allocationResult: AllocationResult,
    accountRegistry: AccountRegistry
  ): number[] {
    const adjustments = new Array(accounts.length).fill(0)

    // Process allocations (positive cash flow deposits to ASSETS only)
    Object.keys(allocationResult.allocations || {}).forEach((assetClass) => {
      const totalAmount = allocationResult.allocations?.[assetClass as AssetClass] || 0
      const registryAccounts = accountRegistry[assetClass as AssetClass] || []
      if (registryAccounts.length === 0 || totalAmount === 0) return

      // Filter to asset accounts only (exclude debts from investment deposits)
      const assetAccounts = registryAccounts.filter(wrapper => {
        const accountIndex = accounts.indexOf(wrapper.account)
        return accountIndex !== -1 && !statefulBalances[accountIndex].isDebt
      })

      if (assetAccounts.length === 0) return

      // Equal distribution across all accounts in this asset class
      // 
      // DESIGN RATIONALE:
      // Automated allocation percentages (e.g., "10% to equities, 5% to pension") represent
      // the user's general savings strategy, not targeted contributions to specific accounts.
      // 
      // Equal distribution ensures:
      // 1. All accounts grow at the same rate from automated allocations
      // 2. New accounts (£0 balance) immediately receive contributions (prevents starvation bug)
      // 3. Simple, predictable behavior - no discontinuities or edge cases
      // 
      // For targeted contributions to specific accounts, users should use:
      // - Scheduled contributions (RECURRING_ACCOUNT_CONTRIBUTION scenarios)
      // - Disable automated allocations and manage contributions manually via scenarios
      // 
      // ASYMMETRY WITH LIQUIDATIONS:
      // Deposits (allocations) use equal distribution.
      // Withdrawals (liquidations) use proportional distribution.
      // This makes intuitive sense: when saving, split equally among goals; when withdrawing,
      // take more from accounts with larger balances to preserve diversification.
      assetAccounts.forEach(wrapper => {
        const accountIndex = accounts.indexOf(wrapper.account)
        if (accountIndex === -1) return

        adjustments[accountIndex] += totalAmount / assetAccounts.length
      })
    })

    // Process liquidations (negative cash flow withdrawals)
    // For assets: withdraw proportionally (evolveAccountBalance will clamp to prevent overdraft)
    // For debts: skip (can't liquidate from debt)
    Object.keys(allocationResult.liquidations || {}).forEach((assetClass) => {
      const totalAmount = allocationResult.liquidations?.[assetClass as AssetClass] || 0
      const registryAccounts = accountRegistry[assetClass as AssetClass] || []
      if (registryAccounts.length === 0 || totalAmount === 0) return

      // Filter to asset accounts only (exclude debts)
      const assetAccounts = registryAccounts.filter(wrapper => {
        const accountIndex = accounts.indexOf(wrapper.account)
        return accountIndex !== -1 && !statefulBalances[accountIndex].isDebt
      })

      if (assetAccounts.length === 0) return

      // Calculate total balance for proportional distribution
      const totalBalance = assetAccounts.reduce((sum, wrapper) => {
        const accountIndex = accounts.indexOf(wrapper.account)
        if (accountIndex === -1) return sum
        const currentBalance = Math.max(0, statefulBalances[accountIndex].currentBalance)
        return sum + currentBalance
      }, 0)

      if (totalBalance === 0) {
        // Equal distribution if no existing balances
        assetAccounts.forEach(wrapper => {
          const accountIndex = accounts.indexOf(wrapper.account)
          if (accountIndex !== -1) {
            adjustments[accountIndex] -= totalAmount / assetAccounts.length
          }
        })
      } else {
        // Proportional distribution (evolveAccountBalance will clamp to prevent overdraft)
        assetAccounts.forEach(wrapper => {
          const accountIndex = accounts.indexOf(wrapper.account)
          if (accountIndex === -1) return

          const currentBalance = Math.max(0, statefulBalances[accountIndex].currentBalance)
          const proportion = currentBalance / totalBalance

          // Liquidations are negative (withdrawals)
          // Don't clamp here - let evolve handle it so same-period contributions can cover withdrawals
          adjustments[accountIndex] -= totalAmount * proportion
        })
      }
    })

    return adjustments
  }

  /**
   * Cap scheduled ISA contributions at UK annual limit (£20k, April-March tax year)
   * Updates shared ISA tracker to coordinate with automated allocations
   * @param period - Current period number
   * @param account - The BalanceAccount to check
   * @param scheduledContribution - The scheduled contribution amount
   * @returns Capped contribution amount (reduced if ISA limit exceeded)
   */
  private capScheduledISAContribution(period: number, account: BalanceAccount, scheduledContribution: number): number {
    // Reset ISA tracking at start of new tax year (UK: April-March)
    const currentMonth = period % 12
    const simulationYear = Math.floor(period / 12)
    const isaTaxYear = currentMonth >= 3 ? simulationYear : simulationYear - 1  // Tax year starts April (period % 12 === 3)

    if (isaTaxYear !== this.isaTracker.taxYear) {
      this.isaTracker.taxYear = isaTaxYear
      this.isaTracker.ytd = 0
    }

    // Use canonical isISA() accessor (metadata-driven with name fallback)
    if (!account.isISA() || scheduledContribution <= 0) {
      return scheduledContribution  // Not an ISA or no contribution - no capping needed
    }

    // Calculate remaining ISA allowance
    const UK_ISA_ANNUAL_LIMIT = 20000
    const remaining = Math.max(0, UK_ISA_ANNUAL_LIMIT - this.isaTracker.ytd)

    // Cap contribution at remaining allowance
    const cappedContribution = Math.min(scheduledContribution, remaining)
    const overflow = scheduledContribution - cappedContribution

    if (overflow > 0) {
      console.log(`🚨 ISA scheduled contribution capped (Period ${period}): £${scheduledContribution.toFixed(2)} → £${cappedContribution.toFixed(2)} (overflow: £${overflow.toFixed(2)})`)
      console.log(`   Shared tracker YTD: £${this.isaTracker.ytd.toFixed(2)} / £${UK_ISA_ANNUAL_LIMIT}`)
    }

    // Update shared YTD tracker (allocator will add its contributions to the same tracker)
    this.isaTracker.ytd += cappedContribution

    return cappedContribution
  }

  generateBaselineProjection(): SimulationResult {
    const projection: ProjectionPoint[] = []

    // Create fresh allocator for isolated baseline projection (use original baseline allocation, NOT modified)
    const allocator = this.createAllocator(this.baselineAllocationConfig)

    // Create account registry for allocation/liquidation
    const accountRegistry = this.createAccountRegistry(this.scenario.baseline.accounts)

    // Initialize stateful account balances for iterative evolution
    const statefulBalances = this.initializeStatefulBalances(this.scenario.baseline.accounts)

    // Initialize pension withdrawal state for retirement tracking
    const pensionAccounts = accountRegistry[AssetClass.PENSION] || []
    const totalPensionPot = pensionAccounts.reduce((sum, wrapper) =>
      sum + Math.max(0, statefulBalances[this.scenario.baseline.accounts.indexOf(wrapper.account)]?.currentBalance || 0), 0
    )
    let baselinePensionState: PensionWithdrawalState | null =
      totalPensionPot > 0 ? initializePensionState(totalPensionPot) : null

    for (let period = 0; period < this.periodsToProject; period++) {
      // Reset period tracking at start of each period
      if (baselinePensionState) {
        baselinePensionState = resetPeriodTracking(baselinePensionState)
      }

      // Calculate age at this period and check if retired
      const currentAge = this.scenario.baseline.currentAge + (period / 12)
      const isRetired = currentAge >= this.scenario.baseline.retirementAge
      const isStatePensionAge = currentAge >= UK_PENSION_RULES.STATE_PENSION_AGE

      // Earned income stops at retirement, state pension begins at statutory age (67)
      const salaryIncome = isRetired ? 0 : this.scenario.baseline.monthlyIncome
      const statePensionIncome = isStatePensionAge ? (this.scenario.baseline.statePensionMonthly || 0) : 0
      const privatePensionIncome = baselinePensionState?.totalWithdrawnThisPeriod || 0
      const grossIncome = salaryIncome + statePensionIncome + privatePensionIncome

      // Calculate net income: gross - tax - NI
      // Tax and NI only apply to employment income (not pension income)
      const annualGrossIncome = grossIncome * 12
      const annualTax = annualGrossIncome > 0 ? calculateTaxOnIncome(annualGrossIncome) : 0
      const annualNI = salaryIncome > 0 ? calculateNationalInsurance(salaryIncome * 12) : 0
      const monthlyTax = annualTax / 12
      const monthlyNI = annualNI / 12
      const netIncome = grossIncome - monthlyTax - monthlyNI

      const baseExpenses = this.scenario.baseline.monthlyExpenses

      // Calculate total cash outflows AFTER compounding (BEFORE allocator)
      // We need to know actual contributions, not scheduled ones (debts might be paid off)
      let totalAccountContributions = 0
      let totalScheduledISAContributions = 0  // Track ISA contributions for UK £20k limit enforcement
      const actualContributions: number[] = [] // Track actual contributions for reporting

      statefulBalances.forEach((state, index) => {
        const account = this.scenario.baseline.accounts[index]
        const previousBalance = state.currentBalance
        const isDebt = state.isDebt
        const ratePerPeriod = state.ratePerPeriod

        // Skip if debt already paid off
        if (isDebt && previousBalance >= 0) {
          actualContributions[index] = 0
          return // No contribution needed
        }

        // Calculate what balance would be after compounding
        const balanceAfterGrowth = previousBalance * (1 + ratePerPeriod)

        // Get scheduled contribution (baseline projection doesn't have QUIT_JOB modifiers)
        let scheduledContribution = account.netCashFlowAtPeriod(period)

        // Cap ISA contributions at UK annual limit BEFORE processing
        if (!isDebt && scheduledContribution > 0) {
          scheduledContribution = this.capScheduledISAContribution(period, account, scheduledContribution)
        }

        if (isDebt) {
          // For debts: limit payment to amount needed to clear debt
          // Payment = min(scheduled_payment, debt_after_interest)
          const debtAfterGrowth = Math.abs(balanceAfterGrowth)
          const scheduledPayment = Math.abs(scheduledContribution)
          const actualPayment = Math.min(scheduledPayment, debtAfterGrowth)
          actualContributions[index] = actualPayment
          totalAccountContributions += actualPayment
        } else {
          // For assets: use capped scheduled contribution
          const assetContribution = Math.abs(scheduledContribution)
          actualContributions[index] = assetContribution
          totalAccountContributions += assetContribution
        }
      })

      // Cash flow calculations using two-step formula:
      // Step 1: netIncome = grossIncome - incomeTax - nationalInsurance (calculated above)
      // Step 2: netCashFlow = netIncome - expenses
      // This gets split into: scheduled contributions (debt payments) + automated allocations (savings/investments)
      const netCashFlow = netIncome - baseExpenses

      // Cap scheduled contributions at available net cash flow
      // If net cash flow < scheduled contributions, proportionally reduce all contributions
      if (totalAccountContributions > netCashFlow && netCashFlow > 0) {
        const scaleFactor = netCashFlow / totalAccountContributions
        actualContributions.forEach((contrib, index) => {
          actualContributions[index] = contrib * scaleFactor
        })
        totalAccountContributions = netCashFlow
      } else if (netCashFlow <= 0) {
        // No cash flow available - set all contributions to zero
        actualContributions.forEach((_, index) => {
          actualContributions[index] = 0
        })
        totalAccountContributions = 0
      }

      // Calculate cash available for automated allocations (after scheduled debt payments)
      const cashForAutomatedAllocations = netCashFlow - totalAccountContributions

      // Create retirement context for pension withdrawal logic
      const retirementContext: RetirementContext | undefined = isRetired ? {
        isRetired: true,
        currentAge,
        monthlyIncome: grossIncome,  // Monthly gross income for year-to-date tax calculation
        pensionState: baselinePensionState
      } : undefined

      // Apply automated allocation/liquidation logic with retirement awareness
      // Pass shared ISA tracker to ensure unified £20k limit enforcement across both contribution pathways
      const allocationResult = allocator.allocateCashFlow(
        cashForAutomatedAllocations,
        accountRegistry,
        period,
        this.isaTracker,
        retirementContext
      )

      // Update pension state after allocation (if modified by withdrawal)
      if (retirementContext?.pensionState) {
        baselinePensionState = retirementContext.pensionState
      }

      // CRITICAL: Distribute allocator results and evolve balances BEFORE calculating net worth
      const accountAdjustments = this.distributeAllocatorResults(
        this.scenario.baseline.accounts,
        statefulBalances,
        allocationResult,
        accountRegistry
      )

      // Evolve each account balance forward with scheduled contributions AND allocator adjustments
      // Track compound growth (interest earned) separately from contributions
      let totalCompoundGrowth = 0
      let totalContributionsThisPeriod = 0

      statefulBalances.forEach((state, index) => {
        const scheduledContrib = actualContributions[index] || 0
        const allocatorAdjust = accountAdjustments[index]

        const { newBalance, interestEarned } = this.evolveAccountBalance(state, period, scheduledContrib, allocatorAdjust)
        state.currentBalance = newBalance

        // Track growth drivers
        totalCompoundGrowth += interestEarned
        totalContributionsThisPeriod += scheduledContrib + allocatorAdjust
      })

      // NOW calculate net worth from post-evolution balances
      let totalAssetValue = 0
      let totalDebtValue = 0
      let totalContributions = 0
      const assetCategories: CategoryBreakdown[] = []
      const debtCategories: CategoryBreakdown[] = []

      // Track scheduled contributions by account name for chart display
      const scheduledContributionsByAccount: Record<string, number> = {}

      statefulBalances.forEach((state, index) => {
        const account = this.scenario.baseline.accounts[index]
        const value = state.currentBalance
        const accountName = account.getName() || `Account ${index}`

        // Convert monthly rate to annual percentage: annualRate = monthlyRate * 12 * 100
        const annualRate = state.ratePerPeriod * 12 * 100

        // Use actual contribution (stops when debt paid off) not scheduled
        const actualContrib = actualContributions[index] || 0
        totalContributions += actualContrib

        // Track scheduled contributions by account name (for chart display)
        if (actualContrib > 0) {
          scheduledContributionsByAccount[accountName] = actualContrib
        }

        if (value < 0) {
          const debtAmount = Math.abs(value)
          totalDebtValue += debtAmount
          debtCategories.push({ name: accountName, value: debtAmount, annualRate })
        } else {
          totalAssetValue += value
          // Always include savings goal accounts in breakdown, even if balance is 0
          // This allows users to see Emergency Fund, Education Fund, etc. immediately
          const isSavingsGoal = account.metadata?.savingsGoalPriority !== undefined
          if (value > 0 || isSavingsGoal) {
            assetCategories.push({ name: accountName, value, annualRate })
          }
        }
      })

      const netWorth = totalAssetValue - totalDebtValue

      projection.push({
        period,
        cashFlow: netCashFlow,
        netWorth,
        breakdown: {
          income: grossIncome,  // Gross income (salary/pension before tax/NI)
          baselineIncome: grossIncome,  // Baseline gross income
          goalIncome: 0,  // DEPRECATED
          scenarioIncome: 0,  // No scenarios in baseline projection
          scenarioExpenses: 0,  // No scenarios in baseline projection
          scenarioNetCashFlow: 0,  // No scenarios in baseline projection
          expenses: baseExpenses,
          baselineExpenses: baseExpenses,
          accountContributions: totalContributions,
          goalExpenses: 0,
          assetValue: totalAssetValue,
          debtValue: totalDebtValue,
          goalImpacts: {},
          assetCategories,
          debtCategories,
          incomeTax: monthlyTax,
          nationalInsurance: monthlyNI,
          statePensionIncome: statePensionIncome,  // State pension from baseline config
          privatePensionIncome: privatePensionIncome,  // Private pension from liquidations
          goalBreakdowns: [],
          cashFlowAllocations: allocationResult.allocations,
          cashFlowLiquidations: allocationResult.liquidations,
          liquidationAccounts: allocationResult.liquidationAccounts,
          scheduledContributions: scheduledContributionsByAccount,
          surplusCash: allocationResult.surplusCash,
          compoundGrowth: totalCompoundGrowth,
          totalContributionsThisPeriod: totalContributionsThisPeriod
        }
      })
    }

    return {
      projection,
      solvency: calculateSolvency(projection, this.simulationStartYear, this.simulationStartMonth)
    }
  }

  generateScenarioProjection(): SimulationResult {
    const modifierAccounts: ModifierAccountWrapper[] = []
    const modifierCashFlows: Map<number, Map<string, number>> = new Map()

    // Pre-compute debt overpayment mappings for accelerated repayment goals
    interface DebtOverpayment {
      goalId: string  // Preserve original goal ID for proper reporting
      baselineAccountIndex: number
      monthlyAmount: number
      startPeriod: number
      endPeriod: number  // Use periodsToProject for ongoing (duration=0)
    }

    interface OneTimeDebtPayment {
      goalId: string
      baselineAccountIndex: number
      paymentAmount: number
      paymentPeriod: number
    }

    interface OneTimeWithdrawal {
      goalId: string
      baselineAccountIndex: number
      withdrawalAmount: number
      withdrawalPeriod: number
    }

    const debtOverpayments: DebtOverpayment[] = []
    const oneTimeDebtPayments: OneTimeDebtPayment[] = []
    const oneTimeWithdrawals: OneTimeWithdrawal[] = []

    // First pass: identify one-time debt payments and withdrawals BEFORE creating modifier accounts
    this.scenario.modifiers.forEach(goal => {
      // Handle ONE_OFF_ACCOUNT_WITHDRAWAL (transfers from existing accounts)
      // Use sourceAssetClass if available (new intelligent matching), fall back to linkedAccountName (legacy)
      if (goal.archetype === ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL) {
        const sourceAssetClass = goal.assumptions?.sourceAssetClass
        const linkedAccountName = goal.linkedAccountName

        if (!sourceAssetClass && !linkedAccountName) {
          console.warn(`❌ Transfer withdrawal "${goal.name}" missing both sourceAssetClass and linkedAccountName`)
          return
        }

        let matchingIndex = -1

        if (sourceAssetClass) {
          // NEW: Intelligent matching by asset class - find account with highest balance
          const candidateAccounts: Array<{ idx: number, balance: number, name: string }> = []

          this.scenario.baseline.accounts.forEach((acc, idx) => {
            const name = acc.getName().toLowerCase()
            const balance = acc.getStartingBalance()

            // Match account to asset class using same logic as createAccountRegistry
            let matchesClass = false

            switch (sourceAssetClass) {
              case 'DEFAULT_SAVINGS':
                matchesClass = name.includes('savings') || name.includes('cash')
                break
              case 'HYSA':
                matchesClass = name.includes('emergency') || name.includes('education') ||
                  name.includes('house deposit') || name.includes('hysa')
                break
              case 'GENERAL_INVESTMENT':
                matchesClass = (name.includes('general') && name.includes('investment')) ||
                  (name.includes('gia')) ||
                  ((name.includes('equities') || name.includes('stocks')) && !name.includes('isa'))
                break
              case 'EQUITIES':
                matchesClass = name.includes('isa')
                break
              case 'PENSION':
                matchesClass = name.includes('pension')
                break
            }

            if (matchesClass && balance > 0) {
              candidateAccounts.push({ idx, balance, name: acc.getName() })
            }
          })

          if (candidateAccounts.length === 0) {
            console.error(`❌ Transfer withdrawal "${goal.name}" found NO ${sourceAssetClass} accounts with positive balance!`)
            console.error(`   Available accounts: ${this.scenario.baseline.accounts.map(a => `${a.getName()} (£${a.getStartingBalance()})`).join(', ')}`)
            return
          }

          // Pick account with highest balance
          candidateAccounts.sort((a, b) => b.balance - a.balance)
          matchingIndex = candidateAccounts[0].idx

          console.log(`✅ Transfer withdrawal "${goal.name}" matched ${candidateAccounts[0].name} (£${candidateAccounts[0].balance.toLocaleString()}) from ${candidateAccounts.length} ${sourceAssetClass} account(s)`)

        } else if (linkedAccountName) {
          // LEGACY: Matching by account name (fallback for old scenarios)
          const targetName = linkedAccountName.toLowerCase().trim()

          // Try exact match first
          matchingIndex = this.scenario.baseline.accounts.findIndex(acc =>
            acc.getName().toLowerCase().trim() === targetName
          )

          // Fall back to substring match if no exact match
          if (matchingIndex === -1) {
            const substringMatches = this.scenario.baseline.accounts
              .map((acc, idx) => ({ acc, idx }))
              .filter(({ acc }) => acc.getName().toLowerCase().includes(targetName))

            if (substringMatches.length > 0) {
              if (substringMatches.length > 1) {
                console.warn(`One-time withdrawal "${goal.name}" matched multiple accounts, using first: ${substringMatches.map(m => m.acc.getName()).join(', ')}`)
              }
              matchingIndex = substringMatches[0].idx
            }
          }

          if (matchingIndex === -1) {
            console.warn(`❌ One-time withdrawal "${goal.name}" could not find account "${linkedAccountName}"`)
            return
          }
        }

        const withdrawalPeriod = goal.targetDate ? this.dateToPeriod(goal.targetDate) : 0

        oneTimeWithdrawals.push({
          goalId: goal.id,
          baselineAccountIndex: matchingIndex,
          withdrawalAmount: goal.targetAmount,
          withdrawalPeriod
        })
      }

      // Handle ONE_OFF_ACCOUNT_CONTRIBUTION with linkedAccountName (lump sum debt payments)
      if (goal.archetype === ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION &&
        goal.linkedAccountName &&
        goal.startingAmount &&
        goal.startingAmount < 0) {

        const targetName = goal.linkedAccountName.toLowerCase().trim()

        // Try exact match first
        let matchingIndex = this.scenario.baseline.accounts.findIndex(acc =>
          acc.getName().toLowerCase().trim() === targetName
        )

        // Fall back to substring match if no exact match
        if (matchingIndex === -1) {
          const substringMatches = this.scenario.baseline.accounts
            .map((acc, idx) => ({ acc, idx }))
            .filter(({ acc }) => acc.getName().toLowerCase().includes(targetName))

          if (substringMatches.length > 0) {
            if (substringMatches.length > 1) {
              console.warn(`Lump sum debt payment "${goal.name}" matched multiple accounts, using first: ${substringMatches.map(m => m.acc.getName()).join(', ')}`)
            }
            matchingIndex = substringMatches[0].idx
          }
        }

        // Final fallback: if still no match (e.g., linkedAccountName='Debt' but only Mortgage exists),
        // find ANY debt account (isDebt=true)
        if (matchingIndex === -1) {
          const debtAccounts = this.scenario.baseline.accounts
            .map((acc, idx) => ({ acc, idx }))
            .filter(({ acc }) => acc.getIsDebt())

          if (debtAccounts.length === 0) {
            console.warn(`Lump sum debt payment "${goal.name}" could not find any debt account (searched for "${goal.linkedAccountName}")`)
            return
          }

          console.log(`💡 Lump sum debt payment "${goal.name}" falling back to first debt account: ${debtAccounts[0].acc.getName()} (searched for "${goal.linkedAccountName}")`)
          matchingIndex = debtAccounts[0].idx
        }

        const paymentPeriod = goal.targetDate ? this.dateToPeriod(goal.targetDate) : 0

        oneTimeDebtPayments.push({
          goalId: goal.id,
          baselineAccountIndex: matchingIndex,
          paymentAmount: Math.abs(goal.startingAmount),  // Convert negative to positive
          paymentPeriod
        })
      }
    })

    // Second pass: create modifier accounts (skip one-time debt payments)
    this.scenario.modifiers.forEach(goal => {
      this.createModifierAccounts(goal, modifierAccounts, modifierCashFlows)

      // Handle debt overpayment goals (recurring)
      if (goal.archetype === ScenarioArchetype.ONE_OFF_EXPENSE &&
        goal.linkedAccountName &&
        goal.monthlyContribution &&
        goal.monthlyContribution > 0) {

        const targetName = goal.linkedAccountName.toLowerCase().trim()

        // Try exact match first
        let matchingIndex = this.scenario.baseline.accounts.findIndex(acc =>
          acc.getName().toLowerCase().trim() === targetName
        )

        // Fall back to substring match if no exact match
        if (matchingIndex === -1) {
          const substringMatches = this.scenario.baseline.accounts
            .map((acc, idx) => ({ acc, idx }))
            .filter(({ acc }) => acc.getName().toLowerCase().includes(targetName))

          if (substringMatches.length > 0) {
            if (substringMatches.length > 1) {
              console.warn(`Recurring debt payment "${goal.name}" matched multiple accounts, using first: ${substringMatches.map(m => m.acc.getName()).join(', ')}`)
            }
            matchingIndex = substringMatches[0].idx
          }
        }

        // Final fallback: find ANY debt account (isDebt=true)
        if (matchingIndex === -1) {
          const debtAccounts = this.scenario.baseline.accounts
            .map((acc, idx) => ({ acc, idx }))
            .filter(({ acc }) => acc.getIsDebt())

          if (debtAccounts.length === 0) {
            console.warn(`Recurring debt payment "${goal.name}" could not find any debt account (searched for "${goal.linkedAccountName}")`)
            return
          }

          console.log(`💡 Recurring debt payment "${goal.name}" falling back to first debt account: ${debtAccounts[0].acc.getName()} (searched for "${goal.linkedAccountName}")`)
          matchingIndex = debtAccounts[0].idx
        }

        const startPeriod = goal.startDate ? this.dateToPeriod(goal.startDate) : 0

        // Handle ongoing vs. fixed duration
        // duration=0 or undefined = ongoing for full projection
        // duration>0 = fixed number of years
        const durationMonths = (goal.duration && goal.duration > 0)
          ? goal.duration * 12
          : this.periodsToProject - startPeriod
        const endPeriod = startPeriod + durationMonths

        debtOverpayments.push({
          goalId: goal.id,  // Preserve original goal ID
          baselineAccountIndex: matchingIndex,
          monthlyAmount: goal.monthlyContribution,
          startPeriod,
          endPeriod
        })
      }
    })

    const projection: ProjectionPoint[] = []

    // Create fresh allocator for isolated scenario projection
    const allocator = this.createAllocator()

    // Initialize stateful balances for baseline accounts
    const statefulBalances = this.initializeStatefulBalances(this.scenario.baseline.accounts)

    // Initialize stateful balances for modifier accounts (with wrapper metadata)
    const modifierStatefulBalances: Array<{
      state: StatefulAccountBalance
      modifierId: string
      startPeriod: number
    }> = modifierAccounts.map(({ account, modifierId, startPeriod }) => ({
      state: {
        account,
        currentBalance: account.getStartingBalance(),
        isDebt: account.getIsDebt(),
        ratePerPeriod: account.getRatePerPeriod()
      },
      modifierId,
      startPeriod
    }))

    // Initialize pension withdrawal state for modifier projection (separate from baseline)
    // Note: We start with null and will lazy-initialize on first withdrawal
    // This ensures 25% allowance is based on pension pot at retirement, not initial balance
    const tempRegistry = this.createAccountRegistry(this.scenario.baseline.accounts)
    let modifierPensionState: PensionWithdrawalState | null = null

    for (let period = 0; period < this.periodsToProject; period++) {
      // Reset period tracking at start of each period
      if (modifierPensionState) {
        modifierPensionState = resetPeriodTracking(modifierPensionState)
      }

      // Step 1: Calculate income/expenses from modifier cash flows
      // Separate business income/costs from regular income/costs for different tax treatment
      const periodCashFlows = modifierCashFlows.get(period) || new Map()
      let additionalExpenses = 0
      let additionalIncome = 0
      let businessRevenue = 0
      let businessCosts = 0
      const modifierImpacts: Record<string, number> = {}

      // Calculate current age and retirement status BEFORE processing goals
      const currentAge = this.scenario.baseline.currentAge + (period / 12)
      const isRetired = currentAge >= this.scenario.baseline.retirementAge

      // Process pension withdrawal requests through proper UK pension system
      // This handles 25% lifetime allowance tracking correctly
      let pensionWithdrawalIncome = 0

      // Check for pension withdrawal requests active in this period
      for (const modifier of this.scenario.modifiers) {
        if (!isTargetedModifier(modifier) || !modifier.pensionWithdrawalRequest) continue

        const startPeriod = modifier.startDate ? this.dateToPeriod(modifier.startDate) : 0

        // For one-off: only active at startPeriod. For recurring: active for duration
        const isOneOff = !modifier.pensionWithdrawalRequest.isRecurring
        const endPeriod = isOneOff ? startPeriod + 1 :
          (modifier.targetDate ? this.dateToPeriod(modifier.targetDate) : this.periodsToProject)

        // Check if withdrawal is active in this period
        const isActive = period >= startPeriod && period < endPeriod
        if (!isActive) continue

        // Get current pension balance
        const pensionAccounts = tempRegistry[AssetClass.PENSION] || []
        const currentPensionBalance = pensionAccounts.reduce((sum, wrapper) => {
          if (period < wrapper.startPeriod) return sum
          return sum + Math.max(0, statefulBalances[this.scenario.baseline.accounts.indexOf(wrapper.account)]?.currentBalance || 0)
        }, 0)

        if (currentPensionBalance <= 0) continue

        // Lazy initialization: Initialize pension state on first withdrawal
        // This ensures 25% allowance is based on pension pot at retirement (first access), not initial balance
        if (!modifierPensionState || modifierPensionState.totalCrystallized === 0) {
          modifierPensionState = initializePensionState(currentPensionBalance)
        }

        // Calculate withdrawal capacity
        const capacity = calculateWithdrawalCapacity(currentAge, currentPensionBalance, modifierPensionState)

        if (capacity.ageRestricted) continue

        // Execute withdrawal through proper UK pension system with GROSS amount
        const grossAmount = modifier.pensionWithdrawalRequest.grossAmount
        const withdrawal = executePensionWithdrawalGross(
          grossAmount,  // Gross amount requested by user
          capacity,
          modifierPensionState,
          this.scenario.baseline.monthlyIncome,
          period
        )

        // Update pension state
        modifierPensionState = withdrawal.state

        // Add net income (after tax)
        pensionWithdrawalIncome += withdrawal.netAmount

        // Track in modifier impacts
        modifierImpacts[modifier.id] = withdrawal.netAmount

        // Update pension account balances
        if (withdrawal.netAmount > 0) {
          const grossWithdrawal = withdrawal.taxFreeAmount + withdrawal.taxableAmount
          for (const wrapper of pensionAccounts) {
            const accountIndex = this.scenario.baseline.accounts.indexOf(wrapper.account)
            if (accountIndex >= 0 && statefulBalances[accountIndex]) {
              const accountBalance = statefulBalances[accountIndex].currentBalance
              if (accountBalance > 0) {
                const proportionalWithdrawal = grossWithdrawal * (accountBalance / currentPensionBalance)
                statefulBalances[accountIndex].currentBalance -= proportionalWithdrawal
              }
            }
          }
        }
      }

      // Add pension withdrawal income to total additional income
      additionalIncome += pensionWithdrawalIncome

      // Check for active SELL_BUSINESS modifiers - if active, all business income/costs stop from sale date
      // Use scenarioId (not name) because modifiers have names like "Sell a Business - Sale Proceeds"
      // Find the MOST RECENT sale that has occurred (not the first one) to handle multiple sales correctly
      const activeSellBusinessModifiers = this.scenario.modifiers
        .filter(modifier => {
          if (modifier.scenarioId !== ScenarioId.SELL_BUSINESS) return false
          const startPeriod = modifier.startDate ? this.dateToPeriod(modifier.startDate) : 0
          return period >= startPeriod
        })
        .sort((a, b) => {
          const aStart = a.startDate ? this.dateToPeriod(a.startDate) : 0
          const bStart = b.startDate ? this.dateToPeriod(b.startDate) : 0
          return bStart - aStart  // Sort descending (most recent first)
        })

      const sellBusinessModifier = activeSellBusinessModifiers[0]  // Most recent sale
      const hasActiveSellBusiness = !!sellBusinessModifier
      const sellBusinessPeriod = sellBusinessModifier?.startDate ? this.dateToPeriod(sellBusinessModifier.startDate) : Infinity

      periodCashFlows.forEach((flow, goalId) => {
        // Strip -setup suffix to find the parent modifier
        let baseGoalId = goalId
        if (goalId.endsWith('-setup')) {
          baseGoalId = goalId.replace('-setup', '')
        }

        const goal = this.scenario.modifiers.find(g => g.id === baseGoalId)
        if (!goal) return

        // Check if this is business income/cost (subject to corporation tax, not income tax)
        const isBusinessIncome = isTargetedModifier(goal) && goal.incomeType === 'business'

        // Terminate business flows when SELL_BUSINESS is active:
        // - Business flows that started BEFORE the sale → terminated (this business was sold)
        // - Business flows that start ON OR AFTER the sale → not terminated (new business ventures)
        // This allows: Launch(2025)→Sell(2030) followed by Launch(2035) as separate businesses
        if (isBusinessIncome && hasActiveSellBusiness) {
          const goalStartPeriod = goal.startDate ? this.dateToPeriod(goal.startDate) : 0
          if (goalStartPeriod < sellBusinessPeriod) {
            // This business flow belongs to a business that was sold → terminate it
            modifierImpacts[goalId] = 0
            return
          }
          // Business flow starts on/after the sale date → it's a new business, let it run
        }

        // RECURRING_INCOME goals: Income boosts stop at retirement, but expense reductions continue
        // Increase Salary: Salary increases stop at retirement
        // Add Side Income: Side income stops at retirement  
        // Reduce Expenses: Expense reductions CONTINUE in retirement (you still spend less!)
        // Business income continues after retirement (business can keep running)
        const isCashFlowPositive = goal.archetype === ScenarioArchetype.RECURRING_INCOME
        const isIncomeBoost = goal.id.includes('Increase Salary') || goal.id.includes('Add Side Income')
        if (isCashFlowPositive && isRetired && isIncomeBoost && flow > 0 && !isBusinessIncome) {
          // Skip this income boost - it ended at retirement (but not business income)
          modifierImpacts[goalId] = 0
          return
        }

        // RECURRING_ACCOUNT_CONTRIBUTION pension modifiers should stop at retirement
        // No point contributing to pension after you've retired
        const isPensionContribution = goal.archetype === ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION &&
          (goal.name.toLowerCase().includes('pension') || goal.name.toLowerCase().includes('retirement'))
        if (isPensionContribution && isRetired && flow < 0) {
          // Skip this pension contribution - can't contribute after retirement
          modifierImpacts[goalId] = 0
          return
        }

        if (flow < 0) {
          const behavior = isTargetedModifier(goal) ? (goal.cashFlowBehavior || 'asset') : 'asset'
          // Setup costs (goalId ending in -setup) are always genuine expenses
          const isSetupCost = goalId.endsWith('-setup')

          // Debt overpayments with linkedAccountName are TRANSFERS, not expenses
          // They should not affect net cash flow or be tracked in modifierImpacts
          const isDebtOverpayment = (isTargetedModifier(goal) || isConfigModifier(goal)) && goal.linkedAccountName !== undefined

          const isGenuineExpense =
            isSetupCost ||
            behavior === 'lump_sum_expense' ||
            behavior === 'sinking_expense' ||
            [
              ScenarioArchetype.ONE_OFF_EXPENSE,
              ScenarioArchetype.RECURRING_EXPENSE,
              ScenarioArchetype.ONE_OFF_EXPENSE
            ].includes(goal.archetype)

          // ALLOCATION_CONFIG_CHANGE should never create cash flows - it's a config change only
          const isAllocationChange = goal.archetype === ScenarioArchetype.ALLOCATION_CONFIG_CHANGE

          if (isGenuineExpense && !isAllocationChange && !isDebtOverpayment) {
            if (isBusinessIncome) {
              // Business operating costs (deducted before corporation tax)
              businessCosts += Math.abs(flow)
            } else {
              // Regular expenses (personal/family)
              additionalExpenses += Math.abs(flow)
            }
            modifierImpacts[goalId] = flow
          } else {
            modifierImpacts[goalId] = 0
          }
        } else {
          if (isBusinessIncome) {
            // Business revenue (subject to corporation tax)
            businessRevenue += flow
          } else {
            // Regular income (subject to income tax/NI)
            additionalIncome += flow
          }
          modifierImpacts[goalId] = flow
        }
      })

      const isStatePensionAge = currentAge >= UK_PENSION_RULES.STATE_PENSION_AGE

      // Check for active QUIT_JOB modifiers - if active, salary and workplace pension stop
      const hasActiveQuitJob = this.scenario.modifiers.some(modifier => {
        if (modifier.scenarioId !== ScenarioId.QUIT_JOB) return false
        const startPeriod = modifier.startDate ? this.dateToPeriod(modifier.startDate) : 0
        return period >= startPeriod
      })

      const salaryIncome = (isRetired || hasActiveQuitJob) ? 0 : this.scenario.baseline.monthlyIncome
      const statePensionIncomeBaseline = isStatePensionAge ? (this.scenario.baseline.statePensionMonthly || 0) : 0
      const privatePensionIncomeScenario: number = modifierPensionState?.totalWithdrawnThisPeriod || 0
      const baselineGrossIncome = salaryIncome + statePensionIncomeBaseline

      // Separate tax treatment for employment income vs business income
      // Employment income: subject to income tax and NI (includes state pension + private pension withdrawals + scenario income)
      const employmentGrossIncome: number = baselineGrossIncome + privatePensionIncomeScenario + additionalIncome
      const annualEmploymentIncome = employmentGrossIncome * 12
      const annualTax = annualEmploymentIncome > 0 ? calculateTaxOnIncome(annualEmploymentIncome) : 0
      const annualNI = salaryIncome > 0 ? calculateNationalInsurance(salaryIncome * 12) : 0
      const monthlyTax = annualTax / 12
      const monthlyNI = annualNI / 12
      const netEmploymentIncome = employmentGrossIncome - monthlyTax - monthlyNI

      // Business income: subject to corporation tax
      const monthlyBusinessProfit = businessRevenue - businessCosts
      const annualBusinessProfit = monthlyBusinessProfit * 12
      const corporationTaxResult = annualBusinessProfit > 0 ? calculateCorporationTax(annualBusinessProfit) : { tax: 0, netProfit: 0, effectiveRate: 0 }
      const monthlyCorporationTax = corporationTaxResult.tax / 12
      const monthlyBusinessNetProfit = corporationTaxResult.netProfit / 12

      // Total net income: employment net + business net
      const netIncome = netEmploymentIncome + monthlyBusinessNetProfit
      const grossIncome: number = employmentGrossIncome + businessRevenue  // For display purposes

      // Calculate one-time debt payments for this period (BEFORE netCashFlow calculation)
      let totalOneTimeDebtPayment = 0
      const activeOneTimePayments: OneTimeDebtPayment[] = []

      oneTimeDebtPayments.forEach((payment) => {
        if (period === payment.paymentPeriod) {
          const debtState = statefulBalances[payment.baselineAccountIndex]
          // Only apply if debt still exists (balance < 0)
          if (debtState && debtState.isDebt && debtState.currentBalance < 0) {
            const actualPayment = Math.min(payment.paymentAmount, Math.abs(debtState.currentBalance))
            totalOneTimeDebtPayment += actualPayment
            activeOneTimePayments.push({ ...payment, paymentAmount: actualPayment })

            // Track as expense in goal impacts (use persisted goal ID)
            modifierImpacts[payment.goalId] = -actualPayment  // Negative = outflow/expense
          }
        }
      })

      // Calculate debt overpayments for this period (BEFORE netCashFlow calculation)
      let totalDebtOverpayment = 0
      const activeDebtOverpayments: DebtOverpayment[] = []

      debtOverpayments.forEach((overpayment) => {
        if (period >= overpayment.startPeriod && period < overpayment.endPeriod) {
          const debtState = statefulBalances[overpayment.baselineAccountIndex]
          // Only apply if debt still exists (balance < 0)
          if (debtState && debtState.isDebt && debtState.currentBalance < 0) {
            totalDebtOverpayment += overpayment.monthlyAmount
            activeDebtOverpayments.push(overpayment)

            // Note: Debt overpayments are TRANSFERS (cash → debt reduction), not expenses
            // They don't affect net cash flow, only move money between accounts
            // No tracking in modifierImpacts needed (handled as account contribution below)
          }
        }
      })

      // Process one-time withdrawals for this period (transfers from existing accounts)
      // Note: Withdrawals with isTransfer flag don't affect cash flow, only account balances
      const activeOneTimeWithdrawals: OneTimeWithdrawal[] = []

      oneTimeWithdrawals.forEach((withdrawal) => {
        if (period === withdrawal.withdrawalPeriod) {
          const accountState = statefulBalances[withdrawal.baselineAccountIndex]
          const accountName = this.scenario.baseline.accounts[withdrawal.baselineAccountIndex]?.getName()

          // Only apply if account exists and has sufficient balance
          if (!accountState || accountState.isDebt) {
            console.error(`❌ Transfer withdrawal failed: account ${accountName || 'unknown'} is invalid or is a debt account`)
            return
          }

          if (accountState.currentBalance <= 0) {
            console.error(`❌ Transfer withdrawal failed: ${accountName} has £0 balance (cannot withdraw £${withdrawal.withdrawalAmount.toLocaleString()})`)
            console.error(`   This means the transfer is NOT happening - baseline and scenario will be identical!`)
            return
          }

          const actualWithdrawal = Math.min(withdrawal.withdrawalAmount, accountState.currentBalance)

          if (actualWithdrawal < withdrawal.withdrawalAmount) {
            console.warn(`⚠️  Transfer withdrawal partial: ${accountName} only has £${accountState.currentBalance.toLocaleString()} (requested £${withdrawal.withdrawalAmount.toLocaleString()})`)
          }

          activeOneTimeWithdrawals.push({ ...withdrawal, withdrawalAmount: actualWithdrawal })

          // Note: No cash flow impact for transfers (isTransfer flag already disables cash flow)
          // Tracking in modifierImpacts is not needed for balance-only operations
        }
      })

      // Add one-time debt payments to expenses BEFORE netCashFlow calculation
      // Note: Recurring overpayments (totalDebtOverpayment) are NOT added here - they're transfers
      // handled in the account contributions phase, similar to ISA/pension contributions
      additionalExpenses += totalOneTimeDebtPayment

      const baseExpenses = this.scenario.baseline.monthlyExpenses
      const totalExpenses = baseExpenses + additionalExpenses

      // Apply interest rate changes from REFINANCE_DEBT modifiers and AUTO_REBALANCING boosts
      // Build map of most recent refinance for each account to handle multiple refinances correctly
      const accountRefinanceMap = new Map<number, { startPeriod: number, newRate: number, isAdditive?: boolean }>()

      this.scenario.modifiers.forEach(modifier => {
        if (modifier.archetype === ScenarioArchetype.INTEREST_RATE_CHANGE) {
          const refinanceStartPeriod = modifier.startDate ? this.dateToPeriod(modifier.startDate) : 0

          // Only consider refinances that have already started
          if (period >= refinanceStartPeriod) {
            const targetAccountName = modifier.linkedAccountName
            if (!targetAccountName) return

            // Find the matching account in baseline accounts (fuzzy match by name)
            // Try exact match first, then substring match (handles account suffixes like "(GIA)")
            const targetLower = targetAccountName.toLowerCase().trim()
            let accountIndex = this.scenario.baseline.accounts.findIndex(
              acc => acc.getName().toLowerCase().trim() === targetLower
            )

            // Fall back to substring match if no exact match
            if (accountIndex === -1) {
              const substringMatches = this.scenario.baseline.accounts
                .map((acc, idx) => ({ acc, idx }))
                .filter(({ acc }) => acc.getName().toLowerCase().includes(targetLower))

              if (substringMatches.length > 0) {
                if (substringMatches.length > 1) {
                  console.warn(`⚠️  Multiple accounts match "${targetAccountName}": ${substringMatches.map(m => m.acc.getName()).join(', ')}. Using first match.`)
                }
                accountIndex = substringMatches[0].idx
              } else {
                console.warn(`⚠️  INTEREST_RATE_CHANGE modifier "${modifier.name}" could not find account "${targetAccountName}"`)
              }
            }

            if (accountIndex >= 0) {
              // If this is the most recent refinance for this account, record it
              const existing = accountRefinanceMap.get(accountIndex)
              if (!existing || refinanceStartPeriod > existing.startPeriod) {
                const newAnnualRate = modifier.performance ?? 0  // New interest rate (%)
                // Check if this is an auto-rebalancing boost (additive) vs refinance (replacement)
                const isRebalancingBoost = modifier.assumptions?.rebalancingEnabled === true
                accountRefinanceMap.set(accountIndex, {
                  startPeriod: refinanceStartPeriod,
                  newRate: newAnnualRate,
                  isAdditive: isRebalancingBoost  // Flag to add boost to existing rate
                })
              }
            }
          }
        }
      })

      // Apply the most recent refinance for each account
      accountRefinanceMap.forEach((refinance, accountIndex) => {
        if (statefulBalances[accountIndex]) {
          // All accounts in this system use monthly frequency (baseline accounts are monthly)
          const periodsPerYear = 12
          const account = this.scenario.baseline.accounts[accountIndex]

          if (refinance.isAdditive) {
            // Auto-rebalancing: ADD boost to existing rate (e.g., 7% + 0.5% = 7.5%)
            // Convert current ratePerPeriod back to annual rate
            const currentRatePerPeriod = statefulBalances[accountIndex].ratePerPeriod
            const baselineAnnualRate = currentRatePerPeriod === 0
              ? 0
              : (Math.pow(1 + currentRatePerPeriod, periodsPerYear) - 1) * 100
            const boostedAnnualRate = baselineAnnualRate + refinance.newRate
            const boostedRatePerPeriod = boostedAnnualRate === 0
              ? 0
              : Math.pow(1 + (boostedAnnualRate / 100), 1 / periodsPerYear) - 1
            statefulBalances[accountIndex].ratePerPeriod = boostedRatePerPeriod

            console.log(`✅ Auto-rebalancing boost: ${account.getName()} ${baselineAnnualRate.toFixed(2)}% → ${boostedAnnualRate.toFixed(2)}% (+${refinance.newRate}% boost)`)
          } else {
            // Refinance: REPLACE rate with new rate (e.g., 4.5% → 3.5%)
            const newRatePerPeriod = refinance.newRate === 0
              ? 0
              : Math.pow(1 + (refinance.newRate / 100), 1 / periodsPerYear) - 1
            statefulBalances[accountIndex].ratePerPeriod = newRatePerPeriod
          }
        }
      })

      // Calculate total cash outflows AFTER compounding (BEFORE allocator)
      // We need to know actual contributions, not scheduled ones (debts might be paid off)
      let totalAccountContributions = 0
      let totalScheduledISAContributions = 0  // Track ISA contributions for UK £20k limit enforcement
      const actualContributions: number[] = [] // Track actual contributions for reporting

      statefulBalances.forEach((state, index) => {
        const account = this.scenario.baseline.accounts[index]
        const previousBalance = state.currentBalance
        const isDebt = state.isDebt
        const ratePerPeriod = state.ratePerPeriod

        // Skip if debt already paid off
        if (isDebt && previousBalance >= 0) {
          actualContributions[index] = 0
          return // No contribution needed
        }

        // Calculate what balance would be after compounding
        const balanceAfterGrowth = previousBalance * (1 + ratePerPeriod)

        // Get scheduled contribution
        let scheduledContribution = account.netCashFlowAtPeriod(period)

        // Override pension contributions to 0 if QUIT_JOB is active
        // Workplace pension contributions stop when employment ends
        const accountNameLower = account.getName().toLowerCase()
        const isWorkplacePension = accountNameLower.includes('pension') && accountNameLower.includes('workplace')
        if (isWorkplacePension && hasActiveQuitJob) {
          scheduledContribution = 0
        }

        // Cap ISA contributions at UK annual limit BEFORE processing
        if (!isDebt && scheduledContribution > 0) {
          scheduledContribution = this.capScheduledISAContribution(period, account, scheduledContribution)
        }

        if (isDebt) {
          // For debts: limit payment to amount needed to clear debt
          // Payment = min(scheduled_payment, debt_after_interest)
          const debtAfterGrowth = Math.abs(balanceAfterGrowth)
          const scheduledPayment = Math.abs(scheduledContribution)
          const actualPayment = Math.min(scheduledPayment, debtAfterGrowth)
          actualContributions[index] = actualPayment
          totalAccountContributions += actualPayment
        } else {
          // For assets: use capped scheduled contribution
          const assetContribution = Math.abs(scheduledContribution)
          actualContributions[index] = assetContribution
          totalAccountContributions += assetContribution
        }
      })

      // Cash flow calculations using two-step formula:
      // Step 1: netIncome = grossIncome - incomeTax - nationalInsurance (calculated above)
      // Step 2: netCashFlow = netIncome - expenses
      // This gets split into: scheduled contributions (debt payments) + automated allocations (savings/investments)
      const netCashFlow = netIncome - totalExpenses

      // Cap scheduled contributions at available net cash flow
      // If net cash flow < scheduled contributions, proportionally reduce all contributions
      if (totalAccountContributions > netCashFlow && netCashFlow > 0) {
        const scaleFactor = netCashFlow / totalAccountContributions
        actualContributions.forEach((contrib, index) => {
          actualContributions[index] = contrib * scaleFactor
        })
        totalAccountContributions = netCashFlow
      } else if (netCashFlow <= 0) {
        // No cash flow available - set all contributions to zero
        actualContributions.forEach((_, index) => {
          actualContributions[index] = 0
        })
        totalAccountContributions = 0
      }

      // Calculate cash available for automated allocations (after scheduled debt payments)
      let cashForAutomatedAllocations = netCashFlow - totalAccountContributions

      // Apply debt overpayments ONLY if surplus cash is available
      // This ensures overpayments don't happen when cash is tight (conservative approach)
      activeDebtOverpayments.forEach((overpayment) => {
        const debtState = statefulBalances[overpayment.baselineAccountIndex]
        if (!debtState || !debtState.isDebt || debtState.currentBalance >= 0) return

        // Only apply if there's surplus cash available
        if (cashForAutomatedAllocations <= 0) return

        const currentContrib = actualContributions[overpayment.baselineAccountIndex] || 0
        const ratePerPeriod = debtState.ratePerPeriod
        const balanceAfterGrowth = debtState.currentBalance * (1 + ratePerPeriod)
        const debtAfterGrowth = Math.abs(balanceAfterGrowth)

        // Cap overpayment to: min(requested, available surplus, remaining debt)
        const remainingDebt = Math.max(0, debtAfterGrowth - currentContrib)
        const actualOverpayment = Math.min(
          overpayment.monthlyAmount,
          cashForAutomatedAllocations,
          remainingDebt
        )

        if (actualOverpayment > 0) {
          actualContributions[overpayment.baselineAccountIndex] = currentContrib + actualOverpayment
          totalAccountContributions += actualOverpayment
          cashForAutomatedAllocations -= actualOverpayment  // Reduce available surplus
        }
      })

      // Step 2: Build combined account registry (baseline + active modifier accounts only)
      const accountRegistry = this.createAccountRegistry(this.scenario.baseline.accounts, 0)
      const activeModifierIndices: number[] = []

      modifierStatefulBalances.forEach(({ state, modifierId, startPeriod }, index) => {
        if (period >= startPeriod) {
          activeModifierIndices.push(index)
          const goal = this.scenario.modifiers.find(g => g.id === modifierId)
          if (goal && isTargetedModifier(goal)) {
            const wrapper: AccountWrapper = {
              account: state.account,
              startPeriod,
              isISA: state.account.isISA(),  // Use canonical accessor for metadata-driven ISA detection
              savingsGoalPriority: goal.savingsGoalPriority,
              savingsGoalTarget: goal.savingsGoalTarget,
              savingsGoalType: goal.savingsGoalType
            }

            if (goal.archetype === ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION ||
              goal.archetype === ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION) {
              if (goal.savingsGoalPriority !== undefined) {
                accountRegistry[AssetClass.HYSA]!.push(wrapper)
              } else if (goal.name.toLowerCase().includes('pension') || goal.name.toLowerCase().includes('retirement')) {
                accountRegistry[AssetClass.PENSION]!.push(wrapper)
              } else if (goal.name.toLowerCase().includes('property') || goal.name.toLowerCase().includes('car') || goal.name.toLowerCase().includes('asset')) {
                accountRegistry[AssetClass.OTHER_ASSETS]!.push(wrapper)
              } else {
                accountRegistry[AssetClass.EQUITIES]!.push(wrapper)
              }
            } else if (goal.archetype === ScenarioArchetype.ONE_OFF_INFLOW) {
              // One-off inflows go to default savings
              accountRegistry[AssetClass.DEFAULT_SAVINGS]!.push(wrapper)
            }
          }
        }
      })

      // Step 3: Call allocator with retirement context
      const retirementContext: RetirementContext | undefined = isRetired ? {
        isRetired: true,
        currentAge,
        monthlyIncome: grossIncome,  // Use gross income for tax calculations in pension withdrawal
        pensionState: modifierPensionState
      } : undefined

      const allocationResult = allocator.allocateCashFlow(
        cashForAutomatedAllocations,
        accountRegistry,
        period,
        this.isaTracker,
        retirementContext
      )

      if (retirementContext?.pensionState) {
        modifierPensionState = retirementContext.pensionState
      }

      // Step 4: Distribute allocator results across baseline + active modifier accounts
      // Concatenate baseline and active modifier states for combined distribution
      const activeModifierStates = activeModifierIndices.map(i => modifierStatefulBalances[i].state)
      const combinedAccounts = [
        ...this.scenario.baseline.accounts,
        ...activeModifierStates.map(s => s.account)
      ]
      const combinedStates = [...statefulBalances, ...activeModifierStates]

      const combinedAdjustments = this.distributeAllocatorResults(
        combinedAccounts,
        combinedStates,
        allocationResult,
        accountRegistry
      )

      // Step 4.25: Handle unmet deficit (when expenses > available assets)
      // Force deficit onto primary account (Current or Default Savings) to create overdraft/debt
      if (allocationResult.deficit > 0) {
        // Find suitable account to take the hit: Current Account -> Default Savings -> First Account
        const targetWrappers = accountRegistry[AssetClass.CURRENT_ACCOUNT] ||
          accountRegistry[AssetClass.DEFAULT_SAVINGS] ||
          []

        let targetAccountIndex = -1
        let targetAccountName = 'Unknown'

        if (targetWrappers.length > 0) {
          // Use first available account in priority class
          const wrapper = targetWrappers[0]
          targetAccountIndex = combinedAccounts.indexOf(wrapper.account)
          targetAccountName = wrapper.account.getName()
        } else if (combinedAccounts.length > 0) {
          // Fallback to absolute first account if no specific class found
          targetAccountIndex = 0
          targetAccountName = combinedAccounts[0].getName()
        }

        if (targetAccountIndex !== -1) {
          // Apply deficit as negative adjustment (forcing debt/overdraft)
          combinedAdjustments[targetAccountIndex] -= allocationResult.deficit
          console.log(`📉 Applied deficit £${allocationResult.deficit.toLocaleString()} to ${targetAccountName} (Force Overdraft)`)
        } else {
          console.error(`❌ Critical: Could not find account to apply deficit £${allocationResult.deficit.toLocaleString()}`)
        }
      }

      // Step 4.5: Apply debt payments and withdrawals to balance adjustments
      // (expense tracking already done above before netCashFlow calculation)
      activeOneTimePayments.forEach((payment) => {
        combinedAdjustments[payment.baselineAccountIndex] += payment.paymentAmount
      })

      // Note: Debt overpayments already applied via actualContributions (scheduled contributions)
      // No need to apply via combinedAdjustments to avoid double-counting

      // Apply one-time withdrawals (transfers): reduce source account balance
      activeOneTimeWithdrawals.forEach((withdrawal) => {
        combinedAdjustments[withdrawal.baselineAccountIndex] -= withdrawal.withdrawalAmount

        // Log transfer details for debugging
        const accountName = this.scenario.baseline.accounts[withdrawal.baselineAccountIndex].getName()
        console.log(`💸 Transfer withdrawal: ${accountName} -£${withdrawal.withdrawalAmount.toLocaleString()} in period ${period}`)
      })

      // Step 5: Evolve baseline accounts (always)
      // Track compound growth (interest earned) separately from contributions
      let totalCompoundGrowth = 0
      let totalContributionsThisPeriod = 0

      statefulBalances.forEach((state, index) => {
        const scheduledContrib = actualContributions[index] || 0
        const allocatorAdjust = combinedAdjustments[index]

        const { newBalance, interestEarned } = this.evolveAccountBalance(state, period, scheduledContrib, allocatorAdjust)
        state.currentBalance = newBalance

        // Track growth drivers
        totalCompoundGrowth += interestEarned
        totalContributionsThisPeriod += scheduledContrib + allocatorAdjust
      })

      // Step 6: Evolve active modifier accounts only (no scheduled contributions for modifier accounts)
      activeModifierIndices.forEach((modifierIndex, activeIndex) => {
        const modifierWrapper = modifierStatefulBalances[modifierIndex]
        const adjustedPeriod = period - modifierWrapper.startPeriod
        const adjustment = combinedAdjustments[statefulBalances.length + activeIndex]

        const { newBalance, interestEarned } = this.evolveAccountBalance(
          modifierWrapper.state,
          adjustedPeriod,
          0,  // No scheduled contributions for modifier accounts
          adjustment
        )
        modifierWrapper.state.currentBalance = newBalance

        // Track growth drivers from modifier accounts
        totalCompoundGrowth += interestEarned
        totalContributionsThisPeriod += adjustment
      })

      // Step 7: Calculate net worth from evolved balances
      let totalAssetValue = 0
      let totalDebtValue = 0
      let totalContributions = 0
      const assetCategories: CategoryBreakdown[] = []
      const debtCategories: CategoryBreakdown[] = []

      // Track scheduled contributions by account name for chart display
      const scheduledContributionsByAccount: Record<string, number> = {}

      // Sum baseline accounts
      statefulBalances.forEach((state, index) => {
        const account = this.scenario.baseline.accounts[index]
        const value = state.currentBalance
        const accountName = account.getName() || `Account ${index}`

        // Convert monthly rate to annual percentage: annualRate = monthlyRate * 12 * 100
        const annualRate = state.ratePerPeriod * 12 * 100

        // Use actual contribution (stops when debt paid off) not scheduled
        const actualContrib = actualContributions[index] || 0
        totalContributions += actualContrib

        // Track scheduled contributions by account name (for chart display)
        if (actualContrib > 0) {
          scheduledContributionsByAccount[accountName] = actualContrib
        }

        if (value < 0) {
          const debtAmount = Math.abs(value)
          totalDebtValue += debtAmount
          debtCategories.push({ name: accountName, value: debtAmount, annualRate })
        } else {
          totalAssetValue += value
          // Always include savings goal accounts in breakdown, even if balance is 0
          // This allows users to see Emergency Fund, Education Fund, etc. immediately
          const isSavingsGoal = account.metadata?.savingsGoalPriority !== undefined
          if (value > 0 || isSavingsGoal) {
            assetCategories.push({ name: accountName, value, annualRate })
          }
        }
      })

      // Sum active modifier accounts
      activeModifierIndices.forEach(modifierIndex => {
        const { state, startPeriod } = modifierStatefulBalances[modifierIndex]
        const value = state.currentBalance
        const adjustedPeriod = period - startPeriod
        const cashFlow = state.account.netCashFlowAtPeriod(adjustedPeriod)

        totalContributions += Math.abs(cashFlow)

        if (value < 0) {
          const debtAmount = Math.abs(value)
          totalDebtValue += debtAmount
          debtCategories.push({ name: state.account.getName(), value: debtAmount })
        } else {
          totalAssetValue += value
          // Always include savings goal accounts in breakdown, even if balance is 0
          const isSavingsGoal = state.account.metadata?.savingsGoalPriority !== undefined
          if (value > 0 || isSavingsGoal) {
            assetCategories.push({ name: state.account.getName(), value })
          }
        }
      })

      const netWorth = totalAssetValue - totalDebtValue

      // Build modifier breakdowns using evolved balances
      const modifierBreakdowns: Array<{
        name: string
        scenarioId: string
        cashFlowImpact: number
        netWorthImpact: number
      }> = []

      // Track business scenarios and their profit contributions for corp tax allocation
      const businessProfitByScenario = new Map<string, number>()

      // First pass: calculate profit per business scenario
      this.scenario.modifiers.forEach(modifier => {
        const modifierFlow = modifierImpacts[modifier.id] || 0
        const isBusinessIncome = isTargetedModifier(modifier) && modifier.incomeType === 'business' && modifierFlow > 0
        const isBusinessCost = isTargetedModifier(modifier) && modifier.incomeType === 'business' && modifierFlow < 0

        if ((isBusinessIncome || isBusinessCost) && modifier.scenarioId) {
          const currentProfit = businessProfitByScenario.get(modifier.scenarioId) || 0
          businessProfitByScenario.set(modifier.scenarioId, currentProfit + modifierFlow)
        }
      })

      // Calculate total business profit for proportional tax allocation
      const totalBusinessProfit = Array.from(businessProfitByScenario.values()).reduce((sum, profit) => sum + profit, 0)

      // Second pass: build modifier breakdowns
      this.scenario.modifiers.forEach(modifier => {
        const modifierFlow = modifierImpacts[modifier.id] || 0
        // Include setup costs (posted with -setup suffix) in the total cash flow impact
        const setupFlow = modifierImpacts[`${modifier.id}-setup`] || 0
        const totalCashFlowImpact = modifierFlow + setupFlow

        const hasActiveAccount = modifierStatefulBalances.some(
          ({ modifierId, startPeriod }) => modifierId === modifier.id && period >= startPeriod
        )

        if (totalCashFlowImpact !== 0 || hasActiveAccount) {
          // Calculate net worth impact from evolved modifier account balances
          let netWorthImpact = 0
          modifierStatefulBalances.forEach(({ state, modifierId, startPeriod }) => {
            if (modifierId === modifier.id && period >= startPeriod) {
              netWorthImpact += state.currentBalance
            }
          })

          modifierBreakdowns.push({
            name: modifier.name,
            scenarioId: modifier.scenarioId || modifier.name,  // Use scenarioId for grouping, fallback to name
            cashFlowImpact: totalCashFlowImpact,
            netWorthImpact
          })
        }
      })

      // Add corporation tax as separate negative impacts for each business scenario
      // Allocate proportionally based on each scenario's share of total business profit
      if (monthlyCorporationTax > 0 && businessProfitByScenario.size > 0 && totalBusinessProfit > 0) {
        businessProfitByScenario.forEach((scenarioProfit, businessScenarioId) => {
          const profitShare = scenarioProfit / totalBusinessProfit
          const allocatedTax = monthlyCorporationTax * profitShare

          if (allocatedTax > 0.01) {  // Only add if meaningful (> 1p)
            modifierBreakdowns.push({
              name: `${businessScenarioId} - Corporation Tax`,
              scenarioId: businessScenarioId,  // Group with the business scenario
              cashFlowImpact: -allocatedTax,  // Negative = tax expense
              netWorthImpact: 0
            })
          }
        })
      }

      projection.push({
        period,
        cashFlow: netCashFlow,
        netWorth,
        breakdown: {
          income: grossIncome,  // Gross income (before tax/NI)
          baselineIncome: baselineGrossIncome,  // Baseline gross income
          goalIncome: additionalIncome,  // DEPRECATED: Use scenarioIncome instead
          scenarioIncome: additionalIncome,  // Income from all scenarios (non-business)
          scenarioExpenses: additionalExpenses,  // Expenses from all scenarios (non-business)
          scenarioNetCashFlow: additionalIncome - additionalExpenses,  // Net cash flow impact from scenarios
          expenses: totalExpenses,
          baselineExpenses: baseExpenses,
          accountContributions: totalContributions,
          goalExpenses: additionalExpenses,
          assetValue: totalAssetValue,
          debtValue: totalDebtValue,
          goalImpacts: modifierImpacts,
          assetCategories,
          debtCategories,
          incomeTax: monthlyTax,
          nationalInsurance: monthlyNI,
          statePensionIncome: statePensionIncomeBaseline,  // State pension from baseline config
          privatePensionIncome: privatePensionIncomeScenario,  // Private pension from liquidations
          businessRevenue,  // Gross business revenue for this period
          businessCosts,  // Business operating costs for this period
          businessProfit: monthlyBusinessProfit,  // Business profit before tax (revenue - costs)
          corporationTax: monthlyCorporationTax,  // Corporation tax on business profit
          businessNetProfit: monthlyBusinessNetProfit,  // Business profit after corporation tax
          goalBreakdowns: modifierBreakdowns,
          cashFlowAllocations: allocationResult.allocations,
          cashFlowLiquidations: allocationResult.liquidations,
          liquidationAccounts: allocationResult.liquidationAccounts,
          scheduledContributions: scheduledContributionsByAccount,
          surplusCash: allocationResult.surplusCash,
          compoundGrowth: totalCompoundGrowth,
          totalContributionsThisPeriod: totalContributionsThisPeriod
        }
      })
    }

    return {
      projection,
      solvency: calculateSolvency(projection, this.simulationStartYear, this.simulationStartMonth)
    }
  }

  private createModifierAccounts(
    modifier: ScenarioModifier,
    modifierAccounts: ModifierAccountWrapper[],
    modifierCashFlows: Map<number, Map<string, number>>
  ): void {
    const startPeriod = modifier.startDate
      ? this.dateToPeriod(modifier.startDate)
      : 0

    // Only TargetedModifiers have targetDate and cashFlowBehavior
    if (!isTargetedModifier(modifier) && !isStudentLoanModifier(modifier)) {
      // ConfigModifiers don't create accounts or cash flows
      return
    }

    const targetPeriod = isTargetedModifier(modifier) ? this.dateToPeriod(modifier.targetDate) : 0
    const behavior = isTargetedModifier(modifier) ? (modifier.cashFlowBehavior || 'asset') : 'asset'  // Default to asset for backward compatibility

    // Handle by cash flow behavior (overrides archetype)
    if (behavior === 'lump_sum_expense') {
      // Pure expense: single outflow at target date, no account creation
      this.addLumpSumExpense(modifier, targetPeriod, modifierCashFlows)
      return
    }

    if (behavior === 'sinking_expense') {
      // Save gradually then spend: monthly outflows + final withdrawal at target
      this.addSinkingExpense(modifier, startPeriod, targetPeriod, modifierCashFlows)
      return
    }

    // For 'asset' behavior, fall back to archetype-specific logic for PRIMARY archetype
    switch (modifier.archetype) {
      case ScenarioArchetype.ONE_OFF_INFLOW:
        this.addOneOffInflowAccount(modifier, targetPeriod, modifierAccounts, modifierCashFlows)
        break

      case ScenarioArchetype.ONE_OFF_EXPENSE:
        this.addOneOffExpenseCashFlow(modifier, targetPeriod, modifierCashFlows)
        break

      case ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION:
        this.addOneOffAccountContribution(modifier, targetPeriod, modifierAccounts, modifierCashFlows)
        break

      case ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION:
        this.addRecurringAccumulationAccount(modifier, startPeriod, targetPeriod, modifierAccounts)
        break

      case ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL:
        this.addOneOffWithdrawalCashFlow(modifier, targetPeriod, modifierCashFlows)
        break

      case ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL:
        this.addRecurringWithdrawalCashFlow(modifier, startPeriod, targetPeriod, modifierCashFlows)
        break

      case ScenarioArchetype.RECURRING_EXPENSE:
        // For RECURRING_EXPENSE, endPeriod should be calculated from startDate + duration
        // targetPeriod may be used for setup costs, not as the end period
        const expenseEndPeriod = modifier.duration
          ? startPeriod + (modifier.duration * 12)
          : this.periodsToProject
        this.addRecurringExpenseCashFlow(modifier, startPeriod, expenseEndPeriod, modifierCashFlows)
        break

      case ScenarioArchetype.RECURRING_INCOME:
        // For RECURRING_INCOME, endPeriod should be calculated from startDate + duration
        // targetPeriod is used for one-off setup costs, not as the end period
        const endPeriod = modifier.duration
          ? startPeriod + (modifier.duration * 12)
          : this.periodsToProject
        this.addCashFlowPositiveCashFlow(modifier, startPeriod, endPeriod, modifierCashFlows)
        break

      case ScenarioArchetype.NEW_DEBT:
        // Create a new debt account dynamically (loan, mortgage, credit)
        this.addNewDebtAccount(modifier, startPeriod, modifierAccounts)
        break

      case ScenarioArchetype.STUDENT_LOAN:
        // Create a student loan account with income-contingent repayment
        // Payment calculated dynamically each period based on gross salary
        this.addStudentLoanAccount(modifier, startPeriod, modifierAccounts)
        break
    }
  }

  /**
   * Add lump sum expense: single outflow at target date (no account wrapper)
   */
  private addLumpSumExpense(
    goal: Goal,
    targetPeriod: number,
    goalCashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    if (!goalCashFlows.has(targetPeriod)) {
      goalCashFlows.set(targetPeriod, new Map())
    }
    const periodFlows = goalCashFlows.get(targetPeriod)!
    periodFlows.set(goal.id, -goal.targetAmount)  // Negative = expense outflow
  }

  /**
   * Add sinking expense: monthly savings outflows + final spend at target date
   */
  private addSinkingExpense(
    goal: Goal,
    startPeriod: number,
    targetPeriod: number,
    goalCashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    const durationPeriods = targetPeriod - startPeriod
    if (durationPeriods <= 0) {
      // No time to save, treat as lump sum
      this.addLumpSumExpense(goal, targetPeriod, goalCashFlows)
      return
    }

    // Calculate monthly contribution needed
    const monthlyContribution = goal.targetAmount / durationPeriods

    // Add negative cash flows for each period (saving for the goal)
    for (let period = startPeriod; period < targetPeriod; period++) {
      if (!goalCashFlows.has(period)) {
        goalCashFlows.set(period, new Map())
      }
      const periodFlows = goalCashFlows.get(period)!
      periodFlows.set(goal.id, -monthlyContribution)  // Negative = expense/savings outflow
    }

    // At target date, withdraw/spend the accumulated amount (final expense)
    // This is implicit - the money was already spent via monthly outflows
    // No additional withdrawal needed as we're treating it as pure expense from day 1
  }

  private addOneOffExpenseCashFlow(
    goal: Goal,
    period: number,
    cashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    if (!cashFlows.has(period)) {
      cashFlows.set(period, new Map())
    }
    cashFlows.get(period)!.set(goal.id, -goal.targetAmount)
  }

  private addOneOffInflowAccount(
    goal: Goal,
    period: number,
    modifierAccounts: ModifierAccountWrapper[],
    cashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    // ONE_OFF_INFLOW creates pure positive cash flow (money coming IN)
    // Examples: loan proceeds, lottery, inheritance, pension withdrawals
    // The cash flows into Current Account automatically via cash flow allocation
    // No new tracking account is created (would double-count the inflow)

    if (!cashFlows.has(period)) {
      cashFlows.set(period, new Map())
    }
    cashFlows.get(period)!.set(goal.id, +goal.targetAmount)  // Positive = cash inflow
  }

  private addOneOffAccountContribution(
    goal: Goal,
    period: number,
    modifierAccounts: ModifierAccountWrapper[],
    cashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    // If linkedAccountName is present with negative startingAmount, this is a debt payment
    // handled by oneTimeDebtPayments tracking - don't create modifier account
    if (goal.linkedAccountName && goal.startingAmount && goal.startingAmount < 0) {
      // Cash flow already tracked by one-time debt payment logic
      return
    }

    // Skip cash flow for transfers (balance-only operations)
    // Transfers move money between accounts without affecting net cash flow
    if (!goal.assumptions?.isTransfer) {
      // Create NEGATIVE cash flow entry for money going OUT to invest/contribute
      // This represents investments, business equity contributions, etc.
      // Cash ↓, new account created to track investment, net worth unchanged (transfer)
      if (!cashFlows.has(period)) {
        cashFlows.set(period, new Map())
      }
      cashFlows.get(period)!.set(goal.id, -goal.targetAmount)  // Negative = cash outflow for investment
    }

    const defaults = ARCHETYPE_PARAMETER_DEFAULTS[ScenarioArchetype.ONE_OFF_EXPENSE]

    // Build metadata object for savings goals (priority-based allocation)
    const metadata: Record<string, any> = {}
    if (goal.savingsGoalPriority !== undefined) {
      metadata.savingsGoalPriority = goal.savingsGoalPriority
    }
    if (goal.savingsGoalTarget !== undefined) {
      metadata.savingsGoalTarget = goal.savingsGoalTarget
    }
    if (goal.savingsGoalType !== undefined) {
      metadata.savingsGoalType = goal.savingsGoalType
    }

    const account = new BalanceAccount({
      name: goal.name,
      startingBalance: goal.targetAmount,
      contribution: 0,
      frequency: 'monthly',
      performance: goal.performance ?? defaults.defaultPerformance,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined  // Only pass metadata if it exists
    })

    // Log transfer contribution details
    if (goal.assumptions?.isTransfer) {
      console.log(`💰 Transfer contribution: Creating ${goal.name} account with £${goal.targetAmount.toLocaleString()} at ${goal.performance}% return`)
    }

    modifierAccounts.push({ account, modifierId: goal.id, startPeriod: period })
  }

  private addRecurringAccumulationAccount(
    goal: Goal,
    startPeriod: number,
    endPeriod: number,
    modifierAccounts: ModifierAccountWrapper[]
  ): void {
    if (!isTargetedModifier(goal)) return

    const durationMonths = Math.max(1, endPeriod - startPeriod)

    // Use monthlyContribution if specified (for actions), otherwise calculate from targetAmount (for goals)
    const monthlyContribution = goal.monthlyContribution
      ? goal.monthlyContribution
      : goal.targetAmount / durationMonths

    const defaults = ARCHETYPE_PARAMETER_DEFAULTS[ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION]

    // Build metadata object for savings goals (priority-based allocation)
    const metadata: Record<string, any> = {}
    if (goal.savingsGoalPriority !== undefined) {
      metadata.savingsGoalPriority = goal.savingsGoalPriority
    }
    if (goal.savingsGoalTarget !== undefined) {
      metadata.savingsGoalTarget = goal.savingsGoalTarget
    }
    if (goal.savingsGoalType !== undefined) {
      metadata.savingsGoalType = goal.savingsGoalType
    }

    const account = new BalanceAccount({
      name: goal.name,
      startingBalance: goal.startingAmount ?? defaults.defaultStartingAmount,
      contribution: monthlyContribution,
      frequency: 'monthly',
      performance: goal.performance ?? defaults.defaultPerformance,
      contributionStopAfterPeriods: durationMonths,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined  // Only pass metadata if it exists
    })

    modifierAccounts.push({ account, modifierId: goal.id, startPeriod })
  }

  private addDebtReductionAccount(
    goal: Goal,
    startPeriod: number,
    endPeriod: number,
    modifierAccounts: ModifierAccountWrapper[],
    goalCashFlows?: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    // Check if this is an overpayment action (has linkedAccountName)
    if (goal.linkedAccountName && goalCashFlows) {
      // Debt overpayment: add negative cash flow (extra payment) for each period
      const durationMonths = Math.max(1, endPeriod - startPeriod)
      const monthlyOverpayment = goal.monthlyContribution || (goal.targetAmount / durationMonths)

      // Add negative cash flow for each period from start to end
      for (let period = startPeriod; period < endPeriod; period++) {
        if (!goalCashFlows.has(period)) {
          goalCashFlows.set(period, new Map())
        }
        const periodFlows = goalCashFlows.get(period)!
        periodFlows.set(goal.id, -monthlyOverpayment)  // Negative = outflow/payment
      }

      // Don't create a new debt account - the extra payment reduces existing baseline debt
      return
    }

    // Legacy debt reduction: create a new debt account (for backward compatibility)
    const durationMonths = Math.max(1, endPeriod - startPeriod)
    const monthlyPayment = goal.targetAmount / durationMonths

    const defaults = ARCHETYPE_PARAMETER_DEFAULTS[ScenarioArchetype.ONE_OFF_EXPENSE]
    const account = new BalanceAccount({
      name: goal.name,
      startingBalance: goal.targetAmount,
      contribution: monthlyPayment,
      frequency: 'monthly',
      performance: goal.performance ?? defaults.defaultPerformance,
      isDebt: true
    })

    modifierAccounts.push({ account, modifierId: goal.id, startPeriod })
  }

  private addNewDebtAccount(
    modifier: ScenarioModifier,
    startPeriod: number,
    modifierAccounts: ModifierAccountWrapper[]
  ): void {
    if (!isTargetedModifier(modifier)) return

    // NEW_DEBT creates a debt account dynamically (loan, mortgage, credit)
    // Expects: targetAmount (loan principal), performance (interest rate), monthlyContribution (payment)
    // Name can come from assumptions.accountName or default to modifier name

    const loanAmount = modifier.targetAmount || 0
    const interestRate = modifier.performance || 0
    const monthlyPayment = modifier.monthlyContribution || 0
    const stopAfterPeriods = modifier.contributionStopAfterPeriods
    const accountName = modifier.assumptions?.accountName || modifier.name

    // Create debt account with NEGATIVE starting balance (debt is negative)
    // BalanceAccount class expects debt to be positive values that it will flip internally
    const account = new BalanceAccount({
      name: accountName,
      startingBalance: loanAmount,  // BalanceAccount handles sign conversion for debt
      contribution: monthlyPayment,  // Monthly payment reduces debt
      contributionStopAfterPeriods: stopAfterPeriods,  // Stop payments after loan is repaid
      frequency: 'monthly',
      performance: interestRate,  // Interest rate on outstanding balance
      isDebt: true  // Mark as debt account (BalanceAccount will handle negative balance internally)
    })

    modifierAccounts.push({ account, modifierId: modifier.id, startPeriod })

    const numPayments = stopAfterPeriods || 'unlimited'
    console.log(`💳 New debt account created: ${accountName} - £${loanAmount.toLocaleString()} at ${interestRate}% APR, £${monthlyPayment.toLocaleString()}/month for ${numPayments} payments`)
  }

  private addStudentLoanAccount(
    modifier: ScenarioModifier,
    startPeriod: number,
    modifierAccounts: ModifierAccountWrapper[]
  ): void {
    if (!isStudentLoanModifier(modifier)) return

    // STUDENT_LOAN creates a debt account with income-contingent repayment
    // Payment = 9% of (salary - threshold) calculated dynamically each period
    // Expects: assumptions.loanAmount, assumptions.planType, assumptions.threshold

    const loanAmount = modifier.assumptions?.loanAmount || 0
    const planType = modifier.assumptions?.planType || 'plan2'
    const threshold = modifier.assumptions?.threshold || 27295  // Plan 2 default
    const interestRate = modifier.assumptions?.interestRate || 6.5  // Placeholder, will be dynamic
    const accountName = modifier.name || `Student Loan (${planType.toUpperCase()})`

    // Create debt account with 0 contribution initially
    // Contributions will be calculated dynamically based on salary each period
    const account = new BalanceAccount({
      name: accountName,
      startingBalance: loanAmount,  // BalanceAccount handles sign conversion for debt
      contribution: 0,  // Income-contingent: calculated dynamically each period
      frequency: 'monthly',
      performance: interestRate,  // Interest rate on outstanding balance
      isDebt: true  // Mark as debt account
    })

    modifierAccounts.push({ account, modifierId: modifier.id, startPeriod })

    console.log(`🎓 Student loan account created: ${accountName} - £${loanAmount.toLocaleString()} at ${interestRate}% APR, ${planType.toUpperCase()} (9% above £${threshold.toLocaleString()})`)
  }

  private addSafetyNetAccount(
    goal: Goal,
    period: number,
    modifierAccounts: ModifierAccountWrapper[],
    cashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    if (!cashFlows.has(period)) {
      cashFlows.set(period, new Map())
    }
    cashFlows.get(period)!.set(goal.id, -goal.targetAmount)

    const defaults = ARCHETYPE_PARAMETER_DEFAULTS[ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION]
    const account = new BalanceAccount({
      name: goal.name,
      startingBalance: goal.targetAmount,
      contribution: 0,
      frequency: 'monthly',
      performance: goal.performance ?? defaults.defaultPerformance
    })

    modifierAccounts.push({ account, modifierId: goal.id, startPeriod: period })
  }

  private addIncomeInvestmentCashFlow(
    goal: Goal,
    period: number,
    cashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    if (!cashFlows.has(period)) {
      cashFlows.set(period, new Map())
    }
    cashFlows.get(period)!.set(goal.id, -goal.targetAmount)

    // Use archetype defaults for income multiplier and delay
    const defaults = ARCHETYPE_PARAMETER_DEFAULTS[ScenarioArchetype.ONE_OFF_EXPENSE]
    const incomeMultiplier = goal.assumptions?.incomeMultiplier ?? defaults.incomeMultiplier ?? 0.1
    const delayMonths = goal.assumptions?.incomeDelayMonths ?? defaults.incomeDelayMonths ?? 12

    const futureIncomeIncrease = goal.targetAmount * incomeMultiplier
    const benefitStartPeriod = period + delayMonths

    for (let p = benefitStartPeriod; p < this.periodsToProject; p++) {
      if (!cashFlows.has(p)) {
        cashFlows.set(p, new Map())
      }
      const existing = cashFlows.get(p)!.get(goal.id) || 0
      cashFlows.get(p)!.set(goal.id, existing + futureIncomeIncrease)
    }
  }

  private addRecurringExpenseCashFlow(
    goal: Goal,
    startPeriod: number,
    endPeriod: number,
    cashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    // Use monthlyContribution if available and amountInterpretation is 'monthly'
    // Otherwise fall back to targetAmount / duration (legacy behavior)
    const monthlyExpense =
      (goal.monthlyContribution !== undefined && goal.amountInterpretation === 'monthly')
        ? goal.monthlyContribution
        : goal.targetAmount / Math.max(1, endPeriod - startPeriod)

    for (let p = startPeriod; p < Math.min(endPeriod, this.periodsToProject); p++) {
      if (!cashFlows.has(p)) {
        cashFlows.set(p, new Map())
      }
      cashFlows.get(p)!.set(goal.id, -monthlyExpense)  // Negative for expense
    }
  }

  private addCashFlowPositiveCashFlow(
    goal: Goal,
    startPeriod: number,
    endPeriod: number,
    cashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    // Handle optional initial one-off cost (e.g., equipment purchase, business setup)
    // startingAmount < 0 represents upfront expense
    // Use setupCostDate from assumptions if provided, otherwise fall back to targetDate
    if (goal.startingAmount && goal.startingAmount < 0) {
      const setupDate = goal.assumptions?.setupDate || goal.assumptions?.expansionDate || goal.assumptions?.trainingStartDate || goal.targetDate
      const setupPeriod = this.dateToPeriod(setupDate)
      if (!cashFlows.has(setupPeriod)) {
        cashFlows.set(setupPeriod, new Map())
      }
      cashFlows.get(setupPeriod)!.set(`${goal.id}-setup`, goal.startingAmount)  // Negative = expense
    }

    // Use monthlyContribution if available and amountInterpretation is 'monthly'
    // Otherwise fall back to targetAmount (legacy behavior for goals that don't set monthlyContribution)
    const monthlyCashFlowIncrease =
      (goal.monthlyContribution !== undefined && goal.amountInterpretation === 'monthly')
        ? goal.monthlyContribution
        : goal.targetAmount

    // Guard against NaN/undefined only - allow signed values (positive adds income, negative would reduce)
    const baseIncrease = monthlyCashFlowIncrease || 0

    // Support perpetual boosts (duration = 0 means runs to end of projection)
    const actualEndPeriod = goal.duration === 0 ? this.periodsToProject : Math.min(endPeriod, this.periodsToProject)

    // Check for annual percentage compounding (Increase Salary with annual % increases)
    const annualPercentage = goal.assumptions?.annualPercentage
    const hasAnnualCompounding = annualPercentage && annualPercentage > 0

    if (hasAnnualCompounding) {
      // Apply compounding: each year, the increase grows by the annual percentage
      let currentIncrease = baseIncrease
      let yearsSinceStart = 0

      for (let p = startPeriod; p < actualEndPeriod; p++) {
        // Calculate which year we're in (12 months per year)
        const periodsFromStart = p - startPeriod
        const currentYear = Math.floor(periodsFromStart / 12)

        // Apply compounding at the start of each new year
        if (currentYear > yearsSinceStart) {
          yearsSinceStart = currentYear
          currentIncrease = baseIncrease * Math.pow(1 + annualPercentage / 100, yearsSinceStart)
        }

        if (!cashFlows.has(p)) {
          cashFlows.set(p, new Map())
        }
        cashFlows.get(p)!.set(goal.id, currentIncrease)
      }
    } else {
      // No compounding - apply the same increase every period
      for (let p = startPeriod; p < actualEndPeriod; p++) {
        if (!cashFlows.has(p)) {
          cashFlows.set(p, new Map())
        }
        cashFlows.get(p)!.set(goal.id, baseIncrease)
      }
    }
  }

  private addOneOffWithdrawalCashFlow(
    goal: Goal,
    period: number,
    cashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    // Skip cash flow for transfers (balance-only operations)
    if (goal.assumptions?.isTransfer) {
      return
    }

    if (!cashFlows.has(period)) {
      cashFlows.set(period, new Map())
    }
    cashFlows.get(period)!.set(goal.id, goal.targetAmount)  // Positive for inflow from withdrawal
  }

  private addRecurringWithdrawalCashFlow(
    goal: Goal,
    startPeriod: number,
    endPeriod: number,
    cashFlows: Map<number, Map<string, number>>
  ): void {
    if (!isTargetedModifier(goal)) return

    const monthlyWithdrawal =
      (goal.monthlyContribution !== undefined && goal.amountInterpretation === 'monthly')
        ? goal.monthlyContribution
        : goal.targetAmount / Math.max(1, endPeriod - startPeriod)

    for (let p = startPeriod; p < Math.min(endPeriod, this.periodsToProject); p++) {
      if (!cashFlows.has(p)) {
        cashFlows.set(p, new Map())
      }
      cashFlows.get(p)!.set(goal.id, monthlyWithdrawal)  // Positive for inflow from withdrawal
    }
  }

  /**
   * Create account registry mapping asset classes to baseline accounts
   * Maps accounts by name patterns to asset classes for allocation/liquidation
   * Returns arrays of AccountWrappers to support multiple accounts per class
   */
  private createAccountRegistry(accounts: BalanceAccount[], startPeriod: number = 0): AccountRegistry {
    const registry: AccountRegistry = {
      [AssetClass.CURRENT_ACCOUNT]: [],
      [AssetClass.HYSA]: [],
      [AssetClass.GENERAL_INVESTMENT]: [],
      [AssetClass.EQUITIES]: [],
      [AssetClass.PENSION]: [],
      [AssetClass.OTHER_ASSETS]: [],
      [AssetClass.DEFAULT_SAVINGS]: []
    }

    accounts.forEach(account => {
      const name = account.getName().toLowerCase()

      // Detect if account is ISA-wrapped using canonical accessor (metadata-driven with name fallback)
      const isISA = account.isISA()

      // Detect savings goal metadata (priority, target, type) from account metadata
      const savingsGoalPriority = account.metadata?.savingsGoalPriority
      const savingsGoalTarget = account.metadata?.savingsGoalTarget
      const savingsGoalType = account.metadata?.savingsGoalType

      const wrapper: AccountWrapper = {
        account,
        startPeriod,
        isISA,
        savingsGoalPriority,
        savingsGoalTarget,
        savingsGoalType
      }

      // Map accounts to asset classes based on name patterns
      if (name.includes('current') || name.includes('checking')) {
        registry[AssetClass.CURRENT_ACCOUNT]!.push(wrapper)
      } else if (name.includes('emergency') || name.includes('education') || name.includes('house deposit') || savingsGoalPriority !== undefined) {
        // HYSA (High-Yield Savings Account) for priority-based savings goals
        registry[AssetClass.HYSA]!.push(wrapper)
      } else if (name.includes('hysa') || name.includes('high yield')) {
        // HYSA without specific goal → default savings
        registry[AssetClass.DEFAULT_SAVINGS]!.push(wrapper)
      } else if (name.includes('savings') && !name.includes('pension')) {
        registry[AssetClass.DEFAULT_SAVINGS]!.push(wrapper)
      } else if (name.includes('general investment')) {
        // General Investment Account (GIA) - taxable investment account with automated contributions
        registry[AssetClass.GENERAL_INVESTMENT]!.push(wrapper)
      } else if (name.includes('isa')) {
        // ISA (Individual Savings Account) - UK tax-free wrapper for equities
        registry[AssetClass.EQUITIES]!.push(wrapper)
      } else if (name.includes('equities') || name.includes('stocks')) {
        // Generic equities/stocks (non-ISA) - map to GIA for taxable treatment
        registry[AssetClass.GENERAL_INVESTMENT]!.push(wrapper)
      } else if (name.includes('pension') || name.includes('401k') || name.includes('retirement')) {
        registry[AssetClass.PENSION]!.push(wrapper)
      } else if (name.includes('property') || name.includes('house') || name.includes('car')) {
        registry[AssetClass.OTHER_ASSETS]!.push(wrapper)
      }
    })

    return registry
  }

  private dateToPeriod(date: Date): number {
    // Calculate periods relative to simulation start (year + month)
    // Use UTC to avoid timezone-dependent month shifts (e.g., 2025-06-30T21:00:00Z staying in June)
    const yearDiff = date.getUTCFullYear() - this.simulationStartYear
    const monthDiff = date.getUTCMonth() - this.simulationStartMonth
    const totalMonths = (yearDiff * 12) + monthDiff
    return Math.max(0, totalMonths)
  }
}
