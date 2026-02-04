# Financial Simulation Scenario Logic Documentation

## Overview
This document explains how each ScenarioArchetype translates into cash flow and net wealth impacts in the financial simulation engine.

---

## Archetype Implementation Details

### 1. **ONE_OFF_EXPENSE** 
**Use Case:** Single expense event (e.g., wedding, car purchase that depreciates)

**Cash Flow Impact:**
- **Target Date:** Single negative cash flow of `-targetAmount` at the specified `targetDate`
- **Example:** £30,000 wedding → -£30,000 outflow in target month

**Net Wealth Impact:**
- **Immediate:** Decreases net wealth by `targetAmount` at target date
- **Long-term:** No asset created, pure wealth reduction

**Implementation:**
```typescript
// addOneOffExpenseCashFlow()
cashFlows.set(targetPeriod, -goal.targetAmount)  // One-time expense
// No account created - pure expense
```

---

### 2. **ACCUMULATION_LUMP**
**Use Case:** One-off investment or deposit (e.g., lump sum into ISA, inheritance invested)

**Cash Flow Impact:**
- **Target Date:** Single negative cash flow of `-targetAmount` at investment date
- **Example:** £10,000 investment → -£10,000 outflow when invested

**Net Wealth Impact:**
- **Immediate:** Net neutral (cash converted to investment)
- **Long-term:** Grows at `performance` rate (default 6% annual)
- Creates an investment account that compounds over time

**Implementation:**
```typescript
// addLumpInvestmentAccount()
cashFlows.set(period, -goal.targetAmount)  // Initial deposit outflow
account = new BalanceAccount({
  startingBalance: goal.targetAmount,
  performance: goal.performance ?? 6%  // Compounds monthly
})
```

---

### 3. **ACCUMULATION_RECURRING**
**Use Case:** Regular savings/contributions (e.g., monthly savings plan, regular pension top-ups)

**Cash Flow Impact:**
- **Duration:** Monthly outflows from `startDate` to `targetDate`
- **Monthly Amount:** `targetAmount / durationMonths` OR specified `monthlyContribution`
- **Example:** £12,000 goal over 12 months → -£1,000/month for 12 months

**Net Wealth Impact:**
- **Ongoing:** Builds wealth gradually through compounding contributions
- **Long-term:** Total accumulated = contributions + compound growth at `performance` rate (default 6%)

**Implementation:**
```typescript
// addRecurringAccumulationAccount()
monthlyContribution = goal.monthlyContribution ?? (goal.targetAmount / durationMonths)
account = new BalanceAccount({
  contribution: monthlyContribution,
  performance: goal.performance ?? 6%,
  contributionStopAfterPeriods: durationMonths  // Stops at target date
})
```

---

### 4. **ASSET_PURCHASE**
**Use Case:** Buying appreciating/depreciating assets (e.g., car, property, equipment)

**Cash Flow Impact:**
- **Target Date:** Single negative cash flow of `-targetAmount` at purchase date

**Net Wealth Impact:**
- **Immediate:** Net neutral (cash → asset)
- **Long-term:** Asset value changes at `performance` rate
  - Positive performance (e.g., +3%) = appreciating asset (property)
  - Negative performance (e.g., -10%) = depreciating asset (car)

**Implementation:**
```typescript
// addAssetPurchaseAccount()
cashFlows.set(period, -goal.targetAmount)  // Purchase outflow
account = new BalanceAccount({
  startingBalance: goal.targetAmount,
  performance: goal.performance ?? 2%  // Asset appreciation/depreciation
})
```

---

### 5. **DEBT_REDUCTION**
**Use Case:** Paying off debt or accelerating existing debt repayment

**Two Modes:**

#### Mode A: Debt Overpayment (linkedAccountName specified)
**Cash Flow Impact:**
- **Duration:** Monthly outflows from `startDate` for `duration` years
- **Monthly Amount:** `monthlyContribution` (extra payment beyond baseline)
- **Example:** £200/month extra mortgage payment → -£200/month

**Net Wealth Impact:**
- **Ongoing:** Reduces existing baseline debt faster
- **Long-term:** Saves on interest, improves net wealth

**Implementation:**
```typescript
// Tracked in debtOverpayments array, applied to existing baseline account
// Cash flow: -monthlyContribution per period
// Balance adjustment: +monthlyContribution to linked debt account (reduces negative balance)
```

#### Mode B: New Debt Paydown (no linkedAccountName)
**Cash Flow Impact:**
- **Duration:** Monthly debt payments from start to target date
- **Monthly Amount:** `targetAmount / durationMonths`

**Net Wealth Impact:**
- Creates a new debt account that decreases over time
- Interest charged at `performance` rate (negative for debt)

---

### 6. **SAFETY_NET**
**Use Case:** Building emergency fund or liquidity reserve

