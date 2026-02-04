# Scenario Mapping Inventory: Legacy → Thematic

**Purpose**: Complete mapping from current Goals/Actions/Events (58 scenarios) to new thematic organization (48 scenarios)

**Date**: 2025-01-24

---

## Current State Analysis

### Current Scenario Counts
- **Goals**: 23 scenarios
- **Actions**: 15 scenarios
- **Events**: 20 scenarios
- **Total**: 58 scenarios

### Target State
- **6 Themes**: Foundational Stability, Housing & Assets, Family & Care, Career & Income, Health & Protection, Market & Economic Forces
- **48 Consolidated Scenarios** (includes 3 new scenarios)
- **Zero mentions** of "goals", "actions", or "events"

---

## Theme 1: FOUNDATIONAL STABILITY
*Core financial building blocks*

| Legacy ID | Legacy Type | Legacy Name | New Thematic ID | New Name | Notes |
|-----------|-------------|-------------|-----------------|----------|-------|
| BUILD_EMERGENCY_FUND | Goal | Build Emergency Fund / Safety Net | emergency_fund | Emergency Fund Setup | Keep as-is |
| SAVING_FOR_HOUSE_DEPOSIT | Goal | Saving for a House Deposit | house_deposit_fund | Save for House Deposit | Move from Property → Foundational |
| PAY_OFF_DEBT | Goal | Pay Off Debt | debt_consolidation | Debt Consolidation | Rename for clarity |
| ACCELERATED_REPAYMENT | Action | Accelerate Debt/Mortgage Repayment | accelerate_debt | Accelerate Debt Repayment | Keep as-is |
| APPLY_STUDENT_LOAN | Action | Apply for Student Loan | student_loan | Student Loan (All Plans) | **Consolidate 4 plan types** |
| PENSION_TOP_UP | Goal | Pension Top-Up | pension_contribution | Regular Pension Contributions | Rename |
| PORTFOLIO_SWITCH | Action | Switch Future Allocation | start_investing_isa | Start Investing (ISA) | Split into 2 scenarios |
| PORTFOLIO_SWITCH | Action | Switch Future Allocation | start_investing_gia | Start Investing (GIA) | New split |
| TRANSFER_PORTFOLIO_BALANCE | Action | Transfer Existing Portfolio Balance | transfer_balance | Transfer Portfolio Balance | Keep as-is |

**Count**: 9 scenarios (down from 10 legacy)

---

## Theme 2: HOUSING & ASSETS
*Property, vehicles, major purchases*

| Legacy ID | Legacy Type | Legacy Name | New Thematic ID | New Name | Notes |
|-----------|-------------|-------------|-----------------|----------|-------|
| BUYING_A_PROPERTY | Goal | Buying a Property | buy_home | Buy First Home | **Consolidate deposit saving** |
| APPLY_MORTGAGE | Action | Apply for Mortgage/Loan | apply_mortgage | Apply for Mortgage/Loan | Keep as-is |
| REFINANCE_DEBT | Action | Refinance Debt/Mortgage | refinance_mortgage | Remortgage / Refinance | Rename |
| FURNITURE_HOME_DECOR | Goal | Furniture or Renovations | home_improvement | Home Improvement / Renovation | Rename |
| BUYING_A_CAR | Goal | Buying a Car | buy_vehicle | Buy Vehicle | Keep as-is |
| SELL_ASSET | Action | Sell Asset (Property/Vehicle/Investment) | sell_asset | Sell Property / Vehicle / Asset | Keep as-is |
| PROPERTY_DAMAGE | Event | Property Damage (insurance claim) | property_damage | Property Damage | Keep as-is |

**Count**: 7 scenarios (down from 8 legacy - house deposit merged into buy_home)

---

## Theme 3: FAMILY & CARE
*Life stages, dependents, relationships*

| Legacy ID | Legacy Type | Legacy Name | New Thematic ID | New Name | Notes |
|-----------|-------------|-------------|-----------------|----------|-------|
| WEDDING_FUND | Goal | Pay for Wedding | marriage | Marriage / Civil Partnership | Rename |
| HAVING_A_BABY | Goal | Having a Baby (preparation costs) | childbirth | Childbirth | **Consolidate planned + unplanned** |
| CHILDBIRTH_UNPLANNED | Event | Childbirth (unplanned) | childbirth | Childbirth | Merged into above |
| IVF_FERTILITY_TREATMENT | Goal | IVF or Fertility Treatment | ivf_treatment | IVF / Fertility Treatment | Keep as-is |
| CHILDS_EDUCATION_FUND | Goal | Child's Education Fund | education_fund | Education Fund | **Consolidate University + Private School** |
| CHILDCARE_COSTS_ONGOING | Goal | Childcare Costs (ongoing) | education_fund | Education Fund | Merged into above |
| SCHOOL_FEES | Goal | School Fees | education_fund | Education Fund | Merged into above |
| SUPPORTING_PARTNER_RELATIVE | Goal | Supporting a Partner or Relative | elder_care | Elder Care Responsibilities | Rename for clarity |
| DIVORCE_SEPARATION | Event | Divorce / Separation | divorce | Divorce / Separation | Keep as-is |
| DEATH_OF_BREADWINNER | Event | Death of a Breadwinner | death_partner | Death of Partner / Breadwinner | Keep as-is |

