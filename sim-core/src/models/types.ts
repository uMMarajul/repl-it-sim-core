export type FrequencyType = "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly"

export interface AmountWithFrequency {
  amount: number
  frequency: FrequencyType
}

export interface Account {
  name?: string
  provider?: string
  balance?: number
  type?: string
  performance?: number
  frequency?: FrequencyType
  contribution?: number
}

export interface Asset {
  type?: string
  purchasePrice?: number
  yearsOwned?: number
  currentValue?: number
}

export interface QuestionnaireData {
  incomeWork?: {
    highestEducationLevel?: string
    currentWorkSituation?: string
    grossAnnualSalary?: number
    monthlyTakeHomeSalary?: number
    otherIncomeSources?: string
    otherIncomeAmount?: AmountWithFrequency
  }
  monthlyExpenses?: {
    rentMortgage?: number
    billsUtilities?: number
    transport?: number
    foodGroceries?: number
    subscriptions?: number
    leisureEntertainment?: number
    other?: number
  }
  savings?: {
    savingsAccounts?: Account[]
  }
  investments?: {
    investments?: Account[]
  }
  debts?: {
    debts?: Account[]
  }
  assets?: {
    assets?: Asset[]
  }
  pensions?: {
    pensions?: Account[]
  }
}

export interface NetIncomeData {
  takeHomeSalary: number
  additionalIncomeStreams: number
  dividendIncome: number
  totalExpenses: number
  netIncome: number
}

export interface WaterfallData {
  name: string
  value: number
  cumulative: number
  type: 'start' | 'positive' | 'negative' | 'end'
  base: number
}

export interface NetWealthProjection {
  month: number
  [accountName: string]: number
}