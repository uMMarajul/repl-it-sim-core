import { ScenarioSimulator, AssetClass } from '../src/engine/scenarioSimulator'
import { BalanceAccount } from '../src/engine/balanceAccount'

// Alpha 2 baseline configuration
const baselineAccounts = [
  new BalanceAccount({
    name: 'Private ISA',
    startingBalance: 110000,
    contribution: 0,
    performance: 7,
    frequency: 'monthly',
    isDebt: false
  }),
  new BalanceAccount({
    name: 'Workplace Pension (L&G)',
    startingBalance: 53000,
    contribution: 720,
    performance: 5,
    frequency: 'monthly',
    isDebt: false
  }),
  new BalanceAccount({
    name: 'Mortgage',
    startingBalance: 346000,
    contribution: 2220,
    performance: 4.5,
    frequency: 'monthly',
    isDebt: true
  }),
  new BalanceAccount({
    name: 'Current Account',
    startingBalance: 15000,
    contribution: 0,
    performance: 0,
    frequency: 'monthly',
    isDebt: false
  })
]

console.log('\n=== TRACKING ISA YTD ACROSS FIRST TAX YEAR ===\n')
console.log('Expected: £976.09/month × 12 months (April-March) = £11,713/year')
console.log('Actual overflow shows: £19,748.89/year (almost double!)\n')

const simulator = new ScenarioSimulator({
  baseline: {
    accounts: baselineAccounts,
    monthlyIncome: 108000 / 12,
    monthlyExpenses: 1725,
    currentAge: 34,
    retirementAge: 70,
    statePensionMonthly: 11500 / 12,
    allocationConfig: {
      automatedAllocationPercentages: {
        [AssetClass.EQUITIES]: 75,
        [AssetClass.PENSION]: 5
      }
    }
  },
  modifiers: []
})

// Run simulation - look for overflow period in console output
const projection = simulator.generateScenarioProjection()

console.log('\nSimulation complete. Check logs above for overflow period and YTD tracking.')