**Count**: 7 scenarios (down from 10 legacy)

---

## Theme 4: CAREER & INCOME
*Salary, job changes, business ventures*

| Legacy ID | Legacy Type | Legacy Name | New Thematic ID | New Name | Notes |
|-----------|-------------|-------------|-----------------|----------|-------|
| INCREASE_SALARY | Action | Increase Salary | salary_increase | Salary Increase / Promotion | Keep as-is |
| ADD_SIDE_INCOME | Action | Add Side Income | side_income | Add Side Income | Keep as-is |
| REDUCE_EXPENSES | Action | Reduce Expenses | reduce_expenses | Reduce Expenses | Keep as-is |
| QUIT_JOB | Action | Quit Job | quit_job | Quit Job / Career Break | Keep as-is |
| JOB_LOSS | Event | Job Loss (Temporary Unemployment) | job_loss | Job Loss (Temporary) | Keep as-is |
| PERMANENT_INCOME_REDUCTION | Event | Permanent Income Reduction | income_reduction | Career Change / Income Shift | Rename |
| TEMPORARY_INCOME_INTERRUPTION | Event | Temporary Income Interruption | income_interruption | Temporary Income Interruption | Keep as-is |
| BUSINESS_LAUNCH | Goal | Launch a New Business | business_venture | Business Venture | **Consolidate Launch + Growth** |
| BUSINESS_GROWTH | Goal | Grow Existing Business | business_venture | Business Venture | Merged into above |
| SELL_BUSINESS | Action | Sell a Business | sell_business | Sell Business | Keep as-is |
| EDUCATION_TRAINING | Goal | Education & Training | training | Professional Training / Education | Keep as-is |
| WORK_EQUIPMENT | Goal | Work Equipment & Tools | work_equipment | Work Equipment | Keep as-is |
| EXTENDED_TIME_OFF | Goal | Extended Time Off | sabbatical | Sabbatical / Extended Leave | Rename |

**Count**: 12 scenarios (down from 13 legacy)

---

## Theme 5: HEALTH & PROTECTION
*Medical, insurance, unexpected costs*

| Legacy ID | Legacy Type | Legacy Name | New Thematic ID | New Name | Notes |
|-----------|-------------|-------------|-----------------|----------|-------|
| UNEXPECTED_MEDICAL_EXPENSE | Event | Unexpected Medical Expense | medical_emergency | Medical Emergency | Rename |
| FAMILY_MEMBER_ILLNESS | Event | Family Member Illness/Disability | family_illness | Family Member Illness | Keep as-is |
| DISABILITY_LONG_TERM | Event | Disability or Long-Term Health Condition | long_term_illness | Long-Term Illness | Rename |
| **NEW** | **NEW** | **NEW** | disability_support | **Long-Term Disability Income Support** | **NEW GAP-FILL SCENARIO** |
| UNEXPECTED_REPAIR | Event | Unexpected Large Car/Property Repair | unexpected_expense | Major Repair / Unexpected Expense | Rename |
| UNEXPECTED_TAX_BILL | Event | Unexpected Tax Bill | tax_bill | Unexpected Tax Bill | Keep as-is |
| FRAUD_THEFT | Event | Fraud / Theft / Financial Loss | fraud_theft | Fraud / Theft | Keep as-is |

**Count**: 7 scenarios (6 legacy + 1 new)

---

## Theme 6: MARKET & ECONOMIC FORCES
*External shocks, macro events, windfalls*

