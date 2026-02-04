## Overview
**sim-core** is a lightweight financial simulation engine built in TypeScript, designed to generate monthly financial projections up to age 100. It offers comprehensive scenario modeling for financial planning, providing accurate cash flow and net wealth calculations. Its primary purpose is to serve as a robust financial sandbox for exploring various long-term UK-specific financial strategies.

**Current Status (2025-11-24)**: 
- Wave 1 COMPLETE: sim-core registry with 54 scenarios across 6 themes
- Wave 2 COMPLETE: Registry-driven UI with full scenario metadata
- **Wave 3 COMPLETE**: Full migration from legacy Goals/Actions/Events to thematic ScenarioId architecture
  - **Phase 1**: Legacy infrastructure removed from sim-core (5 schema files deleted, compatibility stubs added)
  - **Phase 2**: UI migrated to thematic IDs (simplifiedTemplates, scenarioDefinitions, configTransformers)
  - **Phase 3**: All 54 transformers migrated to thematic ScenarioId keys with proper sign conventions and validation
  - **Phase 4**: Temporary compatibility stubs removed, builds verified, runtime testing complete
  - **Phase 5 COMPLETE**: Final cleanup verified by architect
    - Deleted legacy enum file (scenarios.ts with GoalType/ActionType/EventType)
    - Deleted migration docs (migration-plan.md, FULL_MIGRATION_PLAN.md)
    - Deleted scripts/ directory (13 test/inspection files)
    - Fixed all app-ui imports (removed GoalType references)
    - Fixed transformer IDs: transformPortfolioSwitch, transformTransferPortfolioBalance now use thematic scenarioIds
    - Deleted orphaned transformAutoRebalancing (no registry mapping)
    - All transformers now emit complete scenarioId/id/name triples matching registry
    - Zero legacy enum references remain anywhere in codebase
  - **Migration Complete**: Zero legacy dependencies. All scenario IDs, transformers, and registry use thematic architecture exclusively
  - **Template Coverage**: 53/54 scenarios have simplified templates (98%). Only long_term_illness lacks template (optional, transformer works correctly)

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Thematic Scenario Organization (Wave 1 COMPLETE)
- **New Registry System**: `ScenarioRegistry` fully populated with all 54 scenarios across 6 user-centric themes (Wave 1.1)
- **6 Themes**: Foundational Stability (9), Housing & Assets (7), Family & Care (7), Career & Income (12), Health & Protection (7), Market & Economic Forces (12)
- **54 Total Scenarios**: Down from 58 legacy (6 consolidations, 3 new scenarios added, 7 removed/merged)
- **Metadata Schema**: `ScenarioDescriptor` with display names, descriptions, archetypes, tags, guidance text, and legacy ID mappings
- **Migration Complete (Wave 3)**: All legacy compatibility code removed. System uses thematic ScenarioId exclusively throughout.
- **Registry Location**: `sim-core/src/config/scenarioRegistryData.ts` (54 descriptors), `sim-core/src/config/scenarioRegistry.ts` (infrastructure), `sim-core/src/config/scenarioTypes.ts` (enums only, circular dependency prevention)
- **Validation**: Alpha2 test dataset preserved with verified bidirectional mapping and identical projections (Wave 1.4-1.5)
- **Circular Dependency Prevention**: ScenarioTheme and ScenarioId enums isolated in scenarioTypes.ts to prevent registry↔data import cycles. Future enum additions must go through scenarioTypes.ts only.

