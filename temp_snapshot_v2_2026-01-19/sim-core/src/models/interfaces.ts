// Configuration interfaces for actions and events

import { ScenarioArchetype } from '../config/archetypes'

export interface ActionConfig {
  enabled: boolean
  targetAmount: number
  startDate: Date
  duration?: number
  performance?: number
  
  // Increase Salary specific
  increaseType?: 'one-time' | 'annual-percent'
  annualPercentage?: number
  
  // Add Side Income specific
  isOngoing?: boolean
  
  // Reduce Expenses specific
  reductionType?: 'amount' | 'percentage'
  reductionPercentage?: number
  
  // Refinance Debt specific
  oldInterestRate?: number
  newInterestRate?: number
  debtBalance?: number
  linkedAccountName?: string
  
  // Pension specific
  pensionTaxRelief?: number
  annualAllowance?: number
  
  // Portfolio Switch specific
  oldAssetClass?: string
  newAssetClass?: string
  performanceDifference?: number
  
  // Investment specific
  isISA?: boolean
  isaAllowanceUsed?: number
  assetClass?: string
  
  // Home buying specific
  location?: string
  appreciationRate?: number
  
  // Salary-change action specific data (for net-to-net calculations)
  data?: {
    baselineGrossSalary?: number
    scenarioGrossSalary?: number
  }
}

export interface EventConfig {
  enabled: boolean
  targetAmount: number
  startDate: Date
  duration?: number
  
  // Market Crash specific
  portfolioImpact?: number
  
  // Salary-change event specific data (for net-to-net calculations)
  data?: {
    baselineGrossSalary?: number
    scenarioGrossSalary?: number
  }
}
