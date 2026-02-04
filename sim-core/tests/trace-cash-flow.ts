import { ScenarioSimulator, AssetClass } from '../src/engine/scenarioSimulator'
import { BalanceAccount } from '../src/engine/balanceAccount'
import { calculateTaxOnIncome, calculateNationalInsurance } from '../src/engine/ukTaxCalculator'

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
    contribution: 720,  // Employer contribution
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

console.log('\n=== MANUAL CALCULATION OF EXPECTED NET CASH FLOW ===\n')

const grossMonthlyIncome = 108000 / 12
const annualIncome = 108000
const annualTax = calculateTaxOnIncome(annualIncome)
const annualNI = calculateNationalInsurance(annualIncome)
const monthlyTax = annualTax / 12
const monthlyNI = annualNI / 12
const netMonthlyIncome = grossMonthlyIncome - monthlyTax - monthlyNI

console.log(`Gross Income: £${grossMonthlyIncome}/month (£${annualIncome}/year)`)
console.log(`Income Tax: £${monthlyTax.toFixed(2)}/month (£${annualTax}/year)`)
console.log(`National Insurance: £${monthlyNI.toFixed(2)}/month (£${annualNI}/year)`)
console.log(`Net Income: £${netMonthlyIncome.toFixed(2)}/month\n`)

const monthlyExpenses = 1725
const monthlyMortgage = 2220
const monthlyPension = 720  // Scheduled contribution (employer)

console.log(`Monthly Expenses: £${monthlyExpenses}`)
console.log(`Monthly Mortgage: £${monthlyMortgage}`)
console.log(`Monthly Pension (scheduled): £${monthlyPension}`)
console.log(`Total Outflows: £${monthlyExpenses + monthlyMortgage + monthlyPension}\n`)

const manualNetCashFlow = netMonthlyIncome - monthlyExpenses - monthlyMortgage - monthlyPension

console.log(`Expected Net Cash Flow: £${manualNetCashFlow.toFixed(2)}/month`)
console.log(`75% to ISA: £${(manualNetCashFlow * 0.75).toFixed(2)}/month`)
console.log(`5% to Pension: £${(manualNetCashFlow * 0.05).toFixed(2)}/month`)
console.log(`20% to Cash Savings: £${(manualNetCashFlow * 0.20).toFixed(2)}/month\n`)

console.log('=== SIMULATOR ACTUAL CALCULATION ===\n')

const simulator = new ScenarioSimulator({
  baseline: {
    accounts: baselineAccounts,
    monthlyIncome: grossMonthlyIncome,
    monthlyExpenses: monthlyExpenses,
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

const projection = simulator.generateScenarioProjection()
const firstMonth = projection[0]

console.log(`Simulator Cash Flow (month 0): £${firstMonth.cashFlow.toFixed(2)}`)
console.log(`Simulator Net Worth Change: £${(firstMonth.netWorth - (110000 + 53000 + 15000 - 346000)).toFixed(2)}`)

// Check if scheduled contributions are being subtracted from cash flow
console.log('\n=== ANALYSIS ===\n')
console.log(`Difference: £${(firstMonth.cashFlow - manualNetCashFlow).toFixed(2)}`)
console.log('Possible causes:')
console.log('1. Scheduled pension contribution NOT being subtracted from net cash flow')
console.log('2. Tax calculation difference')
console.log('3. Mortgage payment handling difference')
console.log('\nHYPOTHESIS:')
console.log('If simulator cashFlow = £4,241 and manual = £1,434')
console.log('Difference = £2,807 ≈ £2,220 (mortgage) + £720 (pension) - £133 (rounding)')
console.log('This suggests scheduled contributions are NOT being subtracted!')
