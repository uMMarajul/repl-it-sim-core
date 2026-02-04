# Walkthrough - Refining Chat Behavior & Feasibility Engine

## Overview
This work stream focused on improving the conversational flow of the AI agent and making the "Feasibility Checks" more realistic by distinguishing between **Total Insolvency** (Bankrupt) and **Liquidity Shortfalls** (Cash poor, asset rich).

## Changes

### 1. Chat Flow Refinements
- **Problem**: Agent was causing conversation "interruption" by opening configuration dialogs too early (e.g., asking for clarifying questions but triggering tool calls simultaneously).
- **Fix**: Updated `agent_service.py` regex fallback logic to respect the AI's intent to ask questions (checking for `?` explicitly).

### 2. Feasibility Engine Upgrade (Liquidity vs. Solvency)
- **Problem**: Users were not warned about affordability if they had high Net Worth (e.g., House Equity) but no Cash for an immediate expense.
- **Solution**:
  - **Updated `SolvencyAnalysis`**: Added tracking for `maxCashShortfall` (negative cash balance), `availableLiquidity` (ISA/GIA value), and `requiredLiquidation`.
  - **Updated `ScenarioSimulator`**: Enabled "implicit overdrafts" (negative balances) on asset accounts to allow the system to calculate exact cash deficits.
  - **Fixed `CashFlowAllocator`**: Allowed `CURRENT_ACCOUNT` and `DEFAULT_SAVINGS` to be liquidated into overdraft to track shortfalls (previously skipped if balance was 0).
  - **Refined `ChatAssistant`**: Implemented a 3-tier warning system:
    1.  **Impossible**: Net Worth < 0.
    2.  **Liquidity Shortfall (Solvable)**: Recommend liquidating £X from Investments.
    3.  **Liquidity Shortfall (Illiquid)**: Warn that cash is low and liquid assets are insufficient.

### 3. Verification
- Validated that `marriage` scenario correctly triggers as a `ONE_OFF_EXPENSE`.
- Verified that "implicit overdrafts" are enabled to track shortfalls correctly.
- Confirmed `alpha2` profile now initializes with a Cash Savings account to allow expense deduction.

### 4. Deep Dive: The "Silent Failure" Bug
- **Symptom**: Even with the engine fixes, the £290k wedding expense showed **zero impact** on the Net Worth chart.
- **Root Cause**: The frontend (`useSimulation.ts`) was normalizing `totalBudget` -> `targetAmount` correctly, but **FAILED to map `weddingDate` to `targetDate`**.
  - The Simulation Engine purely relies on `targetDate` or `startDate`.
  - Because `weddingDate` was ignored, the engine received `undefined` for the date, causing the expense to be scheduled at an invalid time (NaN) and effectively dropped.
- **Fix**: Updated `normalizeModifier` in `useSimulation.ts` to map all scenario-specific date fields (`weddingDate`, `purchaseDate`, `saleDate`, etc.) to the engine's required `targetDate` or `startDate`.

### 5. Deep Dive: The "Hidden Debt" Bug
- **Symptom**: Engine was allowing overdrafts, but `calculateSolvency` ignored them.
- **Root Cause**: When a "Cash Savings" account drops below £0, the simulator reclassifies it into `debtCategories` (as a Liability) rather than keeping it in `assetCategories` (as a negative Asset).
- **Impact**: `calculateSolvency` was only scanning `assetCategories` for shortfalls, so it saw "valid debt" instead of "missing cash".
-    *   **Crucial Fix:** Modified `calculateSolvency` (in `ScenarioSimulator.ts`) to inspect `debtCategories` in addition to `assetCategories`. This addresses the "Hidden Debt" bug where negative cash balances were misclassified as liabilities, preventing `calculateSolvency` from detecting them as cash shortfalls.
    *   **Frontend Fix:** Updated `ChatAssistant.tsx` to correctly detect liquidity shortfalls by checking if `maxCashShortfall > 0` (as the engine returns the absolute magnitude of the shortfall). Validated that checking `< 0` caused the warning to fail.
- **UI Fixes**: 
    *   **Persistent Chips:** Modified `ChatAssistant.tsx` and `ChatAssistant.css` to prevent suggestion chips from disappearing. Implemented a "Compact Mode" that keeps them accessible but unobtrusive during conversation.
    *   **Data Consistency:** Fixed issue where chat dates/amounts weren't filling config windows. Added normalization in `ConfigDialog.tsx` to handle string inputs and updated `api/prompts.py` to enforce standardized ISO date and numeric formats.
    *   **Crash Fix:** Mitigated a critical crash in `ConfigDialog.tsx` by filtering out invalid Date objects before rendering (preventing `toISOString` errors) and ensuring `onChange` only propagates valid dates.
    *   **Mapping Fix:** Updated `api/agent_service.py` to explicitly map generic AI outputs (e.g., "amount", "cost", "date") to scenario-specific keys (e.g., "totalBudget", "weddingDate") for *Wedding* and *Buy Home* scenarios, ensuring values like "290k" correctly populate the form.
    *   **Time Awareness:** Modifed `api/agent_service.py` to inject the real-time server date (e.g., "2026-01-19") into the AI's context. This stops the AI from guessing "2023" when you say "now".
    *   **Collapsible Suggestions:** Updated `ChatAssistant.tsx` and `.css` to minimize suggestion chips while chatting. A small "💡 Show Suggestions" toggle allows you to pull them back up whenever needed, keeping the chat interface clean.
    *   **Duplicate Message Fix:** Hardened `ConfigDialog.tsx` by explicitly setting button types to avoid accidental triggers. This stops the "Net Worth Impact" success message from popping up when you simply close the window without saving.
    *   **Accurate Analysis:** Refactored `ChatAssistant.tsx` to wait for the simulation to *finish* calculating before showing you the impact graph. This fixes the "0 change" bug where the graph appeared too early.
        *   *Technical Detail:* Added a `simulationTimestamp` signal to the calculation engine to explicitly notify the UI when new numbers are ready, ensuring we never show stale data.
    *   **Responsive Config Window:** Updates the "Configuration" dialog to live *inside* the chat window rather than floating over the whole page. It now scales perfectly with the chat assistant, keeping your workspace tidy.
