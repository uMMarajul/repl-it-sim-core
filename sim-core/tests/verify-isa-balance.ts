import { ScenarioSimulator, AssetClass } from '../src/engine/scenarioSimulator'
import { BalanceAccount } from '../src/engine/balanceAccount'

const baselineAccounts = [
  new BalanceAccount({
    name: 'Private ISA',
    startingBalance: 0,
    contribution: 1000,  // £1,000/month scheduled
    performance: 7,
    frequency: 'monthly',
    isDebt: false
  }),
  new BalanceAccount({
    name: 'Current Account',
    startingBalance: 10000,
    contribution: 0,
    performance: 0,
    frequency: 'monthly',
    isDebt: false
  })
]

const simulator = new ScenarioSimulator({
  baseline: {
    accounts: baselineAccounts,
    monthlyIncome: 5000,
    monthlyExpenses: 1500,
    currentAge: 30,
    retirementAge: 65,
    statePensionMonthly: 11500 / 12,
    allocationConfig: {
      automatedAllocationPercentages: {
        [AssetClass.EQUITIES]: 75,
        [AssetClass.PENSION]: 0
      }
    }
  },
  modifiers: []
})

const projection = simulator.generateScenarioProjection()

// Calculate ACTUAL contributions by comparing period-to-period balances
console.log('\n=== COMPLIANCE VERIFICATION (Balance Growth Method) ===\n')

for (let year = 1; year <= 3; year++) {
  const startPeriod = (year - 1) * 12
  const endPeriod = year * 12 - 1
  
  const startBalance = startPeriod === 0 ? 0 : projection[startPeriod - 1].breakdown.assetCategories.find(a => a.name.includes('ISA'))?.value || 0
  const endBalance = projection[endPeriod].breakdown.assetCategories.find(a => a.name.includes('ISA'))?.value || 0
  
  // Calculate growth at 7% annual (compounded monthly)
  const monthlyRate = Math.pow(1.07, 1/12) - 1
  
  // Work backwards: if we contributed C each month with monthly compounding, what's the final balance?
  // Using future value of annuity formula: FV = C * ((1+r)^n - 1) / r + PV * (1+r)^n
  // We can estimate contributions by removing growth
  let estimatedContributions = 0
  let runningBalance = startBalance
  
  for (let month = 0; month < 12; month++) {
    const periodBalance = projection[startPeriod + month].breakdown.assetCategories.find(a => a.name.includes('ISA'))?.value || 0
    const growth = runningBalance * monthlyRate
    const contribution = periodBalance - runningBalance - growth
    estimatedContributions += contribution
    runningBalance = periodBalance
  }
  
  console.log(`Year ${year}: Balance £${startBalance.toFixed(2)} → £${endBalance.toFixed(2)}`)
  console.log(`  Estimated contributions: £${estimatedContributions.toFixed(2)} (limit: £20,000)`)
  console.log(`  Compliance: ${estimatedContributions <= 20100 ? '✅ PASS' : '❌ FAIL'}`)  // Allow £100 rounding tolerance
  console.log('')
}
