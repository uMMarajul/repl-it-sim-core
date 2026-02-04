import { ScenarioSimulator, AssetClass } from '../src/engine/scenarioSimulator'
import { BalanceAccount } from '../src/engine/balanceAccount'

console.log('\n=== FULL ISA TRACKING TEST (Scheduled + Automated Contributions) ===\n')

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
        [AssetClass.EQUITIES]: 75,  // 75% of surplus → ISA
        [AssetClass.PENSION]: 0
      }
    }
  },
  modifiers: []
})

console.log('Setup:')
console.log('  Income: £5,000/month')
console.log('  Expenses: £1,500/month')
console.log('  Scheduled ISA: £1,000/month')
console.log('  Automated allocation: 75% of remaining surplus → ISA')
console.log('  Expected: £1,000 scheduled + 75% of £2,500 = £1,000 + £1,875 = £2,875/month')
console.log('  Annual total: £34,500 (exceeds £20k limit by £14,500)\n')

const projection = simulator.generateScenarioProjection()

// Track contributions for first year
let totalScheduled = 0
let totalAutomated = 0

console.log('=== MONTHLY BREAKDOWN ===')
projection.slice(0, 12).forEach((point, month) => {
  const scheduled = point.breakdown.scheduledContributions?.['Private ISA'] || 0
  const automated = point.breakdown.cashFlowAllocations?.[AssetClass.EQUITIES] || 0
  const total = scheduled + automated
  
  totalScheduled += scheduled
  totalAutomated += automated
  
  console.log(`Month ${String(month + 1).padStart(2)}: Scheduled: £${scheduled.toFixed(2).padStart(8)}, Automated: £${automated.toFixed(2).padStart(8)}, Total: £${total.toFixed(2).padStart(8)}`)
})

console.log(`\n=== YEAR 1 TOTALS ===`)
console.log(`Total scheduled contributions:  £${totalScheduled.toFixed(2)}`)
console.log(`Total automated allocations:    £${totalAutomated.toFixed(2)}`)
console.log(`Combined total:                 £${(totalScheduled + totalAutomated).toFixed(2)}`)
console.log(`UK ISA annual limit:            £20,000.00`)
console.log(`Excess (should be prevented):   £${Math.max(0, (totalScheduled + totalAutomated) - 20000).toFixed(2)}`)

const year1End = projection[11]
const isaBalance = year1End.breakdown.assetCategories.find(a => a.name.includes('ISA'))?.value || 0

console.log(`\n=== FINAL CHECK ===`)
console.log(`ISA balance at year end: £${isaBalance.toFixed(2)} (includes growth)`)
console.log(`\nCompliance status: ${(totalScheduled + totalAutomated) <= 20000 ? '✅ PASS' : '❌ FAIL - exceeded limit!'}`)
