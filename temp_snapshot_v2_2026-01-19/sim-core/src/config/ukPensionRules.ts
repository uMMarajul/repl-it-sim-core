/**
 * UK Pension Withdrawal Rules & Allowances
 * 
 * Implements UK-specific pension access rules including:
 * - Age gating (55+, rising to 57 in 2028)
 * - 25% tax-free lump sum allowance (~£268k cap)
 * - Taxable drawdown with income tax
 * - MPAA (Money Purchase Annual Allowance) restrictions
 */

import { calculateTaxOnIncome } from '../engine/ukTaxCalculator'

export interface PensionWithdrawalState {
  taxFreeLumpSumRemaining: number  // Remaining 25% tax-free allowance
  totalCrystallized: number  // Total pension pot crystallized for access
  mpaaTriggered: boolean  // Whether flexible access has been triggered
  totalWithdrawnThisPeriod: number  // Track withdrawals in current period
  yearToDateTaxableIncome: number  // Cumulative taxable PENSION income this tax year
  yearToDateOtherIncome: number  // Cumulative other taxable income (salary, state pension) this tax year
  currentTaxYear: number  // Track which tax year we're in (April-March in UK)
}

export interface PensionWithdrawalCapacity {
  maxTaxFree: number  // Maximum tax-free amount available this period
  maxTaxable: number  // Maximum taxable amount available this period (pre-tax)
  totalAvailable: number  // Total withdrawal capacity
  ageRestricted: boolean  // Whether age prevents access
}

export interface PensionWithdrawalResult {
  taxFreeAmount: number  // Amount withdrawn tax-free
  taxableAmount: number  // Amount withdrawn subject to income tax
  taxApplied: number  // Income tax on taxable portion
  netAmount: number  // Net amount received after tax
  state: PensionWithdrawalState  // Updated state after withdrawal
}

// UK Pension Constants
export const UK_PENSION_RULES = {
  MIN_ACCESS_AGE: 55,  // Minimum age for pension access (rising to 57 in 2028)
  TAX_FREE_PERCENTAGE: 25,  // 25% of crystallized pot is tax-free
  LUMP_SUM_ALLOWANCE: 268275,  // Maximum tax-free lump sum (2024/25)
  ANNUAL_ALLOWANCE: 60000,  // Annual contribution allowance
  MPAA_LIMIT: 10000,  // Money Purchase Annual Allowance after flexible access
  STATE_PENSION_AGE: 67  // UK statutory state pension age (2024/25)
} as const

// UK Capital Gains Tax Constants (2024/25)
export const UK_CGT_RULES = {
  ANNUAL_EXEMPTION: 3000,  // Tax-free allowance per year (reduced from £6,000 in 2023/24)
  BASIC_RATE: 10,  // CGT rate for basic rate taxpayers (%)
  HIGHER_RATE: 20  // CGT rate for higher/additional rate taxpayers (%)
} as const

// UK Income Tax Bands (2024/25) - defined as ranges with their tax rates
export const UK_INCOME_TAX_BANDS = [
  { lowerThreshold: 0, upperThreshold: 12570, rate: 0 },  // Personal allowance: £0-£12,570 at 0%
  { lowerThreshold: 12570, upperThreshold: 50270, rate: 20 },  // Basic rate: £12,571-£50,270 at 20%
  { lowerThreshold: 50270, upperThreshold: 125140, rate: 40 },  // Higher rate: £50,271-£125,140 at 40%
  { lowerThreshold: 125140, upperThreshold: Infinity, rate: 45 }  // Additional rate: £125,141+ at 45%
] as const

// UK Income Tax Constants (2024/25)
export const UK_TAX_CONSTANTS = {
  PERSONAL_ALLOWANCE: 12570,  // Standard personal allowance
  PERSONAL_ALLOWANCE_TAPER_START: 100000,  // Income level where personal allowance starts to reduce
  BASIC_RATE_LIMIT: 50270,  // Upper threshold for basic rate
  HIGHER_RATE_LIMIT: 125140  // Upper threshold for higher rate (where personal allowance fully tapered)
} as const

// UK National Insurance Constants (2024/25) - Employee Class 1
export const UK_NI_CONSTANTS = {
  PRIMARY_THRESHOLD: 12570,  // NI starts above this amount (aligned with personal allowance)
  UPPER_EARNINGS_LIMIT: 50270,  // Threshold where NI rate drops from 8% to 2%
  MAIN_RATE: 0.08,  // 8% on earnings £12,571-£50,270
  ADDITIONAL_RATE: 0.02  // 2% on earnings above £50,270
} as const

// UK Corporation Tax Constants (2024/25) - Spring Budget 2021 rates
export const UK_CORPORATION_TAX = {
  SMALL_PROFITS_RATE: 0.19,  // 19% for profits up to £50,000
  MAIN_RATE: 0.25,  // 25% for profits above £250,000
  SMALL_PROFITS_THRESHOLD: 50000,  // Lower threshold for small profits rate
  MARGINAL_RELIEF_UPPER_LIMIT: 250000,  // Upper threshold where marginal relief ends
  MARGINAL_RELIEF_FRACTION: 0.015  // 3/200 standard fraction for marginal relief calculation
} as const

