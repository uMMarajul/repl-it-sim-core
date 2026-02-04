export interface ExpenseBreakdown {
  housing: number  // Rent or Mortgage
  utilities: number
  transport: number
  subscriptions: number
  food: number  // Food and Groceries
  leisure: number  // Leisure and Entertainment
  other: number  // Other regular expenses
}

export interface TestProfile {
  id: string
  name: string
  currentAge: number
  retirementAge: number
  currentSalary: number
  monthlyExpenses: number
  expenseBreakdown?: ExpenseBreakdown  // Detailed expense categories
  pensionBalance: number
  description: string
  allocationConfig?: { equities: number; pension: number }  // Override default allocation %

  // Additional fields for AI rules engine
  savingsBalance?: number
  isaBalance?: number
  mortgageBalance?: number
  mortgageRate?: number
  otherDebtBalance?: number
  propertyValue?: number
  hasEmergencyFund?: boolean
  hasChildren?: number
  isMarried?: boolean
  riskTolerance?: 'low' | 'medium' | 'high'
}

export const testProfiles: Record<string, TestProfile> = {
  alpha2: {
    id: 'alpha2',
    name: 'Alpha 2',
    currentAge: 34,
    retirementAge: 70,
    currentSalary: 108000,  // Single person income (mortgage split with partner)
    monthlyExpenses: 1725,  // Original expenses restored
    expenseBreakdown: {
      housing: 0,  // Mortgage payment (£2,220/month) tracked separately as debt contribution
      utilities: 350,
      transport: 200,
      subscriptions: 25,
      food: 900,
      leisure: 250,
      other: 0
    },
    pensionBalance: 53000, // Workplace Pension £53k (L&G)
    description: '34-year-old professional with £53k Workplace Pension, £123k house equity, and £346k mortgage.',
    allocationConfig: { equities: 75, pension: 5 },  // Balanced allocation: £16.7k ISA + £4.5k surplus for overpayments

    // AI rules engine fields
    savingsBalance: 10000,
    isaBalance: 111104,
    mortgageBalance: 346257,
    mortgageRate: 1.46,
    otherDebtBalance: 0,
    propertyValue: 469386,  // 50% share of £938k property
    hasEmergencyFund: false,  // Will trigger emergency fund recommendation
    hasChildren: 0,
    isMarried: true,
    riskTolerance: 'medium'
  }
}
