import { ScenarioSimulator, AssetClass } from '../src/engine/scenarioSimulator'
import { BalanceAccount } from '../src/engine/balanceAccount'

console.log('\n=== ISA COMPLIANCE TEST (UK Tax Years: April-March) ===\n')

const baselineAccounts = [
  new BalanceAccount({
    name: 'Private ISA',
    startingBalance: 0,
    contribution: 1000,  // £1,000/month scheduled
    performance: 7,
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
        [AssetClass.EQUITIES]: 75,  // 75% automated → ISA
        [AssetClass.PENSION]: 0
      }
    }
  },
  modifiers: []
})

const projection = simulator.generateScenarioProjection()

// UK tax year structure (zero-indexed periods):
// Tax Year -1: Periods 0-2 (Jan-Mar Year 1) - stub period
// Tax Year 0: Periods 3-14 (Apr Year 1 - Mar Year 2) - first full tax year
// Tax Year 1: Periods 15-26 (Apr Year 2 - Mar Year 3) - second full tax year
// Tax Year 2: Periods 27-38 (Apr Year 3 - Mar Year 4) - third full tax year

const taxYears = [
  { name: 'Stub (Jan-Mar Y1)', start: 0, end: 2 },
  { name: 'TY0 (Apr Y1-Mar Y2)', start: 3, end: 14 },
  { name: 'TY1 (Apr Y2-Mar Y3)', start: 15, end: 26 },
  { name: 'TY2 (Apr Y3-Mar Y4)', start: 27, end: 38 }
]

console.log('=== UK TAX YEAR CONTRIBUTIONS ===\n')

taxYears.forEach(ty => {
  let totalContributions = 0
  
  for (let period = ty.start; period <= ty.end; period++) {
    const point = projection[period]
    const scheduled = point.breakdown.scheduledContributions?.['Private ISA'] || 0
    const automated = point.breakdown.cashFlowAllocations?.[AssetClass.EQUITIES] || 0
    totalContributions += scheduled + automated
  }
  
  const months = ty.end - ty.start + 1
  const isCompliant = totalContributions <= 20000
  
  console.log(`${ty.name} (${months} months):`)
  console.log(`  Total contributions: £${totalContributions.toFixed(2)}`)
  console.log(`  UK ISA limit: £20,000.00`)
  console.log(`  Status: ${isCompliant ? '✅ PASS' : '❌ FAIL'}`)
  console.log('')
})

console.log('=== SUMMARY ===')
console.log('If all tax years show ✅ PASS, UK ISA compliance is working correctly!')
console.log('The £20k limit applies per UK tax year (April-March), not calendar year.')