/**
 * Initialize pension withdrawal state for a new simulation
 * @param startYear - Starting year for tax year tracking (default: current year)
 */
export function initializePensionState(totalPensionPot: number, startYear?: number): PensionWithdrawalState {
  const currentYear = startYear || new Date().getFullYear()
  return {
    taxFreeLumpSumRemaining: Math.min(
      totalPensionPot * (UK_PENSION_RULES.TAX_FREE_PERCENTAGE / 100),
      UK_PENSION_RULES.LUMP_SUM_ALLOWANCE
    ),
    totalCrystallized: 0,
    mpaaTriggered: false,
    totalWithdrawnThisPeriod: 0,
    yearToDateTaxableIncome: 0,
    yearToDateOtherIncome: 0,
    currentTaxYear: currentYear
  }
}

/**
 * Calculate maximum pension withdrawal capacity for current period
 */
export function calculateWithdrawalCapacity(
  currentAge: number,
  pensionBalance: number,
  state: PensionWithdrawalState
): PensionWithdrawalCapacity {
  // Age restriction check
  if (currentAge < UK_PENSION_RULES.MIN_ACCESS_AGE) {
    return {
      maxTaxFree: 0,
      maxTaxable: 0,
      totalAvailable: 0,
      ageRestricted: true
    }
  }

  // Available tax-free amount (25% of remaining pot, capped by remaining allowance)
  const potentialTaxFree = pensionBalance * (UK_PENSION_RULES.TAX_FREE_PERCENTAGE / 100)
  const maxTaxFree = Math.min(potentialTaxFree, state.taxFreeLumpSumRemaining)

  // Remaining balance is taxable
  const maxTaxable = pensionBalance - maxTaxFree

  return {
    maxTaxFree,
    maxTaxable,
    totalAvailable: pensionBalance,
    ageRestricted: false
  }
}

/**
 * Execute pension withdrawal with tax calculations, iterating to cover net deficit
 * 
 * @param netDeficit - Net amount needed to cover expenses (after tax)
 * @param capacity - Current withdrawal capacity
 * @param state - Current pension withdrawal state
 * @param monthlyIncome - Monthly income for year-to-date tax calculation
 * @param period - Current period (for tax year tracking)
 * @returns Withdrawal result with tax breakdown
 */
export function executePensionWithdrawal(
  netDeficit: number,
  capacity: PensionWithdrawalCapacity,
  state: PensionWithdrawalState,
  monthlyIncome: number = 0,
  period: number = 0
): PensionWithdrawalResult {
  if (capacity.ageRestricted || netDeficit <= 0) {
    return {
      taxFreeAmount: 0,
      taxableAmount: 0,
      taxApplied: 0,
      netAmount: 0,
      state
    }
  }

  // Check if we've rolled into a new tax year (UK: April-March, period % 12 = 3 is April)
  const currentMonth = period % 12
  const simulationYear = Math.floor(period / 12)
  const taxYear = currentMonth >= 3 ? simulationYear : simulationYear - 1  // Tax year starts April
  
  let workingState = { ...state }
  if (taxYear !== state.currentTaxYear) {
    // Reset year-to-date tracking for new tax year
    workingState = {
      ...state,
      yearToDateTaxableIncome: 0,
      yearToDateOtherIncome: 0,
      currentTaxYear: taxYear
    }
  }
  
  // Add this month's other income to year-to-date tracking
  workingState = {
    ...workingState,
    yearToDateOtherIncome: workingState.yearToDateOtherIncome + monthlyIncome
  }

  // Iterative approach: Withdraw enough gross to cover net deficit after tax
  let grossWithdrawal = netDeficit  // Start with 1:1 guess
  let iteration = 0
  const maxIterations = 10
  
  let taxFreeAmount = 0
  let taxableAmount = 0
  let taxApplied = 0
  let netAmount = 0

  while (iteration < maxIterations) {
    // Cap at available capacity
    const actualGross = Math.min(grossWithdrawal, capacity.totalAvailable)
    
    // Allocate to tax-free first, then taxable
    taxFreeAmount = Math.min(actualGross, capacity.maxTaxFree)
    taxableAmount = actualGross - taxFreeAmount
    
    // Calculate tax using actual year-to-date income (pension + other)
    const ytdTotalIncome = workingState.yearToDateTaxableIncome + workingState.yearToDateOtherIncome
    taxApplied = calculateIncomeTax(taxableAmount, ytdTotalIncome)
    
    // Net received after tax
    netAmount = taxFreeAmount + (taxableAmount - taxApplied)
    
    // Check if we've covered the deficit
    if (netAmount >= netDeficit * 0.99 || actualGross >= capacity.totalAvailable) {
      // Close enough or hit capacity limit
      break
    }
    
    // Upsize gross withdrawal to account for tax shortfall
    const shortfall = netDeficit - netAmount
    grossWithdrawal += shortfall * 1.3  // Overshoot slightly to converge faster
    iteration++
  }

  // Update state (yearToDateOtherIncome already updated above)
  const newState: PensionWithdrawalState = {
    taxFreeLumpSumRemaining: workingState.taxFreeLumpSumRemaining - taxFreeAmount,
    totalCrystallized: workingState.totalCrystallized + (taxFreeAmount + taxableAmount),
    mpaaTriggered: workingState.mpaaTriggered || taxableAmount > 0,
    totalWithdrawnThisPeriod: workingState.totalWithdrawnThisPeriod + (taxFreeAmount + taxableAmount),
    yearToDateTaxableIncome: workingState.yearToDateTaxableIncome + taxableAmount,
    yearToDateOtherIncome: workingState.yearToDateOtherIncome,  // Preserve updated value
    currentTaxYear: workingState.currentTaxYear
  }

  return {
    taxFreeAmount,
    taxableAmount,
    taxApplied,
    netAmount,
    state: newState
  }
}