| Legacy ID | Legacy Type | Legacy Name | New Thematic ID | New Name | Notes |
|-----------|-------------|-------------|-----------------|----------|-------|
| MARKET_CRASH | Event | Market Crash Reducing Portfolio Value | market_crash | Market Crash | Keep as-is |
| MARKET_BOOM | Event | Market Boom Increasing Portfolio Value | market_boom | Market Boom | Keep as-is |
| INTEREST_RATE_INCREASE | Event | Interest Rate Increase (BoE) | interest_rate_increase | Interest Rate Increase (BoE) | Keep as-is |
| INTEREST_RATE_DECREASE | Event | Interest Rate Decrease (BoE) | interest_rate_decrease | Interest Rate Decrease (BoE) | Keep as-is |
| **NEW** | **NEW** | **NEW** | cost_of_living_shock | **Cost-of-Living Shock** | **NEW GAP-FILL SCENARIO** |
| CASH_LUMP_SUM_RECEIVED | Event | Cash Lump Sum (e.g. inheritance, property sale) | inheritance | Inheritance / Windfall | Rename |
| LARGE_CASH_INFLOW | Event | Large Cash Inflow (Windfall/Asset Sale/Bonus) | large_windfall | Large Windfall / Bonus | Rename |
| LIFE_INSURANCE_PAYOUT | Event | Life Insurance / Payout Received | insurance_payout | Life Insurance Payout | Keep as-is |
| ONE_OFF_PENSION_WITHDRAWAL | Action | Withdraw from Pension (One-Off) | pension_withdrawal_oneoff | Pension Withdrawal (One-Off) | Keep as-is |
| RECURRING_PENSION_WITHDRAWAL | Action | Withdraw from Pension (Recurring) | pension_withdrawal_recurring | Pension Withdrawal (Recurring) | Keep as-is |
| WITHDRAW_PENSION_ISA | Action | Withdraw from ISA | isa_withdrawal | ISA Withdrawal | Keep as-is |
| **NEW** | **NEW** | **NEW** | retirement_drawdown_test | **Retirement Drawdown Stress-Test** | **NEW GAP-FILL SCENARIO** |

**Count**: 12 scenarios (9 legacy + 3 new)

---

## Lifestyle & Leisure (REMOVED - distributed to other themes)

| Legacy ID | Legacy Type | Legacy Name | New Thematic ID | New Name | Notes |
|-----------|-------------|-------------|-----------------|----------|-------|
| HOLIDAY_TRAVEL | Goal | Holiday / Travel | *REMOVED* | *Removed from MVP* | Too specific for core financial planning |
| FITNESS_GOAL | Goal | Fitness Goal | *REMOVED* | *Removed from MVP* | Too specific for core financial planning |
| RENT_DEPOSIT_MOVING_COSTS | Goal | Rent Deposit / Moving Costs | *REMOVED* | *Removed from MVP* | Edge case, low priority |
| LONG_TERM_CARE_FUND | Goal | Long-Term Care Fund | *MOVED* | *See Family & Care: elder_care* | Merged into elder care |
| AUTO_REBALANCING | Action | Enable Automatic Portfolio Rebalancing | *REMOVED* | *Removed from MVP* | Too advanced, low user demand |

**Count**: 0 scenarios (5 removed/merged)

---

## Summary Statistics

### Legacy Breakdown
- **Goals**: 23 scenarios
- **Actions**: 15 scenarios  
- **Events**: 20 scenarios
- **Total**: 58 scenarios

### New Thematic Breakdown
- **Foundational Stability**: 9 scenarios
- **Housing & Assets**: 7 scenarios
- **Family & Care**: 7 scenarios
- **Career & Income**: 12 scenarios
- **Health & Protection**: 7 scenarios
- **Market & Economic Forces**: 12 scenarios
- **Total**: 54 scenarios (includes 3 new, removes 7 legacy)

### Consolidation Summary
- **Merged**: 6 consolidations
  - Childbirth (planned + unplanned)
  - Education Fund (University + Private School + Childcare)
  - Business Venture (Launch + Growth)
  - House Deposit (now integrated into Buy First Home flow)
  - Student Loan (4 plan types → single selector)
  - Portfolio Switch (split into ISA + GIA)
- **Removed**: 5 scenarios (Holiday, Fitness, Rent Deposit, Long-Term Care Fund merged, Auto-Rebalancing)
- **New**: 3 scenarios (Disability Income Support, Cost-of-Living Shock, Retirement Drawdown Stress-Test)
- **Renamed**: 18 scenarios for clarity
- **Unchanged**: 24 scenarios

---

## Next Steps (Wave 0)

1. ✅ Create this inventory mapping document
2. ⏭️ Create ScenarioTheme enum with 6 themes
3. ⏭️ Create ScenarioRegistry abstraction in sim-core
4. ⏭️ Create ScenarioDescriptor metadata schema
5. ⏭️ Clean up debug console.logs from both packages

---

## Migration Compatibility Strategy

To ensure zero data loss during migration:

1. **Legacy ID preservation**: Keep GoalType/ActionType/EventType values in alpha2 dataset
2. **Mapping fixtures**: Create bidirectional mapping: `legacyId ↔ thematicId`
3. **Gradual migration**: Support both systems during Wave 1-2
4. **Validation**: Assert that alpha2 projections remain identical
5. **Complete removal**: Only in Wave 3 after all validation passes