**Cash Flow Impact:**
- **Target Date:** Single negative cash flow of `-targetAmount` when funded

**Net Wealth Impact:**
- **Immediate:** Net neutral (cash → low-risk savings)
- **Long-term:** Minimal growth at `performance` rate (default 1% for safety)

**Implementation:**
```typescript
// addSafetyNetAccount()
cashFlows.set(period, -goal.targetAmount)
account = new BalanceAccount({
  startingBalance: goal.targetAmount,
  performance: goal.performance ?? 1%  // Low-risk, low-return
})
```

---

### 7. **RETIREMENT** (Pension Contributions)
**Use Case:** Extra pension contributions or pension top-ups

**Cash Flow Impact:**
- **Duration:** Monthly contributions from `startDate` for `duration` years
- **Monthly Amount:** `targetAmount / 12` (annualized)
- **Special Rule:** Stops at retirement age (no contributions post-retirement)

**Net Wealth Impact:**
- **Ongoing:** Builds pension pot with tax-advantaged growth
- **Long-term:** Compounds at `performance` rate (default 6%)

**Implementation:**
```typescript
// addRetirementAccount()
monthlyContribution = goal.targetAmount / 12
account = new BalanceAccount({
  contribution: monthlyContribution,
  performance: goal.performance ?? 6%,
  contributionStopAfterPeriods: (goal.duration ?? 30) * 12
})
// Runtime check: if isRetired, skip contribution flows
```

---

### 8. **INCOME_INVESTMENT**
**Use Case:** Spending that increases future earnings (e.g., education, business launch, professional certification)

**Cash Flow Impact:**
- **Target Date:** Single negative cash flow of `-targetAmount` (initial investment)
- **Future Income:** Positive monthly cash flows starting after `delayMonths`
- **Income Multiplier:** `incomeMultiplier * targetAmount / 12` monthly
- **Example:** £10,000 course → -£10,000 upfront, then +£300/month (3.6x annual return)

**Net Wealth Impact:**
- **Immediate:** Decrease by `targetAmount`
- **Long-term:** Positive if income gains outweigh initial cost

**Implementation:**
```typescript
// addIncomeInvestmentCashFlow()
cashFlows.set(period, -goal.targetAmount)  // Initial expense
// Then add positive monthly flows after delay
for (let p = period + delayMonths; p < periodsToProject; p++) {
  monthlyIncomeBoost = (goal.targetAmount * incomeMultiplier) / 12
  cashFlows.set(p, +monthlyIncomeBoost)  // Positive income
}
```

---

### 9. **RECURRING_EXPENSE**
**Use Case:** Ongoing financial commitments (e.g., childcare, subscription, lease)

**Cash Flow Impact:**
- **Duration:** Monthly outflows from `startDate` for `duration` years
- **Monthly Amount:** `targetAmount / 12` (annualized) OR specified `monthlyContribution`
- **Example:** £12,000/year childcare → -£1,000/month

**Net Wealth Impact:**
- **Ongoing:** Continuous wealth reduction
- **Long-term:** Total cost = `monthlyAmount * durationMonths`

**Implementation:**
```typescript
// addRecurringExpenseCashFlow()
monthlyExpense = goal.monthlyContribution ?? (goal.targetAmount / 12)
for (let period = startPeriod; period < endPeriod; period++) {
  cashFlows.set(period, -monthlyExpense)  // Negative expense flow
}
```

---

### 10. **CASH_FLOW_POSITIVE**
**Use Case:** Actions that improve monthly cash flow (e.g., salary increase, side income, expense reduction)

**Cash Flow Impact:**
- **Duration:** Monthly positive flows from `startDate` for `duration` years
- **Monthly Amount:** `targetAmount / 12` (annualized)
- **Special Rules:**
  - **Income boosts** (salary, side income): Stop at retirement age
  - **Expense reductions**: Continue in retirement

**Net Wealth Impact:**
- **Ongoing:** Increases monthly surplus → more funds for savings/investments
- **Long-term:** Compounding effect from increased contributions to accounts

**Implementation:**
```typescript
// addCashFlowPositiveCashFlow()
monthlyBoost = goal.targetAmount / 12
for (let period = startPeriod; period < endPeriod; period++) {
  // Runtime check: skip if income boost and post-retirement
  if (isCashFlowPositive && isRetired && isIncomeBoost) {
    continue  // Income stops at retirement
  }
  cashFlows.set(period, +monthlyBoost)  // Positive income
}
```

---

## Cash Flow Behavior Overrides

Goals can specify a `cashFlowBehavior` field to override archetype defaults:

### **'lump_sum_expense'**
- Single outflow at `targetDate`
- No account created
- Pure expense (reduces net worth permanently)

### **'sinking_expense'**
- Monthly outflows from `startDate` to `targetDate`
- Final spend at target date
- Example: Save £500/month for 12 months for £6,000 vacation

