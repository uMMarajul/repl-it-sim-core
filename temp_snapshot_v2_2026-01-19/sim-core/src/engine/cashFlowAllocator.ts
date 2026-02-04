import { AssetClass } from './scenarioSimulator'
import { BalanceAccount } from './balanceAccount'
import {
  PensionWithdrawalState,
  calculateWithdrawalCapacity,
  executePensionWithdrawal,
  resetPeriodTracking,
  UK_CGT_RULES
} from '../config/ukPensionRules'

// Re-export for convenience
export { initializePensionState, resetPeriodTracking } from '../config/ukPensionRules'

export interface AllocationConfig {
  automatedAllocationPercentages: Partial<Record<AssetClass, number>>  // % of surplus to each asset class
  surplusAllocation?: {
    assetClass: AssetClass  // Where to route surplus cash (after automated allocations & savings goals)
  }
  // Note: Savings goal targets (emergency fund, education fund, etc.) are now set explicitly
  // via ScenarioModifier.savingsGoalTarget when creating the savings goal account
}

export interface RetirementContext {
  isRetired: boolean
  currentAge: number
  monthlyIncome: number  // Monthly income for year-to-date tax calculations
  pensionState: PensionWithdrawalState | null  // Per-projection pension state
}

// Wrapper for accounts that may have a start period offset
export interface AccountWrapper {
  account: BalanceAccount
  startPeriod: number  // Period when this account becomes active (0 for baseline)
  isISA?: boolean  // Whether this account is ISA-wrapped (tax-exempt on gains)
  savingsGoalTarget?: number  // Target amount for savings goals (if applicable)
  savingsGoalPriority?: number  // Priority for allocation (1 = highest, filled first)
  savingsGoalType?: string  // Type identifier for the savings goal
}

export interface AccountRegistry {
  [AssetClass.CURRENT_ACCOUNT]?: AccountWrapper[]
  [AssetClass.HYSA]?: AccountWrapper[]
  [AssetClass.GENERAL_INVESTMENT]?: AccountWrapper[]
  [AssetClass.EQUITIES]?: AccountWrapper[]
  [AssetClass.PENSION]?: AccountWrapper[]
  [AssetClass.BUSINESS_EQUITY]?: AccountWrapper[]
  [AssetClass.OTHER_ASSETS]?: AccountWrapper[]
  [AssetClass.DEFAULT_SAVINGS]?: AccountWrapper[]
}

export interface AllocationResult {
  allocations: Record<AssetClass, number>
  liquidations: Record<AssetClass, number>
  liquidationAccounts?: Record<string, number>  // Withdrawals by account name (parallel to liquidations by asset class)
  deficit: number  // Unmet cash flow need (if liquidations insufficient)
  cgtPaid?: number  // Total capital gains tax paid this period
  surplusCash?: number  // Surplus cash available for allocation (after automated allocations & savings goals)
}

// UK ISA contribution limits (2024/25)
const UK_ISA_ANNUAL_LIMIT = 20000  // £20,000 per tax year

export class CashFlowAllocator {
  private config: AllocationConfig
  private monthlyExpenses: number
  private annualCGTExemptionUsed: number  // Track CGT exemption usage per tax year
  private currentTaxYear: number  // Track current tax year for CGT exemption reset
  private isaYearToDateContributions: number  // Track ISA contributions per tax year
  private isaCurrentTaxYear: number  // Track current tax year for ISA limit reset
  private savingsGoalCumulativeBalances: Map<string, number>  // Track cumulative allocations per savings goal account

  constructor(config: AllocationConfig, monthlyExpenses: number) {
    this.config = config
    this.monthlyExpenses = monthlyExpenses
    this.annualCGTExemptionUsed = 0
    this.currentTaxYear = new Date().getFullYear()  // UK tax year (April-April), simplified to calendar year
    this.isaYearToDateContributions = 0
    this.isaCurrentTaxYear = new Date().getFullYear()
    this.savingsGoalCumulativeBalances = new Map()  // Initialize empty map for tracking savings goal balances
  }