/**
 * Execute pension withdrawal with a specified GROSS amount (not net)
 * This is used for user-requested withdrawals where the user specifies the gross amount to withdraw
 * 
 * @param grossAmount - Gross amount to withdraw (before tax)
 * @param capacity - Current withdrawal capacity
 * @param state - Current pension withdrawal state
 * @param monthlyIncome - Monthly income for year-to-date tax calculation
 * @param period - Current period (for tax year tracking)
 * @returns Withdrawal result with tax breakdown
 */
export function executePensionWithdrawalGross(
  grossAmount: number,
  capacity: PensionWithdrawalCapacity,
  state: PensionWithdrawalState,
  monthlyIncome: number = 0,
  period: number = 0
): PensionWithdrawalResult {
  if (capacity.ageRestricted || grossAmount <= 0) {
    return {
      taxFreeAmount: 0,
      taxableAmount: 0,
      taxApplied: 0,
      netAmount: 0,
      state
    }
  }

  // Cap at available capacity
  const actualGross = Math.min(grossAmount, capacity.totalAvailable)
  
  // Check if we've rolled into a new tax year (UK: April-March, period % 12 = 3 is April)
  const currentMonth = period % 12
  const simulationYear = Math.floor(period / 12)
  const taxYear = currentMonth >= 3 ? simulationYear : simulationYear - 1
  
  let workingState = { ...state }
  if (taxYear !== state.currentTaxYear) {
    // Reset year-to-date tracking for new tax year
    workingState = {
      ...state,
      yearToDateTaxableIncome: 0,
      yearToDateOtherIncome: 0,
      currentTaxYear: taxYear
    }
  }
  
  // Add this month's other income to year-to-date tracking
  workingState = {
    ...workingState,
    yearToDateOtherIncome: workingState.yearToDateOtherIncome + monthlyIncome
  }
  
  // Allocate to tax-free first, then taxable
  const taxFreeAmount = Math.min(actualGross, capacity.maxTaxFree)
  const taxableAmount = actualGross - taxFreeAmount
  
  // Calculate tax using actual year-to-date income (pension + other)
  const ytdTotalIncome = workingState.yearToDateTaxableIncome + workingState.yearToDateOtherIncome
  const taxApplied = calculateIncomeTax(taxableAmount, ytdTotalIncome)
  
  // Net received after tax
  const netAmount = taxFreeAmount + (taxableAmount - taxApplied)
  
  // Update state
  const newState: PensionWithdrawalState = {
    taxFreeLumpSumRemaining: workingState.taxFreeLumpSumRemaining - taxFreeAmount,
    totalCrystallized: workingState.totalCrystallized + actualGross,
    mpaaTriggered: workingState.mpaaTriggered || taxableAmount > 0,
    totalWithdrawnThisPeriod: workingState.totalWithdrawnThisPeriod + actualGross,
    yearToDateTaxableIncome: workingState.yearToDateTaxableIncome + taxableAmount,
    yearToDateOtherIncome: workingState.yearToDateOtherIncome,
    currentTaxYear: workingState.currentTaxYear
  }

  return {
    taxFreeAmount,
    taxableAmount,
    taxApplied,
    netAmount,
    state: newState
  }
}

/**
 * Calculate income tax on pension withdrawal
 * Uses UK marginal rate system with tapered personal allowance
 * Imports centralized tax calculator to ensure consistency
 */
function calculateIncomeTax(taxableIncome: number, existingIncome: number): number {
  const totalIncome = existingIncome + taxableIncome
  const totalTax = calculateTaxOnIncome(totalIncome)
  const existingTax = calculateTaxOnIncome(existingIncome)
  
  // Return marginal tax on the additional pension income
  return Math.max(0, totalTax - existingTax)
}

/**
 * Reset period tracking (call at start of each new period/month)
 * Note: Year-to-date tracking persists across periods within the same tax year
 */
export function resetPeriodTracking(state: PensionWithdrawalState): PensionWithdrawalState {
  return {
    ...state,
    totalWithdrawnThisPeriod: 0
    // yearToDateTaxableIncome persists - only reset on new tax year
  }
}