### **'asset'** (default)
- Follow archetype-specific account creation logic
- Investment/savings accounts with compounding

---

## Net Wealth Calculation

Net Wealth = **Total Assets** - **Total Debts**

### **Monthly Evolution:**
1. **Start Balance:** Account balance from previous month
2. **Compounding:** Balance × (1 + monthlyRate)
3. **Contributions:** Add scheduled contributions (pensions, savings)
4. **Allocator Adjustments:** Apply surplus/deficit flows
5. **End Balance:** New balance after all adjustments

### **Asset Categories:**
- **Pension** (6% growth, tax-advantaged)
- **Equities** (7% growth, market investments)
- **Emergency Buffer** (1% growth, liquidity)
- **Cash Savings** (0% growth, unallocated surplus)
- **Other Assets** (variable, physical assets)

### **Debt Categories:**
- Negative balances with interest charges
- Paid off when balance reaches £0

---

## Cash Flow Allocation Logic

### **Positive Cash Flow (Surplus):**
1. Fill **Emergency Buffer** to 6 months expenses
2. Allocate 10% to **Equities** (automated savings)
3. Allocate 5% to **Pension** (automated contributions)
4. Remainder to **Cash Savings** (0% account)

### **Negative Cash Flow (Deficit):**
**Pre-Retirement:**
1. Liquidate **Cash Savings** first
2. Liquidate **Current Account** next
3. Liquidate **Illiquid Assets** last (equities, pension)

**Post-Retirement:**
1. Withdraw from **Pension** first (tax-free allowance then marginal tax)
2. Liquidate **Cash Savings** if pension exhausted
3. Liquidate other assets as needed

---

## Examples

### **Example 1: Launch a New Business** (BUSINESS_LAUNCH)
- **Archetype:** ONE_OFF_EXPENSE
- **Config:** £30,000 startup capital, target date: July 2026
- **Cash Flow Impact:**
  - 2026 July: -£30,000 (one-time expense)
- **Net Wealth Impact:**
  - Immediate: -£30,000
  - Long-term: No asset created (pure expense)

### **Example 2: Regular Pension Contributions** (PENSION_TOP_UP)
- **Archetype:** RETIREMENT
- **Config:** £500/month for 30 years
- **Cash Flow Impact:**
  - Monthly: -£500 from start until retirement age
- **Net Wealth Impact:**
  - Builds pension pot at 6% annual growth
  - After 30 years: £500k+ (with compounding)

### **Example 3: Buy a Car** (BUYING_A_CAR)
- **Archetype:** ASSET_PURCHASE
- **Config:** £20,000, -10% annual depreciation
- **Cash Flow Impact:**
  - Purchase date: -£20,000
- **Net Wealth Impact:**
  - Year 0: £20,000 asset (net neutral)
  - Year 1: £18,000 (10% depreciation)
  - Year 5: £11,809 (compound depreciation)

### **Example 4: Education Course** (EDUCATION_TRAINING)
- **Archetype:** INCOME_INVESTMENT
- **Config:** £5,000 course, 3x income multiplier, 6 months delay
- **Cash Flow Impact:**
  - Course date: -£5,000
  - After 6 months: +£1,250/month (£15k/year boost)
- **Net Wealth Impact:**
  - Immediate: -£5,000
  - Break-even: Month 10 (5000 / 1250 = 4 months of income)
  - Long-term: Positive wealth from salary increase

---

## Special Runtime Rules

### **Retirement Transitions:**
1. **Income Changes:**
   - Salary stops at retirement age
   - State pension starts (£11,500/year default)
   - Private pension withdrawals begin

2. **Scenario Modifications:**
   - **Pension contributions** (RETIREMENT): Stop at retirement
   - **Salary increases** (CASH_FLOW_POSITIVE income): Stop at retirement
   - **Expense reductions** (CASH_FLOW_POSITIVE savings): Continue in retirement
   - **Side income**: Stops at retirement

### **Debt Payoff:**
- Contributions stop automatically when debt balance reaches £0
- No overpayment beyond full payoff

---

## Implementation Location

All scenario logic is implemented in:
- **File:** `sim-core/src/engine/goalSimulator.ts`
- **Methods:**
  - `createModifierAccounts()` - Main dispatcher (lines 1110-1194)
  - Individual archetype handlers (lines 1196-1500+)
  - Cash flow processing in `generateScenarioProjection()` (lines 670-1107)

---

## Configuration Schema Integration

Each goal type in the UI configuration dialogs maps to one of these archetypes:
- **Goals:** Use `targetAmount` interpretation (total amount needed)
- **Actions:** Often use `monthlyContribution` interpretation (monthly change)
- **Events:** Mix of one-off and recurring expenses

The simulation engine automatically converts UI inputs into the appropriate archetype parameters and processes them according to the logic documented above.