  /**
   * Allocate positive or liquidate negative cash flow
   * @param netCashFlow - Monthly net cash available for automated allocations (after scheduled contributions)
   * @param accounts - Registry of accounts by asset class
   * @param period - Current period number (for account balance lookups)
   * @param isaTracker - Shared ISA tracker object (mutated to coordinate scheduled + automated contributions)
   * @param retirementContext - Retirement status and age for pension withdrawal logic
   * @returns Allocation/liquidation amounts by asset class
   */
  allocateCashFlow(
    netCashFlow: number,
    accounts: AccountRegistry,
    period: number,
    isaTracker: { taxYear: number; ytd: number } | null = null,
    retirementContext?: RetirementContext
  ): AllocationResult {
    // Reset CGT exemption at start of new tax year (UK: April 6 - April 5)
    // Simplified: reset every 12 periods (1 year)
    const taxYear = Math.floor(period / 12)
    if (taxYear !== this.currentTaxYear) {
      this.currentTaxYear = taxYear
      this.annualCGTExemptionUsed = 0
    }

    // Use shared ISA tracker if provided, otherwise fallback to internal tracker (backward compatibility)
    // Shared tracker coordinates scheduled + automated contributions to enforce unified £20k limit
    if (isaTracker) {
      // Tax year reset is already handled by simulator's capScheduledISAContribution
      // Just use the shared tracker's current YTD (includes any scheduled contributions this period)
      this.isaCurrentTaxYear = isaTracker.taxYear
      this.isaYearToDateContributions = isaTracker.ytd
    } else {
      // Fallback to internal tracker for backward compatibility (no scheduled ISA contributions)
      const currentMonth = period % 12
      const simulationYear = Math.floor(period / 12)
      const isaTaxYear = currentMonth >= 3 ? simulationYear : simulationYear - 1

      if (isaTaxYear !== this.isaCurrentTaxYear) {
        this.isaCurrentTaxYear = isaTaxYear
        this.isaYearToDateContributions = 0
      }
    }

    const allocations = this.createZeroRecord()
    const liquidations = this.createZeroRecord()
    const liquidationAccounts: Record<string, number> = {}  // Track withdrawals by account name
    let surplusCash = 0

    if (netCashFlow > 0) {
      // Positive cash flow: allocate to automated savings/investments
      const isRetired = retirementContext?.isRetired || false
      surplusCash = this.allocatePositiveCashFlow(netCashFlow, accounts, period, allocations, isRetired, isaTracker)
    } else if (netCashFlow < 0) {
      // Negative cash flow: liquidate from accounts in priority order
      const result = this.liquidateNegativeCashFlow(
        Math.abs(netCashFlow),
        accounts,
        period,
        liquidations,
        liquidationAccounts,
        retirementContext
      )
      return { allocations, liquidations, liquidationAccounts, deficit: result.deficit, cgtPaid: result.cgtPaid, surplusCash: 0 }
    }

    return { allocations, liquidations, deficit: 0, cgtPaid: 0, surplusCash }
  }

