import { z } from "zod";

export type Frequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly';

interface BalanceAccountOptions {
  startingBalance: number;
  performance?: number;
  contribution: number;
  frequency: Frequency;
  contributionStopAfterPeriods?: number;
  isDebt?: boolean;
  name?: string;
  metadata?: Record<string, any>;
}

const dbBalanceAccountScheme = z.object({
  name: z.string().optional(),
  provider: z.string().optional(),
  balance: z.number().optional(),
  type: z.enum(["currentAccount", "savingsAccount", "cashIsa", "ssIsa", "gia", "sipp", "privatePension", "workplacePensionDC", "workplacePensionDB", "statePension", "cryptocurrency", "creditCard", "personalLoan", "mortgage", "studentLoan", "overdraft", "other", "automobile", "art", "Jewelry", "real_estate", "electronics", "property"]).optional(),
  performance: z.number().optional(),
  frequency: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "yearly"]).optional(),
  contribution: z.number().optional(),
})

export type DbBalanceAccount = z.infer<typeof dbBalanceAccountScheme>

export class BalanceAccount {
  private startingBalance: number;
  private contribution: number;
  private ratePerPeriod: number;
  private frequency: Frequency = 'monthly';
  private contributionStopAfterPeriods?: number;
  private isDebt: boolean;
  private loanDuration?: number;
  private name?: string;
  public metadata?: Record<string, any>;

  constructor(options: BalanceAccountOptions) {
    this.frequency = options.frequency || "monthly";
    this.contributionStopAfterPeriods = options.contributionStopAfterPeriods;
    this.isDebt = options.isDebt ?? false;
    this.name = options.name;
    this.metadata = options.metadata;
    const periodsPerYear = this.getPeriodsPerYear(this.frequency);
    const totalAnnualRate = (options.performance ?? 0) / 100;
    
    // Use proper compound interest formula: monthlyRate = (1 + annualRate)^(1/12) - 1
    // This ensures compounding periodsPerYear times produces exactly the annual rate
    // Example: 7% annual → 0.565% monthly → (1.00565)^12 = 1.07 ✓
    // Old (wrong): 7% annual → 0.583% monthly → (1.00583)^12 = 1.0723 ✗
    this.ratePerPeriod = totalAnnualRate === 0 
      ? 0 
      : Math.pow(1 + totalAnnualRate, 1 / periodsPerYear) - 1;

    const debtMultiplier = this.isDebt ? -1 : 1;
    this.startingBalance = debtMultiplier * Math.abs(options.startingBalance);
    this.contribution = Math.abs(options.contribution);

    if (this.isDebt) {
      this.loanDuration = this.calculateLoanDuration();
    }
  }

  private getPeriodsPerYear(freq: Frequency): number {
    switch (freq) {
      case 'daily': return 365;
      case 'weekly': return 52;
      case 'fortnightly': return 26;
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'yearly': return 1;
    }
  }

  public netCashFlowAtPeriod(t: number): number {
    if (this.contributionStopAfterPeriods !== undefined && t >= this.contributionStopAfterPeriods) {
      return 0;
    }
    return this.isDebt ? -this.contribution : this.contribution;
  }

  public valueAtPeriod(t: number): number {
    if (this.isDebt) {
      if (this.loanDuration === undefined) {
        throw new Error("Loan duration should have been initialized.");
      }
      if (t >= this.loanDuration) return 0;
      return this.simulateDebtBalanceAt(t);
    } else {
      return this.simulateAssetValueAt(t);
    }
  }

  private simulateAssetValueAt(t: number): number {
    const r = this.ratePerPeriod;
    const PV = this.startingBalance;
    const PMT = this.contribution;
    const ts = this.contributionStopAfterPeriods ?? t;

    if (t <= ts) {
      if (r === 0) {
        return PV + PMT * t;
      }
      return PV * Math.pow(1 + r, t) + PMT * ((Math.pow(1 + r, t) - 1) / r);
    } else {
      let valueAtStop: number;
      if (r === 0) {
        valueAtStop = PV + PMT * ts;
      } else {
        valueAtStop = PV * Math.pow(1 + r, ts) + PMT * ((Math.pow(1 + r, ts) - 1) / r);
      }
      return valueAtStop * Math.pow(1 + r, t - ts);
    }
  }

  private simulateDebtBalanceAt(t: number): number {
    const r = this.ratePerPeriod;
    const PV = this.startingBalance;
    const PMT = this.contribution;

    let balance = PV;
    for (let i = 0; i < t; i++) {
      balance = balance * (1 + r) + PMT;
      if (balance >= 0) return 0;
    }

    return balance;
  }

  private calculateLoanDuration(): number {
    const r = this.ratePerPeriod;
    const PV = this.startingBalance;
    const PMT = this.contribution;

    // Allow zero payments for debts with payments handled externally (e.g., in expenses)
    if (PMT === 0) {
      return Infinity  // Debt never paid off through scheduled contributions
    }
    if (PMT < 0) {
      throw new Error("Payment must be non-negative for debts");
    }
    if (PV >= 0) {
      return 0;
    }
    if (r === 0) {
      return Math.ceil(-PV / -PMT);
    }

    const numerator = Math.log(1 + (PV * r / PMT));
    const denominator = Math.log(1 + r);

    if (numerator >= 0) {
      throw new Error("Payment is too small to pay off the debt");
    }

    return Math.ceil(-numerator / denominator);
  }

  public totalLoanDuration(): number {
    if (!this.isDebt) throw new Error("Only applicable to debt accounts.");
    return this.loanDuration!;
  }

  public getName(): string {
    return this.name || 'Account';
  }

  /**
   * Check if this account is an ISA (tax-advantaged wrapper)
   * Uses metadata if available, falls back to name-based heuristic for legacy accounts
   * @returns true if account is ISA-wrapped
   */
  public isISA(): boolean {
    // Primary: Check metadata for tax wrapper type
    if (this.metadata?.taxWrapper === 'isa') {
      return true
    }
    
    // Secondary: Check account type in metadata (from DB schema)
    if (this.metadata?.type === 'cashIsa' || this.metadata?.type === 'ssIsa') {
      return true
    }
    
    // Fallback: Name-based heuristic for legacy accounts without metadata
    const accountName = this.getName().toLowerCase()
    return accountName.includes('isa')
  }

  public getIsDebt(): boolean {
    return this.isDebt;
  }

  public getRatePerPeriod(): number {
    return this.ratePerPeriod;
  }

  public getStartingBalance(): number {
    return this.startingBalance;
  }

  public getContribution(): number {
    return this.contribution;
  }

  public getContributionStopPeriod(): number | undefined {
    return this.contributionStopAfterPeriods;
  }

  public getLoanDuration(): number | undefined {
    return this.loanDuration;
  }
}
