/**
 * Loan and amortization calculations for debt modeling
 */

export interface LoanDetails {
  loanAmount: number
  annualInterestRate: number  // APR as percentage (e.g., 5.5 for 5.5%)
  termYears: number
}

export interface AmortizationResult {
  monthlyPayment: number
  totalPayments: number
  totalInterest: number
  monthlyInterestRate: number
}

export interface StudentLoanPlan {
  plan: '1' | '2' | '4' | '5'
  repaymentThreshold: number  // Annual salary threshold
  repaymentRate: number  // Percentage above threshold (typically 9%)
  writeOffYears: number  // Years until write-off
  writeOffAge?: number  // Age at write-off (Plan 1 only)
  interestRate: 'rpi' | 'rpi_plus_3'  // RPI or RPI + 0-3% based on income
}

/**
 * Calculate monthly payment for a standard amortizing loan
 * Uses formula: P = L * [r(1+r)^n] / [(1+r)^n - 1]
 * 
 * @param loanAmount - Total loan principal
 * @param annualInterestRate - Annual interest rate as percentage (e.g., 5.5 for 5.5%)
 * @param termYears - Loan term in years
 * @returns Amortization details including monthly payment
 */
export function calculateAmortization(
  loanAmount: number,
  annualInterestRate: number,
  termYears: number
): AmortizationResult {
  // Convert annual rate to monthly decimal rate
  const monthlyRate = (annualInterestRate / 100) / 12
  
  // Total number of monthly payments
  const totalPayments = termYears * 12
  
  // Handle zero interest rate (simple division)
  if (annualInterestRate === 0) {
    const monthlyPayment = loanAmount / totalPayments
    return {
      monthlyPayment,
      totalPayments,
      totalInterest: 0,
      monthlyInterestRate: 0
    }
  }
  
  // Standard amortization formula
  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
    (Math.pow(1 + monthlyRate, totalPayments) - 1)
  
  const totalPaid = monthlyPayment * totalPayments
  const totalInterest = totalPaid - loanAmount
  
  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,  // Round to 2 decimal places
    totalPayments,
    totalInterest: Math.round(totalInterest * 100) / 100,
    monthlyInterestRate: monthlyRate
  }
}

/**
 * Get UK student loan plan details
 * 
 * Plan 1: Pre-2012 students, threshold £22,015 (2024/25), write-off at age 65
 * Plan 2: Post-2012 students, threshold £27,295 (2024/25), write-off after 30 years
 * Plan 4: Scottish students, threshold £27,660 (2024/25), write-off after 30 years  
 * Plan 5: Post-2023 students, threshold £25,000, write-off after 40 years
 */
export function getStudentLoanPlan(planType: '1' | '2' | '4' | '5'): StudentLoanPlan {
  const plans: Record<string, StudentLoanPlan> = {
    '1': {
      plan: '1',
      repaymentThreshold: 22015,  // 2024/25 threshold
      repaymentRate: 9,
      writeOffYears: 0,  // Special case: write-off at age 65, not years-based
      writeOffAge: 65,
      interestRate: 'rpi'  // RPI only for Plan 1
    },
    '2': {
      plan: '2',
      repaymentThreshold: 27295,  // 2024/25 threshold
      repaymentRate: 9,
      writeOffYears: 30,
      interestRate: 'rpi_plus_3'  // RPI + 0-3% based on income
    },
    '4': {
      plan: '4',
      repaymentThreshold: 27660,  // 2024/25 threshold (Scotland)
      repaymentRate: 9,
      writeOffYears: 30,
      interestRate: 'rpi_plus_3'  // RPI + 0-3% based on income
    },
    '5': {
      plan: '5',
      repaymentThreshold: 25000,  // Post-2023 threshold
      repaymentRate: 9,
      writeOffYears: 40,
      interestRate: 'rpi_plus_3'  // RPI + 0-3% based on income
    }
  }
  
  return plans[planType]
}

/**
 * Calculate monthly student loan repayment based on income
 * Repayment = max(0, (annual_salary - threshold) * 9% / 12)
 * 
 * @param annualSalary - Current annual salary
 * @param plan - Student loan plan details
 * @returns Monthly repayment amount
 */
export function calculateStudentLoanPayment(
  annualSalary: number,
  plan: StudentLoanPlan
): number {
  const annualRepayment = Math.max(0, (annualSalary - plan.repaymentThreshold) * (plan.repaymentRate / 100))
  const monthlyRepayment = annualRepayment / 12
  
  return Math.round(monthlyRepayment * 100) / 100
}

/**
 * Calculate student loan interest rate based on income
 * 
 * Plan 1: RPI only
 * Plan 2/4/5: RPI + 0% to 3% based on income relative to threshold
 *   - Below £27,295: RPI only
 *   - £27,295 - £49,130: RPI + sliding scale to 3%
 *   - Above £49,130: RPI + 3%
 * 
 * @param annualSalary - Current annual salary
 * @param plan - Student loan plan details
 * @param currentRPI - Current RPI rate (default 3.0%)
 * @returns Annual interest rate as percentage
 */
export function calculateStudentLoanInterestRate(
  annualSalary: number,
  plan: StudentLoanPlan,
  currentRPI: number = 3.0
): number {
  if (plan.interestRate === 'rpi') {
    return currentRPI
  }
  
  // RPI + 0-3% based on income
  const threshold = plan.repaymentThreshold
  const upperThreshold = 49130  // Fixed upper threshold for max interest
  
  if (annualSalary <= threshold) {
    return currentRPI
  } else if (annualSalary >= upperThreshold) {
    return currentRPI + 3
  } else {
    // Sliding scale between threshold and upper threshold
    const range = upperThreshold - threshold
    const excess = annualSalary - threshold
    const additionalRate = (excess / range) * 3
    return currentRPI + additionalRate
  }
}
