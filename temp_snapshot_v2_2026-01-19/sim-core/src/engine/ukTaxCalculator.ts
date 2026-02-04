/**
 * UK Income Tax and National Insurance Calculator
 * Calculates net income from gross for individual taxpayers
 * Uses 2024/25 tax bands and constants from ukPensionRules.ts
 * 
 * Includes progressive tax bands (20%/40%/45%) and tapered personal allowance
 * for high earners (reduces £1 for every £2 above £100,000)
 */

import { UK_INCOME_TAX_BANDS, UK_TAX_CONSTANTS, UK_NI_CONSTANTS, UK_CORPORATION_TAX } from '../config/ukPensionRules'

/**
 * Calculate UK income tax on annual gross income
 * Includes tapered personal allowance for income above £100,000
 */
export function calculateTaxOnIncome(grossAnnualIncome: number): number {
  // Calculate personal allowance (tapers by £1 for every £2 over £100k)
  let personalAllowance: number = UK_TAX_CONSTANTS.PERSONAL_ALLOWANCE
  if (grossAnnualIncome > UK_TAX_CONSTANTS.PERSONAL_ALLOWANCE_TAPER_START) {
    const reduction = Math.floor((grossAnnualIncome - UK_TAX_CONSTANTS.PERSONAL_ALLOWANCE_TAPER_START) / 2)
    personalAllowance = Math.max(0, UK_TAX_CONSTANTS.PERSONAL_ALLOWANCE - reduction)
  }

  const taxableIncome = Math.max(0, grossAnnualIncome - personalAllowance)
  
  if (taxableIncome === 0) {
    return 0
  }

  let tax = 0

  // Apply progressive tax rates using UK_INCOME_TAX_BANDS
  // Note: Bands are defined from £0, but we use taxable income (after personal allowance)
  // Basic rate: 20% on first £37,700 of taxable income (£12,570-£50,270 band width)
  const basicRateBandWidth = UK_TAX_CONSTANTS.BASIC_RATE_LIMIT - UK_TAX_CONSTANTS.PERSONAL_ALLOWANCE
  const basicRateBand = Math.min(taxableIncome, basicRateBandWidth)
  if (basicRateBand > 0) {
    tax += basicRateBand * 0.20
  }

  // Higher rate: 40% on taxable income from £37,701 to £112,570
  if (taxableIncome > basicRateBandWidth) {
    const higherRateBand = Math.min(
      taxableIncome - basicRateBandWidth,
      UK_TAX_CONSTANTS.HIGHER_RATE_LIMIT - UK_TAX_CONSTANTS.BASIC_RATE_LIMIT
    )
    tax += higherRateBand * 0.40
  }

  // Additional rate: 45% on taxable income above £112,570
  if (taxableIncome > (UK_TAX_CONSTANTS.HIGHER_RATE_LIMIT - UK_TAX_CONSTANTS.PERSONAL_ALLOWANCE)) {
    const additionalRateBand = taxableIncome - (UK_TAX_CONSTANTS.HIGHER_RATE_LIMIT - UK_TAX_CONSTANTS.PERSONAL_ALLOWANCE)
    tax += additionalRateBand * 0.45
  }

  return Math.round(tax * 100) / 100
}

/**
 * Calculate National Insurance (Employee Class 1) on employment income
 * Note: NI only applies to employment earnings, NOT pension income
 */
