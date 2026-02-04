import { Goal, SimulationScenario } from './goalSimulator'
import { BalanceAccount } from './balanceAccount'
import { ScenarioArchetype } from './archetypes'

export const SAMPLE_SCENARIOS: Record<string, SimulationScenario> = {
  first_time_buyer: {
    baseline: {
      accounts: [
        new BalanceAccount({
          name: 'Savings',
          startingBalance: 15000,
          contribution: 800,
          frequency: 'monthly',
          performance: 3
        }),
        new BalanceAccount({
          name: 'Workplace Pension',
          startingBalance: 5000,  // Small pot from ~4 years of work
          contribution: 256,  // 8% total (5% employee + 3% employer on £3,200 salary)
          frequency: 'monthly',
          performance: 6,
          contributionStopAfterPeriods: 468  // Stop at retirement age 67 (39 years * 12 months)
        }),
        new BalanceAccount({
          name: 'ISA',
          startingBalance: 2000,
          contribution: 100,
          frequency: 'monthly',
          performance: 5
        }),
        new BalanceAccount({
          name: 'Credit Card',
          startingBalance: 3000,
          contribution: 200,
          frequency: 'monthly',
          performance: 19.9,
          isDebt: true
        })
      ],
      monthlyIncome: 3200,
      monthlyExpenses: 2100,
      currentAge: 28,
      retirementAge: 67,
      statePensionMonthly: 995  // UK state pension (£230/week)
    },
    modifiers: [
      {
        id: '1',
        name: 'House Deposit (£40k)',
        archetype: ScenarioArchetype.ACCUMULATION_RECURRING,
        targetAmount: 40000,
        targetDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
        startDate: new Date(),
        duration: 5,
        performance: 4
      },
      {
        id: '2',
        name: 'Pay Off Credit Card',
        archetype: ScenarioArchetype.DEBT_REDUCTION,
        targetAmount: 3000,
        targetDate: new Date(Date.now() + 18 * 30 * 24 * 60 * 60 * 1000),
        startDate: new Date(),
        duration: 1.5
      }
    ]
  },

  career_changer: {
    baseline: {
      accounts: [
        new BalanceAccount({
          name: 'Emergency Fund',
          startingBalance: 8000,
          contribution: 200,
          frequency: 'monthly',
          performance: 2
        }),
        new BalanceAccount({
          name: 'Workplace Pension',
          startingBalance: 15000,  // Moderate pot from ~12 years of work
          contribution: 224,  // 8% of £2,800 salary
          frequency: 'monthly',
          performance: 6,
          contributionStopAfterPeriods: 384  // Stop at retirement age 67 (32 years * 12 months)
        }),
        new BalanceAccount({
          name: 'ISA',
          startingBalance: 3000,
          contribution: 50,
          frequency: 'monthly',
          performance: 5
        })
      ],
      monthlyIncome: 2800,
      monthlyExpenses: 2200,
      currentAge: 35,
      retirementAge: 67,
      statePensionMonthly: 995
    },
    modifiers: [
      {
        id: '1',
        name: "Master's Degree",
        archetype: ScenarioArchetype.INCOME_INVESTMENT,
        targetAmount: 15000,
        targetDate: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000),
        startDate: new Date(),
        performance: 10,
        duration: 2
      },
      {
        id: '2',
        name: 'Career Break Sabbatical',
        archetype: ScenarioArchetype.ONE_OFF_EXPENSE,
        targetAmount: 5000,
        targetDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
        startDate: new Date()
      }
    ]
  },

  retirement_focused: {
    baseline: {
      accounts: [
        new BalanceAccount({
          name: 'Pension',
          startingBalance: 45000,
          contribution: 500,
          frequency: 'monthly',
          performance: 6
        }),
        new BalanceAccount({
          name: 'ISA',
          startingBalance: 20000,
          contribution: 300,
          frequency: 'monthly',
          performance: 5
        })
      ],
      monthlyIncome: 4500,
      monthlyExpenses: 2800,
      currentAge: 50,
      retirementAge: 67,
      statePensionMonthly: 995
    },
    modifiers: [
      {
        id: '1',
        name: 'Pension Top-Up',
        archetype: ScenarioArchetype.RETIREMENT,
        targetAmount: 12000,
        targetDate: new Date(Date.now() + 30 * 365 * 24 * 60 * 60 * 1000),
        startDate: new Date(),
        duration: 30,
        performance: 6
      },
      {
        id: '2',
        name: 'Build Investment Portfolio',
        archetype: ScenarioArchetype.ACCUMULATION_LUMP,
        targetAmount: 25000,
        targetDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000),
        performance: 7
      }
    ]
  },

  young_family: {
    baseline: {
      accounts: [
        new BalanceAccount({
          name: 'Joint Savings',
          startingBalance: 12000,
          contribution: 400,
          frequency: 'monthly',
          performance: 2.5
        }),
        new BalanceAccount({
          name: 'Workplace Pension',
          startingBalance: 20000,  // Joint/household pension pot
          contribution: 416,  // 8% of £5,200 combined salary
          frequency: 'monthly',
          performance: 6,
          contributionStopAfterPeriods: 420  // Stop at retirement age 67 (35 years * 12 months)
        }),
        new BalanceAccount({
          name: 'ISA',
          startingBalance: 5000,
          contribution: 100,
          frequency: 'monthly',
          performance: 5
        })
      ],
      monthlyIncome: 5200,
      monthlyExpenses: 3800,
      currentAge: 32,
      retirementAge: 67,
      statePensionMonthly: 995
    },
    modifiers: [
      {
        id: '1',
        name: "Child's Education Fund",
        archetype: ScenarioArchetype.ACCUMULATION_RECURRING,
        targetAmount: 50000,
        targetDate: new Date(Date.now() + 18 * 365 * 24 * 60 * 60 * 1000),
        startDate: new Date(),
        duration: 18,
        performance: 5
      },
      {
        id: '2',
        name: 'Childcare Costs',
        archetype: ScenarioArchetype.RECURRING_EXPENSE,
        targetAmount: 14400,
        targetDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
        startDate: new Date(),
        duration: 5
      },
      {
        id: '3',
        name: 'Family Holiday',
        archetype: ScenarioArchetype.ONE_OFF_EXPENSE,
        targetAmount: 3000,
        targetDate: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000)
      }
    ]
  },

  debt_free_journey: {
    baseline: {
      accounts: [
        new BalanceAccount({
          name: 'Workplace Pension',
          startingBalance: 2500,  // Small pot from ~2 years of work (age 25)
          contribution: 208,  // 8% of £2,600 salary
          frequency: 'monthly',
          performance: 6,
          contributionStopAfterPeriods: 504  // Stop at retirement age 67 (42 years * 12 months)
        }),
        new BalanceAccount({
          name: 'Student Loan',
          startingBalance: 25000,
          contribution: 150,
          frequency: 'monthly',
          performance: 1.5,
          isDebt: true
        }),
        new BalanceAccount({
          name: 'Overdraft',
          startingBalance: 2000,
          contribution: 100,
          frequency: 'monthly',
          performance: 19,
          isDebt: true
        })
      ],
      monthlyIncome: 2600,
      monthlyExpenses: 2000,
      currentAge: 25,
      retirementAge: 67,
      statePensionMonthly: 995
    },
    modifiers: [
      {
        id: '1',
        name: 'Clear Overdraft',
        archetype: ScenarioArchetype.DEBT_REDUCTION,
        targetAmount: 2000,
        targetDate: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000),
        startDate: new Date(),
        duration: 1
      },
      {
        id: '2',
        name: 'Build Emergency Fund',
        archetype: ScenarioArchetype.SAFETY_NET,
        targetAmount: 3000,
        targetDate: new Date(Date.now() + 18 * 30 * 24 * 60 * 60 * 1000)
      }
    ]
  }
}

export function getSampleScenario(name: keyof typeof SAMPLE_SCENARIOS): SimulationScenario {
  return SAMPLE_SCENARIOS[name]
}

export function getAllSampleScenarios(): Array<{ name: string; scenario: SimulationScenario }> {
  return Object.entries(SAMPLE_SCENARIOS).map(([name, scenario]) => ({ name, scenario }))
}
