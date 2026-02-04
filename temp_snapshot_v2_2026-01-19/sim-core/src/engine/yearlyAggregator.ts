import { ProjectionPoint, AssetClass } from './scenarioSimulator'

/**
 * Aggregates monthly projection data into yearly buckets for chart rendering.
 * Keeps monthly calculations intact while dynamically reducing monthly render points to yearly totals.
 */
export function aggregateToYearly(monthlyData: ProjectionPoint[]): ProjectionPoint[] {
  if (monthlyData.length === 0) return []

  const yearlyData: ProjectionPoint[] = []
  const totalYears = Math.ceil(monthlyData.length / 12) // Calculate years from data length
  
  // Group by year (12 months per year)
  for (let year = 0; year < totalYears; year++) {
    const startMonth = year * 12
    const endMonth = Math.min(startMonth + 12, monthlyData.length)
    
    if (startMonth >= monthlyData.length) break
    
    // Use December data point (end of year) for balances
    const decemberIndex = Math.min(endMonth - 1, monthlyData.length - 1)
    const decemberPoint = monthlyData[decemberIndex]
    
    // Sum cash flows and aggregate fields for the entire year
    let yearCashFlow = 0
    let yearIncome = 0
    let yearExpenses = 0
    let yearBaselineIncome = 0
    let yearBaselineExpenses = 0
    let yearGoalIncome = 0
    let yearGoalExpenses = 0
    let yearAccountContributions = 0
    let yearIncomeTax = 0
    let yearNationalInsurance = 0
    let yearStatePensionIncome = 0
    let yearPrivatePensionIncome = 0
    
    for (let month = startMonth; month < endMonth; month++) {
      const point = monthlyData[month]
      yearCashFlow += point.cashFlow
      yearIncome += point.breakdown.income
      yearExpenses += point.breakdown.expenses
      yearBaselineIncome += point.breakdown.baselineIncome
      yearBaselineExpenses += point.breakdown.baselineExpenses
      yearGoalIncome += point.breakdown.goalIncome
      yearGoalExpenses += point.breakdown.goalExpenses
      yearAccountContributions += point.breakdown.accountContributions
      yearIncomeTax += point.breakdown.incomeTax || 0
      yearNationalInsurance += point.breakdown.nationalInsurance || 0
      yearStatePensionIncome += point.breakdown.statePensionIncome || 0
      yearPrivatePensionIncome += point.breakdown.privatePensionIncome || 0
    }
    
    // Aggregate asset allocations, scenario breakdowns, scheduled contributions, and scenario impacts for the year
    const yearAllocations: Record<AssetClass, number> = {} as Record<AssetClass, number>
    const yearLiquidations: Record<AssetClass, number> = {} as Record<AssetClass, number>
    const yearLiquidationAccounts: Record<string, number> = {}  // NEW: Track withdrawals by account name
    const yearScheduledContributions: Record<string, number> = {}
    const yearGoalBreakdowns = new Map<string, { name: string; scenarioId: string; cashFlowImpact: number; netWorthImpact: number }>()
    const yearGoalImpacts: Record<string, number> = {}
    
    for (let month = startMonth; month < endMonth; month++) {
      const point = monthlyData[month]
      
      if (point.breakdown.cashFlowAllocations) {
        Object.entries(point.breakdown.cashFlowAllocations).forEach(([assetClass, amount]) => {
          const key = assetClass as AssetClass
          yearAllocations[key] = (yearAllocations[key] || 0) + amount
        })
      }
      
      if (point.breakdown.cashFlowLiquidations) {
        Object.entries(point.breakdown.cashFlowLiquidations).forEach(([assetClass, amount]) => {
          const key = assetClass as AssetClass
          yearLiquidations[key] = (yearLiquidations[key] || 0) + amount
        })
      }
      
      if (point.breakdown.liquidationAccounts) {
        Object.entries(point.breakdown.liquidationAccounts).forEach(([accountName, amount]) => {
          yearLiquidationAccounts[accountName] = (yearLiquidationAccounts[accountName] || 0) + amount
        })
      }
      
      if (point.breakdown.scheduledContributions) {
        Object.entries(point.breakdown.scheduledContributions).forEach(([accountName, amount]) => {
          yearScheduledContributions[accountName] = (yearScheduledContributions[accountName] || 0) + amount
        })
      }
      
      // Aggregate goal impacts across all months in the year (with null guard)
      // Group setup costs with their parent scenario by stripping -setup suffix
      const impacts = point.breakdown.goalImpacts ?? {}
      Object.entries(impacts).forEach(([goalId, impact]) => {
        // If this is a setup cost (ends with -setup), merge it with the parent scenario
        const parentGoalId = goalId.endsWith('-setup') ? goalId.replace('-setup', '') : goalId
        yearGoalImpacts[parentGoalId] = (yearGoalImpacts[parentGoalId] || 0) + impact
      })
      
      // Aggregate scenario breakdowns across all months in the year
      // Group by scenarioId (for multi-component scenarios) or name (for single-component)
      // NOTE: cashFlowImpact is summed (flows), netWorthImpact uses latest value (balances)
      point.breakdown.goalBreakdowns?.forEach(breakdown => {
        const scenarioId = breakdown.scenarioId || breakdown.name
        const existing = yearGoalBreakdowns.get(scenarioId)
        if (existing) {
          existing.cashFlowImpact += breakdown.cashFlowImpact
          // Net worth is a balance, not a flow - use latest (December) value, not sum
          existing.netWorthImpact = breakdown.netWorthImpact
        } else {
          yearGoalBreakdowns.set(scenarioId, {
            name: scenarioId,  // Use scenarioId as display name for grouping
            scenarioId: breakdown.scenarioId,
            cashFlowImpact: breakdown.cashFlowImpact,
            netWorthImpact: breakdown.netWorthImpact
          })
        }
      })
    }
    
    // Calculate year-over-year growth if previous year data exists
    const previousYear = yearlyData[year - 1]
    const baselineNetCashFlow = yearIncome - yearExpenses - yearGoalIncome + yearGoalExpenses
    const scenarioNetCashFlow = yearCashFlow
    
    // Create yearly projection point
    yearlyData.push({
      period: year, // Year index (0-69) instead of month index (0-839)
      netWorth: decemberPoint.netWorth, // Use December balance
      cashFlow: yearCashFlow, // Sum of year's net cash flows (netIncome - expenses)
      breakdown: {
        income: yearIncome,
        expenses: yearExpenses,
        baselineIncome: yearBaselineIncome,
        baselineExpenses: yearBaselineExpenses,
        goalIncome: yearGoalIncome,  // DEPRECATED
        scenarioIncome: yearGoalIncome,  // Income from all scenarios
        scenarioExpenses: yearGoalExpenses,  // Expenses from all scenarios
        scenarioNetCashFlow: yearGoalIncome - yearGoalExpenses,  // Net cash flow impact from scenarios
        goalExpenses: yearGoalExpenses,
        assetValue: decemberPoint.breakdown.assetValue,
        debtValue: decemberPoint.breakdown.debtValue,
        assetCategories: decemberPoint.breakdown.assetCategories,
        debtCategories: decemberPoint.breakdown.debtCategories,
        incomeTax: yearIncomeTax,
        nationalInsurance: yearNationalInsurance,
        statePensionIncome: yearStatePensionIncome,
        privatePensionIncome: yearPrivatePensionIncome,
        goalBreakdowns: Array.from(yearGoalBreakdowns.values()),
        accountContributions: yearAccountContributions,
        goalImpacts: yearGoalImpacts,
        cashFlowAllocations: Object.keys(yearAllocations).length > 0 ? yearAllocations : undefined,
        cashFlowLiquidations: Object.keys(yearLiquidations).length > 0 ? yearLiquidations : undefined,
        liquidationAccounts: Object.keys(yearLiquidationAccounts).length > 0 ? yearLiquidationAccounts : undefined,
        scheduledContributions: Object.keys(yearScheduledContributions).length > 0 ? yearScheduledContributions : undefined
      }
    })
  }
  
  return yearlyData
}