export function calculateNationalInsurance(grossAnnualEarnings: number): number {
  if (grossAnnualEarnings <= UK_NI_CONSTANTS.PRIMARY_THRESHOLD) {
    return 0
  }

  let ni = 0

  // Main rate: 8% on earnings £12,571 - £50,270
  const mainRateBand = Math.min(
    grossAnnualEarnings - UK_NI_CONSTANTS.PRIMARY_THRESHOLD,
    UK_NI_CONSTANTS.UPPER_EARNINGS_LIMIT - UK_NI_CONSTANTS.PRIMARY_THRESHOLD
  )
  if (mainRateBand > 0) {
    ni += mainRateBand * UK_NI_CONSTANTS.MAIN_RATE
  }

  // Upper rate: 2% on earnings above £50,270
  if (grossAnnualEarnings > UK_NI_CONSTANTS.UPPER_EARNINGS_LIMIT) {
    const upperRateBand = grossAnnualEarnings - UK_NI_CONSTANTS.UPPER_EARNINGS_LIMIT
    ni += upperRateBand * UK_NI_CONSTANTS.ADDITIONAL_RATE
  }

  return Math.round(ni * 100) / 100
}

/**
 * Calculate net annual income after tax and NI
 */
export function calculateNetAnnualIncome(grossAnnualIncome: number): number {
  const incomeTax = calculateTaxOnIncome(grossAnnualIncome)
  const nationalInsurance = calculateNationalInsurance(grossAnnualIncome)
  return grossAnnualIncome - incomeTax - nationalInsurance
}

/**
 * Alias for calculateNetAnnualIncome for better semantic clarity
 */
export function calculateNetSalary(grossAnnualSalary: number): number {
  return calculateNetAnnualIncome(grossAnnualSalary)
}

/**
 * Calculate net monthly income from annual gross
 */
export function calculateNetMonthlyIncome(grossAnnualIncome: number): number {
  return calculateNetAnnualIncome(grossAnnualIncome) / 12
}

/**
 * Result of corporation tax calculation including effective rate
 */
export interface CorporationTaxResult {
  tax: number  // Total corporation tax due
  netProfit: number  // Profit after corporation tax
  effectiveRate: number  // Effective tax rate as percentage (0-100)
}

/**
 * Calculate UK Corporation Tax on annual business profits
 * 
 * Implements Spring Budget 2021 rates:
 * - 19% for profits up to £50,000 (Small Profits Rate)
 * - 25% for profits above £250,000 (Main Rate)
 * - Marginal relief for profits between £50,000 and £250,000
 * 
 * Marginal relief formula (HMRC):
 * Marginal Relief = (Upper Limit - Profits) × Standard Fraction
 * where Standard Fraction = 3/200 = 0.015
 * 
 * Tax in marginal band = (Profits × Main Rate) - Marginal Relief
 * 
 * @param annualProfit - Annual business profit before tax
 * @returns Corporation tax details including tax, net profit, and effective rate
 */
export function calculateCorporationTax(annualProfit: number): CorporationTaxResult {
  if (annualProfit <= 0) {
    return {
      tax: 0,
      netProfit: annualProfit,
      effectiveRate: 0
    }
  }

  let tax = 0

  if (annualProfit <= UK_CORPORATION_TAX.SMALL_PROFITS_THRESHOLD) {
    // Small Profits Rate: 19% on profits up to £50,000
    tax = annualProfit * UK_CORPORATION_TAX.SMALL_PROFITS_RATE
  } else if (annualProfit >= UK_CORPORATION_TAX.MARGINAL_RELIEF_UPPER_LIMIT) {
    // Main Rate: 25% on profits above £250,000
    tax = annualProfit * UK_CORPORATION_TAX.MAIN_RATE
  } else {
    // Marginal Relief: profits between £50,000 and £250,000
    // Tax = (Profits × 25%) - Marginal Relief
    // Marginal Relief = (£250,000 - Profits) × 0.015
    const marginalRelief = (UK_CORPORATION_TAX.MARGINAL_RELIEF_UPPER_LIMIT - annualProfit) * 
                          UK_CORPORATION_TAX.MARGINAL_RELIEF_FRACTION
    tax = (annualProfit * UK_CORPORATION_TAX.MAIN_RATE) - marginalRelief
  }

  const netProfit = annualProfit - tax
  const effectiveRate = (tax / annualProfit) * 100

  return {
    tax: Math.round(tax * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100
  }
}