  /**
   * Allocate positive cash flow:
   * 1. Apply automated allocation percentages (user-defined), excluding pension contributions after retirement
   * 2. Top up emergency buffer to target
   * 2.5. Top up savings goals by priority until targets reached
   * 3. Calculate explicit Surplus Cash (remainder after steps 1-2)
   * 4. Allocate Surplus Cash to default savings
   * 5. Enforce UK ISA £20k annual contribution limit and route overflow
   */
  private allocatePositiveCashFlow(
    amount: number,
    accounts: AccountRegistry,
    period: number,
    allocations: Record<AssetClass, number>,
    isRetired: boolean = false,
    isaTracker: { taxYear: number; ytd: number } | null = null
  ): number {  // Return surplus cash amount
    let remaining = amount

    // Step 1: Apply automated allocation percentages
    const automatedPercentages = this.config.automatedAllocationPercentages
    for (const [assetClass, percentage] of Object.entries(automatedPercentages)) {
      if (percentage && percentage > 0) {
        // Stop pension contributions at retirement
        if (assetClass === AssetClass.PENSION && isRetired) {
          continue  // Skip pension allocations after retirement
        }
        // Skip HYSA in automated percentages - HYSA savings goals should be filled via Step 2 priority system
        if (assetClass === AssetClass.HYSA) {
          continue  // HYSA savings goals are managed explicitly in Step 2 with target tracking
        }

        const allocation = amount * (percentage / 100)
        allocations[assetClass as AssetClass] = allocation
        remaining -= allocation
      }
    }

    // Step 2: Top up HYSA savings goals by priority until targets reached
    // (Emergency fund, education fund, house deposit, etc. - unified priority system)
    const savingsGoalAccounts = accounts[AssetClass.HYSA]
    if (savingsGoalAccounts && savingsGoalAccounts.length > 0 && remaining > 0) {
      // Sort by priority (lower number = higher priority), then by start period
      const sortedGoals = [...savingsGoalAccounts]
        .filter(w => w.startPeriod <= period)  // Only active goals
        .sort((a, b) => {
          const priorityA = a.savingsGoalPriority || 999
          const priorityB = b.savingsGoalPriority || 999
          if (priorityA !== priorityB) return priorityA - priorityB
          return (a.startPeriod || 0) - (b.startPeriod || 0)
        })

      for (const wrapper of sortedGoals) {
        if (remaining <= 0) break

        const target = wrapper.savingsGoalTarget || 0
        const accountId = wrapper.account.getName()  // Use account name as unique identifier

        // Initialize cumulative balance if this is the first time we see this account
        if (!this.savingsGoalCumulativeBalances.has(accountId)) {
          // Adjust period for goal accounts (baseline accounts have startPeriod = 0)
          const adjustedPeriod = period - wrapper.startPeriod
          const initialBalance = wrapper.account.valueAtPeriod(adjustedPeriod)
          this.savingsGoalCumulativeBalances.set(accountId, initialBalance)
        }

        // Get current cumulative balance (includes all prior allocations)
        const currentBalance = this.savingsGoalCumulativeBalances.get(accountId) || 0
        const shortfall = Math.max(0, target - currentBalance)

        if (shortfall > 0) {
          const toGoal = Math.min(remaining, shortfall)
          allocations[AssetClass.HYSA] += toGoal
          remaining -= toGoal

          // Update cumulative balance to reflect this allocation
          this.savingsGoalCumulativeBalances.set(accountId, currentBalance + toGoal)
        }
      }
    }

    // Step 3: Calculate explicit Surplus Cash (after automated allocations & savings goals)
    const surplusCash = remaining

    // Step 4: Route surplus cash to user-configured account (if set)
    // This allows "Set Up Regular Contributions" to direct surplus to Pension, ISA, GIA, or HYSA
    if (surplusCash > 0 && this.config.surplusAllocation) {
      const targetAssetClass = this.config.surplusAllocation.assetClass

      // Apply same constraints as automated allocations
      // Skip pension contributions after retirement
      if (targetAssetClass === AssetClass.PENSION && isRetired) {
        // Pension contributions stop at retirement - route to DEFAULT_SAVINGS instead
        allocations[AssetClass.DEFAULT_SAVINGS] = (allocations[AssetClass.DEFAULT_SAVINGS] || 0) + surplusCash
        remaining = 0  // Surplus fully allocated (to fallback account)
      } else {
        // Initialize allocation if not present, then add surplus
        allocations[targetAssetClass] = (allocations[targetAssetClass] || 0) + surplusCash
        remaining = 0  // Surplus fully allocated
      }
    }

    // Step 5: Fallback - Allocate any remaining surplus to default savings
    // (Only reached if surplusAllocation not configured, or pension allocation skipped in retirement)
    if (remaining > 0) {
      allocations[AssetClass.DEFAULT_SAVINGS] += remaining
    }

    // Step 6: Enforce UK ISA £20k annual contribution limit
    // If surplus was routed to ISA and exceeds limit, overflow goes to DEFAULT_SAVINGS
    this.enforceISALimit(allocations, accounts, period, isRetired, isaTracker)

    return surplusCash  // Return the surplus cash amount
  }