### Core Simulation Engine (sim-core)
- **Type**: Standalone Node.js package written in TypeScript 5, with zero UI dependencies.
- **Financial Modeling**: Monthly projections until age 100, including net wealth and category breakdowns, utilizing a `BalanceAccount` class for asset and debt projections with compound interest.
- **Scenario Modeling**: `ScenarioSimulator` supports dual-projection (baseline vs. scenarios) with a composable archetype system for 10 financial archetypes, 22 goal types, 15 actions, and 20 events (57 total scenarios). Cash flow semantics: `ONE_OFF_INFLOW` creates positive cash flow (money coming IN like lottery, inheritance, loan proceeds, pension withdrawals), while `ONE_OFF_EXPENSE` creates negative cash flow (money going OUT).
- **Discriminated Union Architecture (Wave 1.2)**: `ScenarioModifier` uses discriminated union with three variants: `TargetedModifier` (cash-flow scenarios with `targetAmount`/`targetDate`), `ConfigModifier` (allocation/rate changes without targets), and `StudentLoanModifier` (special case using `assumptions.loanAmount`/`interestRate`). Type guards `isTargetedModifier()`, `isConfigModifier()`, `isStudentLoanModifier()` enable type-safe access to archetype-specific fields. Archetype contracts split into `TargetedArchetypeParams` vs `BaseArchetypeParams`. Eliminates dummy placeholder values for config archetypes.
- **Allocation Architecture**: Scheduled contributions and automated allocations are additive. Profiles can configure custom automated allocation percentages via `allocationConfig` (e.g., 75% equities, 5% pension); profiles without custom config use defaults (10% equities, 5% pension, remainder to Cash Savings). Automated allocations correctly reuse existing pension accounts.
- **Cash Flow Logic**: Features user-configurable automated allocation with merge-based allocation, priority-based savings goal allocation, and a structured liquidation order for negative flow. Surplus Cash is tracked internally. Allocation Normalization caps total percentages at 100% with proportional scaling. Debt overpayments are treated as transfers from surplus cash, not expenses, and only execute when surplus cash is available. **ISA Overflow Routing**: When ISA contributions exceed the £20k annual limit, overflow is intelligently routed based on user allocation preferences. If `defaultSavings` is explicitly set to 0%, overflow routes to the first available non-ISA asset class with positive allocation (GENERAL_INVESTMENT → HYSA → PENSION priority), falling back to GENERAL_INVESTMENT even if 0% (prevents unwanted Cash Savings contributions). Otherwise, overflow routes to DEFAULT_SAVINGS (backward-compatible default).
- **UK-Specific Rules**: Integrates income tax, National Insurance (NI), pension withdrawal, State pension, ISA tax exemption, and Capital Gains Tax (CGT) calculations. Includes UK student loan implementation with income-contingent repayment infrastructure (Plan 1/2/4/5 logic). **ISA Contribution Limits**: Strict enforcement of UK ISA annual contribution limit (£20,000 per tax year, April-March). Uses shared ISA tracker coordinating both scheduled account contributions and automated cash flow allocations. All AccountWrapper creation paths use metadata-driven `isISA()` accessor to correctly identify ISA accounts regardless of naming conventions. ISA overflow intelligently routes to alternative asset classes based on allocation preferences.
- **Multi-Modifier Architecture**: Scenarios can return explicit arrays of modifiers with a shared `scenarioId` for grouping.
- **Unified Savings Goal System**: Priority-based allocation with an `HYSA` asset class, supporting various funds (Emergency, Education, House Deposit) including automatic top-up/replenishment at HYSA rates (~4.5%).
- **Asset Class System**: Seven distinct asset classes for allocation and tracking: `CURRENT_ACCOUNT`, `HYSA`, `GENERAL_INVESTMENT` (GIA), `EQUITIES` (ISA), `PENSION`, `OTHER_ASSETS`, `DEFAULT_SAVINGS`, and `BUSINESS_EQUITY`.
- **Account Registry Mapping**: Accounts are auto-classified by name patterns to corresponding asset classes.
- **Liquidation Order**: `CURRENT_ACCOUNT` → `DEFAULT_SAVINGS` → `HYSA` → `GENERAL_INVESTMENT` → `EQUITIES` → `PENSION` → `BUSINESS_EQUITY` → `OTHER_ASSETS`.
- **Loan System**: Supports dynamic debt creation (`NEW_DEBT` archetype) for mortgages, car loans, and personal loans with standard amortization, interest accrual, and automatic payment termination. Loan disbursements use `ONE_OFF_INFLOW` archetype to create positive cash flow when funds are received. Features include "Refinance Debt/Mortgage" (`INTEREST_RATE_CHANGE` archetype) to modify interest rates and "Accelerate Debt/Mortgage Repayment" for overpayments.
- **Business Lifecycle Modeling**: Includes "Launch Business", "Grow Business", and "Sell a Business" actions. Business equity is tracked and appreciates, with sales correctly applying UK Capital Gains Tax.
- **Job Actions**: "Quit Job" stops salary and pension contributions by setting `salaryIncome = 0` from the quit date.
- **Unified Withdrawal System**: Consolidated 3 separate withdrawal scenarios into 2 unified actions with account type selector (Pension/ISA). Both "Withdraw from Pension/ISA (One-Off)" and "Withdraw from Pension/ISA (Recurring)" support both account types. Default start date is age 67 (UK state pension age). **Pension withdrawals**: Proper UK lifetime allowance tracking implemented - 25% of total pension pot at FIRST ACCESS is tax-free (capped at £268,275), shared across ALL withdrawals. Uses lazy initialization: pension state initialized on first withdrawal with actual balance at that time. Transformers create `pensionWithdrawalRequest` modifiers that route through `executePensionWithdrawalGross()` for accurate gross-to-net conversion with marginal tax rates. ISA withdrawals are 100% tax-free. Legacy WITHDRAW_PENSION_ISA scenarios automatically migrate to unified transformer. Recommended pattern: Take 25% tax-free lump sum first (one-off), then recurring drawdown (fully taxed).
- **Asset Sales**: "Sell Asset" action (`SELL_ASSET`) uses `ONE_OFF_INFLOW` archetype to represent cash received from selling property, vehicles, investments, or collectibles. Simplified template includes sale date, expected sale proceeds (user-provided net amount), and asset type selector (property/vehicle/investment/collectible). Transformer creates a single one-off positive cash inflow that integrates with automated allocation system. User should consider CGT implications when entering sale proceeds. Cash received is allocated according to user's configured allocation percentages (e.g., flows to ISA, pension, or savings based on profile settings).

### Development Console UI (app-ui)
- **Purpose**: An interactive Vite + React + TypeScript workspace for testing and visualizing `sim-core` projections.
- **Features**: Three-column layout for controls, charts, and scenario exploration. Interactive charts (Cash Flow, Attribution, Net Wealth, Account Contributions) powered by Recharts. Instant toggle templates are provided for common actions like applying a mortgage or student loan.
- **Multi-Pension Plan Management**: Supports `employer_match`, `salary_sacrifice`, and `personal_sipp` plans with integrated UK tax treatment and annual allowance tracking.
- **Direct ScenarioModifier Architecture**: All transformers directly return `ScenarioModifier`.
- **ConfigDialog Component**: Dynamic form renderer with validation and conditional display, mapping account types to asset classes.
- **Account Contributions Chart**: Displays destination accounts, showing allocation flow and ensuring total contributions equal Net Cash Flow.
- **Net Wealth Chart**: Displays individual account balances by name with asset/debt categorization, showing specific annual return rates and balance evolution.

## External Dependencies

### sim-core NPM Packages
- **Runtime**: `date-fns`, `zod`.
- **Development**: `typescript`, `@types/node`, `ts-node`.

### Dev Console UI Dependencies
- React 18
- Recharts
- date-fns
- sirv-cli