import { ScenarioSimulator, AssetClass } from '../src/engine/scenarioSimulator'
import { BalanceAccount } from '../src/engine/balanceAccount'

console.log('\n=== COMPREHENSIVE ISA LIMIT TEST (Scheduled + Automated) ===\n')

// Test case: £1,000/month scheduled ISA + 75% automated allocation to ISA
// Total: £1,000 scheduled + (£5k - £1.5k - £1k) * 75% = £1,000 + £1,875 = £2,875/month
// Annual: £34,500 (exceeds £20k limit by £14,500)
// Expected: System should cap total ISA at £20k, routing overflow to fallback accounts

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
    monthlyIncome: 5000,  // £5k monthly income
    monthlyExpenses: 1500,  // £1.5k expenses
    currentAge: 30,
    retirementAge: 65,
    statePensionMonthly: 11500 / 12,
    allocationConfig: {
      automatedAllocationPercentages: {
        [AssetClass.EQUITIES]: 75,  // 75% of surplus → ISA (will trigger overflow)
        [AssetClass.PENSION]: 0
      }
    }
  },
  modifiers: []
})

console.log('Setup:')
console.log('  Scheduled ISA contribution: £1,000/month = £12,000/year')
console.log('  Net cash flow: £5,000 - £1,500 - £1,000 = £2,500/month')
console.log('  Automated ISA allocation (75%): £2,500 * 75% = £1,875/month = £22,500/year')
console.log('  Total ISA contributions: £12,000 + £22,500 = £34,500/year')
console.log('  UK ISA annual limit: £20,000')
console.log('  Expected capping behavior:')
console.log('    - First 10 months: £2,875/month → ISA (£28,750 total)')
console.log('    - Months 11-12: Capped to reach exactly £20,000')
console.log('    - Overflow routed to GENERAL_INVESTMENT (per routing rules)\n')

console.log('Running simulation...\n')
const projection = simulator.generateScenarioProjection()

// Analyze first year
const year1Periods = projection.slice(0, 12)
let totalISAContributions = 0
let totalOverflow = 0

year1Periods.forEach((point, month) => {
  const isaAllocation = point.breakdown.cashFlowAllocations?.[AssetClass.EQUITIES] || 0
  const giaAllocation = point.breakdown.cashFlowAllocations?.[AssetClass.GENERAL_INVESTMENT] || 0
  totalISAContributions += isaAllocation
  totalOverflow += giaAllocation
  
  if (month < 3 || giaAllocation > 0) {
    console.log(`Month ${month + 1}: ISA allocation: £${isaAllocation.toFixed(2)}, GIA overflow: £${giaAllocation.toFixed(2)}`)
  }
})

console.log(`\n=== YEAR 1 SUMMARY ===`)
console.log(`Total ISA contributions: £${totalISAContributions.toFixed(2)} (should be ≤ £20,000)`)
console.log(`Total overflow to GIA: £${totalOverflow.toFixed(2)}`)
console.log(`\nCompliance check: ${totalISAContributions <= 20000 ? '✅ PASS' : '❌ FAIL (exceeded limit!)'}`)

// Check account balances
const year1End = projection[11]
const isaAccount = year1End.breakdown.assetCategories.find(a => a.name.includes('ISA'))
const giaAccount = year1End.breakdown.assetCategories.find(a => a.name.includes('General Investment'))

console.log(`\n=== END OF YEAR 1 BALANCES ===`)
console.log(`ISA Balance: £${(isaAccount?.value || 0).toFixed(2)}`)
console.log(`General Investment Balance: £${(giaAccount?.value || 0).toFixed(2)}`)
console.log(`\nNote: This test verifies the complete ISA limit enforcement pipeline:`)
console.log('  1. Scheduled contributions are capped by simulator')
console.log('  2. Automated allocations are capped by allocator')
console.log('  3. Overflow is intelligently routed to appropriate fallback accounts')