  /**
   * Enforce UK ISA £20k annual contribution limit and route overflow to non-ISA accounts
   * Checks all ISA-wrapped accounts and ensures total contributions don't exceed limit
   * @param isaTracker - Optional shared ISA tracker to update (coordinates with scheduled contributions)
   */
  private enforceISALimit(
    allocations: Record<AssetClass, number>,
    accounts: AccountRegistry,
    period: number,
    isRetired: boolean = false,
    isaTracker: { taxYear: number; ytd: number } | null = null
  ): void {
    // Identify which asset classes have ISA-wrapped accounts
    const isaAssetClasses: AssetClass[] = []
    for (const [assetClass, wrappers] of Object.entries(accounts)) {
      if (wrappers && wrappers.some((w: AccountWrapper) => w.isISA === true)) {
        isaAssetClasses.push(assetClass as AssetClass)
      }
    }

    if (isaAssetClasses.length === 0) {
      return  // No ISA accounts, nothing to enforce
    }

    // Calculate total ISA contributions this period
    let totalISAContribution = 0
    for (const assetClass of isaAssetClasses) {
      totalISAContribution += allocations[assetClass] || 0
    }

    // Check if adding this period's contributions would exceed the annual limit
    // CRITICAL: Use shared tracker to account for scheduled ISA contributions that already happened this period
    const currentYTD = isaTracker?.ytd || this.isaYearToDateContributions
    const remainingAllowance = UK_ISA_ANNUAL_LIMIT - currentYTD

    if (totalISAContribution > remainingAllowance) {
      // Need to cap ISA contributions and route overflow
      const overflow = totalISAContribution - remainingAllowance

      console.log(`🚨 ISA overflow detected (Period ${period}): £${overflow.toFixed(2)} exceeds annual limit (used: £${this.isaYearToDateContributions.toFixed(2)} / £${UK_ISA_ANNUAL_LIMIT})`)

      // Reduce ISA contributions proportionally across all ISA asset classes
      console.log(`   DEBUG: isaAssetClasses = [${isaAssetClasses.join(', ')}], overflow = £${overflow.toFixed(2)}`)
      for (const assetClass of isaAssetClasses) {
        const currentAllocation = allocations[assetClass] || 0
        console.log(`   DEBUG: ${assetClass} currentAllocation = £${currentAllocation.toFixed(2)}, totalISAContribution = £${totalISAContribution.toFixed(2)}`)
        if (currentAllocation > 0 && totalISAContribution > 0) {
          const proportion = currentAllocation / totalISAContribution
          const reduction = overflow * proportion
          const newAllocation = currentAllocation - reduction
          console.log(`   Reducing ${assetClass} allocation: £${currentAllocation.toFixed(2)} → £${newAllocation.toFixed(2)} (reduction: £${reduction.toFixed(2)})`)
          allocations[assetClass] = newAllocation
        } else {
          console.log(`   DEBUG: Skipping reduction for ${assetClass} (condition failed)`)
        }
      }

      // Route overflow to non-ISA accounts
      // If user has explicitly set defaultSavings to 0%, find an alternative asset class
      // Otherwise route to DEFAULT_SAVINGS (preserves backward compatibility)
      const defaultSavingsPercentage = this.config.automatedAllocationPercentages[AssetClass.DEFAULT_SAVINGS]
      const hasExplicitZeroDefault = defaultSavingsPercentage !== undefined && defaultSavingsPercentage === 0

      if (hasExplicitZeroDefault) {
        // User wants 0% to default savings, find first non-ISA asset class with positive allocation
        // Exclude PENSION if retired (pension contributions stop at retirement)
        const alternativeAssetClasses = [
          AssetClass.GENERAL_INVESTMENT,  // Prefer GIA (taxable but still grows)
          AssetClass.HYSA,                // Then HYSA (liquid, interest-bearing)
          ...(isRetired ? [] : [AssetClass.PENSION])  // Only include pension if NOT retired
        ]

        let overflowTarget: AssetClass | null = null
        for (const assetClass of alternativeAssetClasses) {
          const percentage = this.config.automatedAllocationPercentages[assetClass] || 0
          if (percentage > 0) {
            overflowTarget = assetClass
            break
          }
        }

        // Fallback to GENERAL_INVESTMENT even if allocation is 0% (better than cash at 0%)
        if (!overflowTarget) {
          overflowTarget = AssetClass.GENERAL_INVESTMENT
        }

        console.log(`✅ Routing ISA overflow (£${overflow.toFixed(2)}) to ${overflowTarget} (user set defaultSavings=0${isRetired ? ', retired' : ''})`)
        allocations[overflowTarget] = (allocations[overflowTarget] || 0) + overflow
      } else {
        // Default behavior: route to DEFAULT_SAVINGS
        console.log(`ℹ️  Routing ISA overflow (£${overflow.toFixed(2)}) to DEFAULT_SAVINGS (default behavior)`)
        allocations[AssetClass.DEFAULT_SAVINGS] = (allocations[AssetClass.DEFAULT_SAVINGS] || 0) + overflow
      }

      // Update ISA contribution tracking (capped at limit)
      // Add the capped allocation (not full requested amount) to tracker
      const cappedAllocation = remainingAllowance  // We allocated up to remaining allowance
      this.isaYearToDateContributions += cappedAllocation
      if (isaTracker) {
        isaTracker.ytd += cappedAllocation  // ADD to shared tracker (don't overwrite scheduled contributions!)
      }
    } else {
      // Under limit, increment the contribution tracking
      this.isaYearToDateContributions += totalISAContribution
      if (isaTracker) {
        isaTracker.ytd += totalISAContribution  // ADD to shared tracker (don't overwrite scheduled contributions!)
      }
    }
  }

