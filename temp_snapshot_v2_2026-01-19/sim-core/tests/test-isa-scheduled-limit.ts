import { ScenarioSimulator, AssetClass } from '../src/engine/scenarioSimulator'
import { BalanceAccount } from '../src/engine/balanceAccount'

console.log('\n=== TEST: ISA SCHEDULED CONTRIBUTION LIMIT ENFORCEMENT ===\n')

// Test case: User has £2,000/month scheduled ISA contribution (£24k/year - exceeds £20k limit)
// Expected: System should cap total ISA at £20k and overflow £4k to DEFAULT_SAVINGS
const baselineAccounts = [
  new BalanceAccount({
    name: 'Private ISA',
    startingBalance: 0,
    contribution: 2000,  // £2,000/month scheduled = £24,000/year (exceeds £20k limit!)
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
    monthlyIncome: 60000 / 12,  // £60k annual salary
    monthlyExpenses: 1500,
    currentAge: 30,
    retirementAge: 65,
    statePensionMonthly: 11500 / 12,
    allocationConfig: {
      automatedAllocationPercentages: {
        [AssetClass.EQUITIES]: 0,  // No automated allocation - test scheduled only
        [AssetClass.PENSION]: 0
      }
    }
  },
  modifiers: []
})

console.log('Setup:')
console.log('  Scheduled ISA contribution: £2,000/month = £24,000/year')
console.log('  UK ISA annual limit: £20,000')
console.log('  Expected overflow: £4,000/year to DEFAULT_SAVINGS\n')

console.log('Running simulation...\n')
const projection = simulator.generateScenarioProjection()

// Check for overflow messages
console.log('\nIf ISA limit enforcement is working correctly, you should see:')
console.log('  - Overflow warnings when scheduled contributions exceed £20k')
console.log('  - Overflow routed to DEFAULT_SAVINGS')
console.log('\nCheck console output above for 🚨 ISA overflow messages.')

// Verify the accounts at end of first year
const year1Data = projection[11]  // December (period 11)
const isaAccount = year1Data.breakdown.assetCategories.find(a => a.name.includes('ISA'))
const cashSavingsAccount = year1Data.breakdown.assetCategories.find(a => a.name.includes('Cash Savings'))

console.log(`\n=== END OF YEAR 1 RESULTS ===`)
console.log(`ISA Balance: £${(isaAccount?.value || 0).toFixed(2)}`)
console.log(`Cash Savings Balance: £${(cashSavingsAccount?.value || 0).toFixed(2)}`)
console.log(`\nNote: With the fix, ISA contributions should be capped and overflow routed correctly.`)
console.log('Without the fix, ISA would receive full £24k/year (silently exceeding limit).')
