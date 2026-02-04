import { ScenarioSimulator, AssetClass } from '../src/engine/scenarioSimulator'
import { BalanceAccount } from '../src/engine/balanceAccount'

const baselineAccounts = [
  new BalanceAccount({
    name: 'Private ISA',
    startingBalance: 0,
    contribution: 1000,
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
        [AssetClass.EQUITIES]: 75,
        [AssetClass.PENSION]: 0
      }
    }
  },
  modifiers: []
})

console.log('Testing first 15 periods to see when capping starts...\n')
const projection = simulator.generateScenarioProjection()

console.log('\n=== FIRST 15 PERIODS ISA CONTRIBUTIONS ===')
for (let period = 0; period < 15; period++) {
  const scheduled = projection[period].breakdown.scheduledContributions?.['Private ISA'] || 0
  const automated = projection[period].breakdown.cashFlowAllocations?.[AssetClass.EQUITIES] || 0
  const isaBalance = projection[period].breakdown.assetCategories.find(a => a.name.includes('ISA'))?.value || 0
  
  console.log(`Period ${String(period).padStart(2)}: Scheduled: £${scheduled.toFixed(2).padStart(8)}, Automated: £${automated.toFixed(2).padStart(8)}, Total: £${(scheduled + automated).toFixed(2).padStart(8)}, Balance: £${isaBalance.toFixed(2)}`)
}
