# Financial Simulation Engine (sim-core)

A pure TypeScript financial modeling and projection engine designed for UK-specific 70-year monthly projections with comprehensive scenario modeling.

## Features

- **70-Year Monthly Projections** - Simulate financial trajectories with monthly granularity
- **Scenario Modeling** - 44 goals, 14 actions, and 3 events with archetype-driven templates
- **UK-Specific Rules** - Pension withdrawal logic, ISA limits, tax calculations, state pension
- **Cash Flow Management** - Automated allocation and liquidation with asset class priorities
- **Compound Interest** - Accurate compounding across multiple contribution frequencies
- **Retirement Logic** - Age-gated pension access, tax-free allowances, marginal income tax

## Installation

```bash
cd sim-core
npm install
```

## Quick Start

### CLI Demo

```bash
npm run dev
```

### Programmatic Usage

```typescript
import { ScenarioSimulator, BalanceAccount, AssetClass, ContributionFrequency } from '@financial-sandbox/sim-core'

const baseline = {
  accounts: [
    new BalanceAccount({
      name: 'Pension',
      assetClass: AssetClass.PENSION,
      initialBalance: 50000,
      contributionAmount: 500,
      contributionFrequency: ContributionFrequency.MONTHLY,
      growthRate: 6.0,
      isDebt: false
    })
  ],
  monthlyIncome: 3500,
  monthlyExpenses: 2500,
  currentAge: 30,
  retirementAge: 65
}

const simulator = new ScenarioSimulator({ baseline, modifiers: [] }, 40)
const projection = simulator.generateBaselineProjection()

console.log('Net Worth at Year 10:', projection[10 * 12].netWorth)
```

## Architecture

```
sim-core/
├── src/
│   ├── engine/          # Core simulation engine
│   │   ├── balanceAccount.ts       # Account projection logic
│   │   ├── cashFlowAllocator.ts    # Cash flow allocation/liquidation
│   │   ├── goalSimulator.ts        # Main simulation orchestrator
│   │   ├── yearlyAggregator.ts     # Monthly → yearly aggregation
│   │   └── ukTaxCalculator.ts      # UK tax calculations
│   ├── config/          # Financial models and templates
│   │   ├── goalDefinitions.ts      # 44 goal definitions
│   │   ├── archetypeFieldTemplates.ts  # Template system
│   │   ├── actionEventFields.ts    # Action/event configs
│   │   └── ukFinancialConstants.ts # UK-specific parameters
│   ├── models/          # TypeScript types
│   └── utils/           # Helper functions
├── tests/               # Test scenarios
└── dist/                # Compiled output
```

## Core Concepts

### BalanceAccount
Represents a single financial account (asset or debt) with compounding growth/interest.

### ScenarioSimulator
Main orchestrator that runs 70-year projections with baseline and modifier scenarios.

### ScenarioModifier (Goal/Action/Event)
Represents a financial scenario change (e.g., "Buy a house", "Get a raise", "Inheritance").

### Archetype System
Template-driven configuration system that standardizes field definitions across 61 scenario types.

## Building

```bash
npm run build
```

Output: `dist/` directory with compiled JavaScript and type definitions.

## Dependencies

- **date-fns** - Date manipulation
- **zod** - Runtime validation
- **typescript** - Language and compiler
- **ts-node** - TypeScript execution

Total: ~5 dependencies (vs. 60+ in the full web app)

## Performance

- **Bundle Size**: ~500KB (vs. ~15MB web app)
- **Projection Speed**: ~50-100ms for 70-year monthly projection
- **Memory**: Low overhead, pure computation

## License

MIT