  /**
   * Liquidate to cover negative cash flow in priority order:
   * 
   * RETIREMENT MODE (if isRetired = true):
   * 1. Pension (withdrawals up to UK allowance limits, tax-aware)
   * 2. Fall back to normal order if pension capacity exhausted
   * 
   * PRE-RETIREMENT MODE (default):
   * 1. Current account (0% interest, most liquid)
   * 2. Default savings (ordinary savings account, 0-1% interest)
   * 3. Emergency buffer (HYSA - preserve for emergencies)
   * 4. Automated savings
   * 5. Equities (with CGT applied for non-ISA accounts)
   * 6. Pension (last resort for liquid assets)
   * 7. Other assets (illiquid - house, car, etc., with CGT for non-ISA)
   * 
   * Capital Gains Tax (CGT):
   * - ISA accounts: Tax-exempt on gains
   * - Non-ISA investments: 20% CGT on estimated gains (assuming 50% gain ratio)
   * - Cash accounts: No CGT (no gains on cash)
   * 
   * @returns Object with unmet deficit and total CGT paid
   */
  private liquidateNegativeCashFlow(
    needed: number,
    accounts: AccountRegistry,
    period: number,
    liquidations: Record<AssetClass, number>,
    liquidationAccounts: Record<string, number>,
    retirementContext?: RetirementContext
  ): { deficit: number; cgtPaid: number } {
    let remaining = needed
    let totalCGT = 0

    // RETIREMENT LOGIC: Prioritize pension withdrawals
    if (retirementContext?.isRetired && retirementContext.pensionState) {
      const pensionAccounts = accounts[AssetClass.PENSION]

      if (pensionAccounts && pensionAccounts.length > 0) {
        const pensionBalance = this.getTotalBalance(pensionAccounts, period)

        if (pensionBalance > 0) {
          const capacity = calculateWithdrawalCapacity(
            retirementContext.currentAge,
            pensionBalance,
            retirementContext.pensionState
          )

          if (!capacity.ageRestricted && capacity.totalAvailable > 0) {
            // Execute pension withdrawal with UK tax rules
            const withdrawal = executePensionWithdrawal(
              remaining,  // Net deficit to cover
              capacity,
              retirementContext.pensionState,
              retirementContext.monthlyIncome,
              period  // For tax year tracking
            )

            // Record withdrawal amounts
            if (withdrawal.netAmount > 0) {
              // Gross withdrawal amount (pre-tax) for liquidation tracking
              const grossWithdrawal = withdrawal.taxFreeAmount + withdrawal.taxableAmount
              liquidations[AssetClass.PENSION] = grossWithdrawal

              // NEW: Track pension withdrawals by account name
              // Distribute withdrawal proportionally across all pension accounts based on their balances
              for (const wrapper of pensionAccounts) {
                if (period < wrapper.startPeriod) continue
                const adjustedPeriod = period - wrapper.startPeriod
                const accountBalance = wrapper.account.valueAtPeriod(adjustedPeriod)
                if (accountBalance > 0) {
                  const accountName = wrapper.account.getName()
                  const proportionalWithdrawal = grossWithdrawal * (accountBalance / pensionBalance)
                  liquidationAccounts[accountName] = (liquidationAccounts[accountName] || 0) + proportionalWithdrawal
                }
              }

              // Reduce remaining deficit by net amount received
              // Tax is treated as an implicit expense (withdrawn from pension but not received)
              remaining -= withdrawal.netAmount

              // IMPORTANT: Update pension state in the context (caller must capture this)
              retirementContext.pensionState = withdrawal.state
            }
          }
        }
      }
    }

    // If still need funds (pension insufficient or not retired), use standard order
    if (remaining > 0) {
      // Priority order for liquidation (spend cash before investments)
      const liquidationOrder: AssetClass[] = [
        AssetClass.CURRENT_ACCOUNT,
        AssetClass.DEFAULT_SAVINGS,        // Ordinary savings - use before investments
        AssetClass.HYSA,                   // HYSA savings goals (emergency, education, house deposit) - reverse priority order
        AssetClass.GENERAL_INVESTMENT,
        AssetClass.EQUITIES,
        AssetClass.PENSION,                // Only reached if not retired or pension exhausted
        AssetClass.BUSINESS_EQUITY,        // Business equity - typically liquidated via sale
        AssetClass.OTHER_ASSETS            // Illiquid assets last
      ]

      for (const assetClass of liquidationOrder) {
        if (remaining <= 0) break

        // Skip pension if already withdrawn in retirement mode
        if (assetClass === AssetClass.PENSION && retirementContext?.isRetired && liquidations[AssetClass.PENSION] > 0) {
          continue
        }

        const accountWrappers = accounts[assetClass]
        if (!accountWrappers || accountWrappers.length === 0) continue

        const available = this.getTotalBalance(accountWrappers, period)

        // Allow overdraft for CASH accounts to track shortfalls (Current Account, Default Savings)
        // For Investments/Pension, we can only liquidate what we have exists
        const canOverdraft = assetClass === AssetClass.CURRENT_ACCOUNT || assetClass === AssetClass.DEFAULT_SAVINGS

        if (available <= 0 && !canOverdraft) continue

        // Calculate CGT for investment assets (Equities and Other Assets)
        // Cash accounts (Current, Savings, Emergency) are not subject to CGT
        const isCGTSubject = assetClass === AssetClass.EQUITIES || assetClass === AssetClass.OTHER_ASSETS

        let actualLiquidated = 0
        let cgtForThisWithdrawal = 0

        if (isCGTSubject) {
          // ... (CGT logic remains same, handles positive available only)
          // Calculate proportion that is ISA-wrapped (tax-exempt)
          const isaBalance = accountWrappers
            .filter(w => w.isISA === true)
            .reduce((sum, wrapper) => {
              if (period < wrapper.startPeriod) return sum
              const adjustedPeriod = period - wrapper.startPeriod
              return sum + Math.max(0, wrapper.account.valueAtPeriod(adjustedPeriod))
            }, 0)

          const taxableBalance = Math.max(0, available - isaBalance)
          const taxableRatio = available > 0 ? taxableBalance / available : 0

          // We need to solve: netReceived = actualLiquidated - CGT = remaining
          // where CGT = (actualLiquidated * taxableRatio * 0.5 - exemption) * 0.2
          // This requires iteration or solving algebraically

          // Simplified approach: Estimate gross needed, then calculate actual CGT
          // grossNeeded ≈ netNeeded / (1 - taxableRatio * 0.5 * 0.2)  [if no exemption]
          const netNeeded = remaining
          const estimatedTaxRate = taxableRatio * 0.5 * (UK_CGT_RULES.HIGHER_RATE / 100)
          const grossEstimate = netNeeded / (1 - estimatedTaxRate)

          actualLiquidated = Math.min(grossEstimate, available)

          // Now calculate actual CGT on what we're liquidating
          const taxableLiquidation = actualLiquidated * taxableRatio
          const gain = taxableLiquidation * 0.5

          const exemptionRemaining = Math.max(0, UK_CGT_RULES.ANNUAL_EXEMPTION - this.annualCGTExemptionUsed)
          const exemptionUsed = Math.min(gain, exemptionRemaining)
          const taxableGain = Math.max(0, gain - exemptionUsed)

          cgtForThisWithdrawal = taxableGain * (UK_CGT_RULES.HIGHER_RATE / 100)

          // Track exemption usage and total CGT
          this.annualCGTExemptionUsed += exemptionUsed
          totalCGT += cgtForThisWithdrawal
        } else {
          // No CGT
          if (canOverdraft) {
            // Take full remaining amount, potentially going into overdraft
            // If available > 0, we take min(remaining, available) usually?
            // No, if we can overdraft, we just take 'remaining'.
            // BUT normally we want to prioritize other accounts?
            // Actually, this method iterates in priority order.
            // If we are at Current/Default Savings (top priority), we should take meaningful amounts.

            // If we take 'remaining', we clear the deficit immediately.
            actualLiquidated = remaining
          } else {
            // Standard asset: take what we can
            actualLiquidated = Math.min(remaining, available)
          }
        }

        liquidations[assetClass] += actualLiquidated

        // NEW: Track liquidations by account name (parallel to asset class tracking)
        // Distribute liquidation proportionally across all accounts in this asset class
        for (const wrapper of accountWrappers) {
          // Skip accounts that haven't started yet
          if (period < wrapper.startPeriod) continue

          const adjustedPeriod = period - wrapper.startPeriod
          const accountBalance = wrapper.account.valueAtPeriod(adjustedPeriod)
          if (accountBalance > 0) {
            const accountName = wrapper.account.getName()
            const accountShare = available > 0 ? accountBalance / available : 0
            const accountLiquidation = actualLiquidated * accountShare
            liquidationAccounts[accountName] = (liquidationAccounts[accountName] || 0) + accountLiquidation
          }
        }

        // For savings goals, update cumulative balances to reflect the liquidation
        if (assetClass === AssetClass.HYSA) {
          for (const wrapper of accountWrappers) {
            // Skip accounts that haven't started yet
            if (period < wrapper.startPeriod) continue

            const accountId = wrapper.account.getName()
            if (this.savingsGoalCumulativeBalances.has(accountId)) {
              const currentBalance = this.savingsGoalCumulativeBalances.get(accountId) || 0
              // Proportional liquidation based on account's share of total available balance
              const adjustedPeriod = period - wrapper.startPeriod
              const accountBalance = wrapper.account.valueAtPeriod(adjustedPeriod)
              const accountShare = available > 0 ? accountBalance / available : 0
              const accountLiquidation = actualLiquidated * accountShare
              const newBalance = Math.max(0, currentBalance - accountLiquidation)
              this.savingsGoalCumulativeBalances.set(accountId, newBalance)
            }
          }
        }

        // Net received is gross liquidated minus CGT paid
        const netReceived = actualLiquidated - cgtForThisWithdrawal
        remaining -= netReceived
      }
    }

    return { deficit: remaining, cgtPaid: totalCGT }  // Unmet deficit and total CGT paid
  }

  /**
   * Get total balance across all accounts in an asset class
   * Goal accounts use their own timeline starting from period 0 at activation,
   * so we adjust the period index for goal accounts (period - startPeriod)
   */
  private getTotalBalance(accountWrappers: AccountWrapper[], period: number): number {
    return accountWrappers.reduce((total, wrapper) => {
      // Only include accounts that have started
      if (period < wrapper.startPeriod) return total

      // Adjust period for goal accounts (baseline accounts have startPeriod = 0)
      const adjustedPeriod = period - wrapper.startPeriod
      const value = wrapper.account.valueAtPeriod(adjustedPeriod)

      return total + Math.max(0, value)
    }, 0)
  }

  private createZeroRecord(): Record<AssetClass, number> {
    return {
      [AssetClass.CURRENT_ACCOUNT]: 0,
      [AssetClass.HYSA]: 0,
      [AssetClass.GENERAL_INVESTMENT]: 0,
      [AssetClass.EQUITIES]: 0,
      [AssetClass.PENSION]: 0,
      [AssetClass.BUSINESS_EQUITY]: 0,
      [AssetClass.OTHER_ASSETS]: 0,
      [AssetClass.DEFAULT_SAVINGS]: 0
    }
  }
}
