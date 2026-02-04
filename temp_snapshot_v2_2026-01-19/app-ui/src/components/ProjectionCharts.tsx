import { BarChart, Bar, Line, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useSimulation } from '../hooks/useSimulation'
import type { ChartDataPoint } from '../hooks/useSimulation'
import { useMemo } from 'react'

// Color palette for scenario bars - one color per scenario regardless of sign
const SCENARIO_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#0ea5e9', // Sky blue
  '#a855f7', // Violet
  '#22c55e', // Green
  '#f97316', // Orange
  '#ec4899', // Pink
]

// Shared helper for account color mapping
// Color scheme by asset class:
// - Gray tones: Cash/checking (0% growth)
// - Cyan: HYSA savings goals (4.5%)
// - Indigo: ISA tax-free equities (7%)
// - Amber: GIA taxable investments (7%)
// - Purple: Pensions (6%)
// - Red: Debt/mortgages
function getAccountColor(name: string): string {
  if (name.includes('Cash Savings')) return '#64748b'  // Gray - 0% cash
  if (name.includes('Current Account')) return '#94a3b8'  // Light gray - 0% checking
  if (name.includes('HYSA')) return '#06b6d4'  // Cyan - 4.5% HYSA savings goals
  if (name.includes('General Investment')) return '#f59e0b'  // Amber - 7% GIA (taxable)
  if (name.includes('Automated Savings')) return '#f59e0b'  // Amber - GIA
  if (name.includes('Private ISA')) return '#6366f1'  // Indigo - 7% ISA (tax-free)
  if (name.includes('ISA')) return '#6366f1'  // Indigo - ISA tax wrapper
  if (name.includes('Workplace Pension')) return '#8b5cf6'  // Purple - 6% pension
  if (name.includes('Aviva SIPP')) return '#a78bfa'  // Light purple - SIPP
  if (name.includes('Pension Contributions')) return '#8b5cf6'  // Purple - pension
  if (name.includes('Mortgage')) return '#ef4444'  // Red - debt
  // Deterministic fallback based on name hash
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return `hsl(${(hash * 137.5) % 360}, 70%, 60%)`
}

// Custom tooltip for Cash Flow chart with income/expense breakdown
function CashFlowTooltip({ active, payload, activeScenarios }: any) {
  if (!active || !payload || !payload.length) return null
  
  const data = payload[0].payload as ChartDataPoint
  const scenarioDelta = data.scenarioDeltaBar || 0
  const hasScenarioImpact = Math.abs(scenarioDelta) > 0.01 || (activeScenarios && activeScenarios.length > 0)
  
  // Check if this is a retirement year (has pension income)
  const isRetirement = (data.statePensionIncome || 0) > 0 || (data.privatePensionIncome || 0) > 0
  const totalPensionIncome = (data.statePensionIncome || 0) + (data.privatePensionIncome || 0)
  
  // Calculate baseline expenses from the data
  const baselineExpenses = data.baselineExpenses || 0
  
  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '12px',
      color: '#e2e8f0'
    }}>
      <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        {data.yearLabel} ({data.actualYear}) - Age {data.age}
      </p>
      
      {/* BASELINE SECTION */}
      <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #334155', background: '#1e2a3a', padding: '8px', borderRadius: '6px' }}>
        <p style={{ color: '#94a3b8', fontWeight: 'bold', margin: '0 0 6px 0', fontSize: '12px' }}>
          📊 BASELINE (Your Profile)
        </p>
        
        {/* Income Section - Split between Employment and Business */}
        <p style={{ color: '#10b981', margin: '4px 0 2px 0', fontSize: '13px', fontWeight: 'bold' }}>
          Income:
        </p>
        
        {/* Employment Income (Salary) - Gate on BASELINE data */}
        {(data.baselineGrossSalary || 0) > 0 && (
          <>
            <p style={{ color: '#60a5fa', margin: '4px 0 2px 12px', fontSize: '12px', fontWeight: '500' }}>
              Employment Income:
            </p>
            <p style={{ color: '#94a3b8', margin: '2px 0', paddingLeft: '24px', fontSize: '11px' }}>
              Gross Salary: £{data.baselineGrossSalary?.toLocaleString()}
            </p>
            {(data.baselineIncomeTax || 0) > 0 && (() => {
              const taxAmount = data.baselineIncomeTax || 0
              const grossAmount = data.baselineGrossSalary || 1
              const taxRate = (taxAmount / grossAmount) * 100
              return (
                <p style={{ color: '#ef4444', margin: '2px 0', paddingLeft: '24px', fontSize: '11px' }}>
                  - Income Tax ({taxRate.toFixed(1)}%): £{taxAmount.toLocaleString()}
                </p>
              )
            })()}
            {(data.baselineNationalInsurance || 0) > 0 && (() => {
              const niAmount = data.baselineNationalInsurance || 0
              const grossAmount = data.baselineGrossSalary || 1
              const niRate = (niAmount / grossAmount) * 100
              return (
                <p style={{ color: '#ef4444', margin: '2px 0', paddingLeft: '24px', fontSize: '11px' }}>
                  - National Insurance ({niRate.toFixed(1)}%): £{niAmount.toLocaleString()}
                </p>
              )
            })()}
            <p style={{ color: '#10b981', margin: '2px 0 4px 24px', paddingLeft: '12px', fontSize: '11px', fontWeight: '500', borderTop: '1px solid #334155', paddingTop: '4px' }}>
              = Net Employment: £{((data.baselineGrossSalary || 0) - (data.baselineIncomeTax || 0) - (data.baselineNationalInsurance || 0)).toLocaleString()}
            </p>
          </>
        )}
        
        {/* Business Income - Only show if BASELINE has business income */}
        {(data.baselineBusinessRevenue || 0) > 0 && (
          <>
            <p style={{ color: '#f59e0b', margin: '4px 0 2px 12px', fontSize: '12px', fontWeight: '500' }}>
              Business Income:
            </p>
            <p style={{ color: '#94a3b8', margin: '2px 0', paddingLeft: '24px', fontSize: '11px' }}>
              Revenue: £{(data.baselineBusinessRevenue || 0).toLocaleString()}
            </p>
            {(data.baselineBusinessCosts || 0) > 0 && (
              <p style={{ color: '#ef4444', margin: '2px 0', paddingLeft: '24px', fontSize: '11px' }}>
                - Operating Costs: £{(data.baselineBusinessCosts || 0).toLocaleString()}
              </p>
            )}
            <p style={{ color: '#94a3b8', margin: '2px 0', paddingLeft: '24px', fontSize: '11px', fontWeight: '400' }}>
              = Business Profit: £{(data.baselineBusinessProfit || 0).toLocaleString()}
            </p>
            {(data.baselineCorporationTax || 0) > 0 && (() => {
              const corpTax = data.baselineCorporationTax || 0
              const profit = data.baselineBusinessProfit || 1
              const corpTaxRate = (corpTax / profit) * 100
              return (
                <p style={{ color: '#ef4444', margin: '2px 0', paddingLeft: '24px', fontSize: '11px' }}>
                  - Corporation Tax ({corpTaxRate.toFixed(1)}%): £{corpTax.toLocaleString()}
                </p>
              )
            })()}
            <p style={{ color: '#10b981', margin: '2px 0 4px 24px', paddingLeft: '12px', fontSize: '11px', fontWeight: '500', borderTop: '1px solid #334155', paddingTop: '4px' }}>
              = Net Business: £{(data.baselineBusinessNetProfit || 0).toLocaleString()}
            </p>
          </>
        )}
        
        {/* Total Income (if both types exist in baseline) */}
        {(data.baselineGrossSalary || 0) > 0 && (data.baselineBusinessRevenue || 0) > 0 && (
          <p style={{ color: '#10b981', margin: '4px 0 4px 12px', fontSize: '12px', fontWeight: '600', borderTop: '2px solid #10b981', paddingTop: '4px' }}>
            Total Net Income: £{(
              ((data.baselineGrossSalary || 0) - (data.baselineIncomeTax || 0) - (data.baselineNationalInsurance || 0)) +
              (data.baselineBusinessNetProfit || 0)
            ).toLocaleString()}
          </p>
        )}
        {/* Pension Income (if in retirement) - shown within Income section */}
        {isRetirement && totalPensionIncome > 0 && (
          <>
            <p style={{ color: '#60a5fa', margin: '4px 0 2px 12px', fontSize: '12px', fontWeight: '500' }}>
              Pension Withdrawals: £{totalPensionIncome.toLocaleString()}
            </p>
            {data.statePensionIncome! > 0 && (
              <p style={{ color: '#93c5fd', margin: '2px 0', paddingLeft: '24px', fontSize: '11px' }}>
                • State Pension: £{data.statePensionIncome?.toLocaleString()}
              </p>
            )}
            {data.privatePensionIncome! > 0 && (
              <p style={{ color: '#93c5fd', margin: '2px 0', paddingLeft: '24px', fontSize: '11px' }}>
                • Private Pension: £{data.privatePensionIncome?.toLocaleString()}
              </p>
            )}
          </>
        )}
        
        <p style={{ color: '#ef4444', margin: '6px 0 4px 0', fontSize: '14px' }}>
          <strong>Expenses: £{baselineExpenses.toLocaleString()}</strong>
        </p>
        <p style={{ color: '#94a3b8', margin: '2px 0', paddingLeft: '12px', fontSize: '12px' }}>
          Rent/Mortgage: £{data.housing?.toLocaleString()}
        </p>
        <p style={{ color: '#94a3b8', margin: '2px 0', paddingLeft: '12px', fontSize: '12px' }}>
          Bills & Living: £{((data.utilities || 0) + (data.food || 0) + (data.transport || 0)).toLocaleString()}
        </p>
        <p style={{ color: '#94a3b8', margin: '2px 0', paddingLeft: '12px', fontSize: '12px' }}>
          Leisure: £{((data.subscriptions || 0) + (data.leisure || 0) + (data.other || 0)).toLocaleString()}
        </p>
        
        <p style={{ color: '#667eea', fontWeight: 'bold', margin: '6px 0 0 0', fontSize: '14px' }}>
          = £{data.baselineNetCashFlow?.toLocaleString()}
        </p>
      </div>
      
      {/* SCENARIO IMPACTS SECTION */}
      {hasScenarioImpact && activeScenarios && activeScenarios.length > 0 && (
        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #334155', background: '#1e3a2a', padding: '8px', borderRadius: '6px' }}>
          <p style={{ color: '#10b981', fontWeight: 'bold', margin: '0 0 6px 0', fontSize: '12px' }}>
            🎯 SCENARIO IMPACTS
          </p>
          {activeScenarios.map((scenario: any) => {
            const value = data[scenario.key] || 0
            if (Math.abs(value) < 0.01) return null
            
            const corpTaxRate = scenario.assumptions?.corporationTaxRate
            
            return (
              <p key={scenario.key} style={{ margin: '3px 0', paddingLeft: '4px', fontSize: '13px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: scenario.color, 
                  marginRight: '6px',
                  borderRadius: '2px',
                  verticalAlign: 'middle'
                }}></span>
                <span style={{ color: value >= 0 ? '#10b981' : '#ef4444', fontWeight: '500' }}>
                  {scenario.name}: {value >= 0 ? '+' : ''}£{value.toLocaleString()}
                  {corpTaxRate !== undefined && (
                    <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '4px' }}>
                      ({corpTaxRate.toFixed(1)}% corp tax)
                    </span>
                  )}
                </span>
              </p>
            )
          })}
        </div>
      )}
      
      {/* TOTAL SECTION */}
      <div style={{ paddingTop: '8px' }}>
        {hasScenarioImpact ? (
          <p style={{ color: '#f59e0b', fontWeight: 'bold', margin: '0', fontSize: '15px' }}>
            Total: £{data.scenarioNetCashFlow?.toLocaleString()}
          </p>
        ) : (
          <p style={{ color: '#667eea', fontWeight: 'bold', margin: '0', fontSize: '15px' }}>
            Net Cash Flow: £{data.baselineNetCashFlow?.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

// Custom tooltip for Net Wealth chart with per-account breakdown
function NetWealthTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  
  const data = payload[0].payload as ChartDataPoint
  // Check if scenario data exists (check both assets AND debts to catch debt-only scenarios)
  const hasScenarios = (data.scenarioAssetBreakdown !== undefined && data.scenarioAssetBreakdown.length > 0) ||
                       (data.scenarioDebtBreakdown !== undefined && data.scenarioDebtBreakdown.length > 0)
  
  // Build account comparison map: { accountName: { baseline, scenario, delta, baselineRate, scenarioRate, isDebt } }
  const accountComparison = new Map<string, { baseline: number; scenario: number; delta: number; baselineRate?: number; scenarioRate?: number; isDebt: boolean }>()
  
  // Add baseline asset accounts
  if (data.baselineAssetBreakdown) {
    data.baselineAssetBreakdown.forEach((account: any) => {
      accountComparison.set(account.name, {
        baseline: account.value,
        scenario: 0,
        delta: 0,
        baselineRate: account.annualRate,
        scenarioRate: undefined,
        isDebt: false
      })
    })
  }
  
  // Add/update with scenario asset accounts
  if (hasScenarios && data.scenarioAssetBreakdown) {
    data.scenarioAssetBreakdown.forEach((account: any) => {
      const existing = accountComparison.get(account.name)
      if (existing) {
        existing.scenario = account.value
        existing.delta = account.value - existing.baseline
        existing.scenarioRate = account.annualRate
      } else {
        accountComparison.set(account.name, {
          baseline: 0,
          scenario: account.value,
          delta: account.value,
          baselineRate: undefined,
          scenarioRate: account.annualRate,
          isDebt: false
        })
      }
    })
  }
  
  // Add baseline debt accounts (debt values are already positive in breakdown)
  if (data.baselineDebtBreakdown) {
    data.baselineDebtBreakdown.forEach((debt: any) => {
      accountComparison.set(debt.name, {
        baseline: -debt.value,  // Negative for display (debts are liabilities)
        scenario: 0,
        delta: 0,
        baselineRate: debt.annualRate,
        scenarioRate: undefined,
        isDebt: true
      })
    })
  }
  
  // Add/update with scenario debt accounts
  if (hasScenarios && data.scenarioDebtBreakdown) {
    data.scenarioDebtBreakdown.forEach((debt: any) => {
      const existing = accountComparison.get(debt.name)
      if (existing) {
        existing.scenario = -debt.value  // Negative for display
        existing.delta = -debt.value - existing.baseline  // Change in debt (more negative = more debt)
        existing.scenarioRate = debt.annualRate
      } else {
        accountComparison.set(debt.name, {
          baseline: 0,
          scenario: -debt.value,
          delta: -debt.value,
          baselineRate: undefined,
          scenarioRate: debt.annualRate,
          isDebt: true
        })
      }
    })
  }
  
  // Separate assets and debts for two-column layout
  const assetAccounts = Array.from(accountComparison.entries())
    .filter(([, values]) => !values.isDebt)
    .sort((a, b) => b[1].scenario - a[1].scenario)
  
  const debtAccounts = Array.from(accountComparison.entries())
    .filter(([, values]) => values.isDebt)
    .sort((a, b) => a[1].scenario - b[1].scenario)
  
  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '12px',
      color: '#e2e8f0',
      minWidth: '750px',
      maxWidth: '850px',
      maxHeight: '500px',
      overflowY: 'auto'
    }}>
      <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
        Year {data.yearLabel} - Age {data.age}
      </p>
      
      {/* Net Wealth Summary */}
      <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #334155' }}>
        <p style={{ color: '#667eea', fontWeight: 'bold', margin: '4px 0', fontSize: '13px' }}>
          Baseline Net Wealth: £{data.baseline?.toLocaleString()}
        </p>
        {hasScenarios && (
          <>
            <p style={{ color: '#f59e0b', fontWeight: 'bold', margin: '4px 0', fontSize: '13px' }}>
              Scenario Net Wealth: £{data.scenario?.toLocaleString()}
            </p>
            <p style={{ 
              color: (data.scenario || 0) > (data.baseline || 0) ? '#10b981' : '#ef4444', 
              fontWeight: 'bold', 
              margin: '4px 0',
              fontSize: '13px'
            }}>
              Difference: {(data.scenario || 0) > (data.baseline || 0) ? '+' : ''}£{((data.scenario || 0) - (data.baseline || 0)).toLocaleString()}
            </p>
          </>
        )}
      </div>
      
      {/* Per-Account Breakdown - Two Column Layout (only when BOTH assets and debts exist) */}
      {accountComparison.size > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: (assetAccounts.length > 0 && debtAccounts.length > 0) ? '1fr 1fr' : '1fr',
          gap: '16px',
          marginBottom: '8px' 
        }}>
          {/* LEFT COLUMN: ASSETS */}
          {assetAccounts.length > 0 && (
            <div>
              <p style={{ color: '#10b981', fontWeight: 'bold', margin: '0 0 8px 0', fontSize: '13px' }}>
                💰 ASSETS
              </p>
              {assetAccounts.map(([accountName, values]) => {
                  const displayBaseline = values.baseline
                  const displayScenario = hasScenarios ? values.scenario : values.baseline
                  const displayDelta = hasScenarios ? values.delta : 0
                  
                  // Determine rate display
                  const baseRate = values.baselineRate
                  const scenRate = values.scenarioRate !== undefined ? values.scenarioRate : values.baselineRate
                  const rateChanged = baseRate !== undefined && scenRate !== undefined && Math.abs(baseRate - scenRate) > 0.01
                  
                  return (
                    <div key={accountName} style={{ 
                      marginBottom: '6px', 
                      paddingLeft: '8px',
                      paddingBottom: '4px',
                      borderLeft: hasScenarios ? `3px solid ${displayDelta > 0 ? '#10b981' : displayDelta < 0 ? '#ef4444' : '#64748b'}` : '3px solid #64748b'
                    }}>
                      <p style={{ color: '#e2e8f0', margin: '2px 0', fontSize: '12px', fontWeight: '500' }}>
                        {accountName}
                      </p>
                      {/* Interest Rate Display */}
                      {(baseRate !== undefined || scenRate !== undefined) && (
                        <p style={{ color: '#94a3b8', margin: '1px 0 0 8px', fontSize: '11px' }}>
                          Rate: {rateChanged ? (
                            <>
                              {baseRate?.toFixed(1)}% → {scenRate?.toFixed(1)}%
                              <span style={{ marginLeft: '4px' }}>
                                {scenRate! > baseRate! ? '⬆️' : '⬇️'}
                              </span>
                            </>
                          ) : (
                            `${(scenRate || baseRate)?.toFixed(1)}%/yr`
                          )}
                        </p>
                      )}
                      <p style={{ color: '#667eea', margin: '1px 0 0 8px', fontSize: '11px' }}>
                        Baseline: £{displayBaseline.toLocaleString()}
                      </p>
                      {hasScenarios && (
                        <>
                          <p style={{ color: '#f59e0b', margin: '1px 0 0 8px', fontSize: '11px' }}>
                            Scenario: £{displayScenario.toLocaleString()}
                          </p>
                          <p style={{ 
                            color: displayDelta > 0 ? '#10b981' : displayDelta < 0 ? '#ef4444' : '#94a3b8', 
                            margin: '1px 0 0 8px', 
                            fontSize: '11px',
                            fontWeight: displayDelta !== 0 ? 'bold' : 'normal'
                          }}>
                            Change: {displayDelta > 0 ? '+' : ''}£{displayDelta.toLocaleString()}
                          </p>
                        </>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
          
          {/* RIGHT COLUMN: DEBTS */}
          {debtAccounts.length > 0 && (
              <div>
                <p style={{ color: '#ef4444', fontWeight: 'bold', margin: '4px 0 8px 0', fontSize: '13px' }}>
                  💳 DEBTS
                </p>
                {debtAccounts.map(([accountName, values]) => {
                  const displayBaseline = Math.abs(values.baseline)
                  const displayScenario = hasScenarios ? Math.abs(values.scenario) : Math.abs(values.baseline)
                  const displayDelta = hasScenarios ? values.delta : 0
                  
                  // Determine rate display
                  const baseRate = values.baselineRate
                  const scenRate = values.scenarioRate !== undefined ? values.scenarioRate : values.baselineRate
                  const rateChanged = baseRate !== undefined && scenRate !== undefined && Math.abs(baseRate - scenRate) > 0.01
                  
                  return (
                    <div key={accountName} style={{ 
                      marginBottom: '6px', 
                      paddingLeft: '8px',
                      paddingBottom: '4px',
                      borderLeft: hasScenarios ? `3px solid ${displayDelta > 0 ? '#10b981' : displayDelta < 0 ? '#ef4444' : '#64748b'}` : '3px solid #64748b'
                    }}>
                      <p style={{ color: '#ef4444', margin: '2px 0', fontSize: '12px', fontWeight: '500' }}>
                        {accountName}
                      </p>
                      {/* Interest Rate Display */}
                      {(baseRate !== undefined || scenRate !== undefined) && (
                        <p style={{ color: '#94a3b8', margin: '1px 0 0 8px', fontSize: '11px' }}>
                          Rate: {rateChanged ? (
                            <>
                              {baseRate?.toFixed(1)}% → {scenRate?.toFixed(1)}%
                              <span style={{ marginLeft: '4px' }}>
                                {scenRate! > baseRate! ? '⬆️' : '⬇️'}
                              </span>
                            </>
                          ) : (
                            `${(scenRate || baseRate)?.toFixed(1)}%/yr`
                          )}
                        </p>
                      )}
                      <p style={{ color: '#667eea', margin: '1px 0 0 8px', fontSize: '11px' }}>
                        Baseline: −£{displayBaseline.toLocaleString()}
                      </p>
                      {hasScenarios && (
                        <>
                          <p style={{ color: '#f59e0b', margin: '1px 0 0 8px', fontSize: '11px' }}>
                            Scenario: −£{displayScenario.toLocaleString()}
                          </p>
                          <p style={{ 
                            color: displayDelta > 0 ? '#10b981' : displayDelta < 0 ? '#ef4444' : '#94a3b8', 
                            margin: '1px 0 0 8px', 
                            fontSize: '11px',
                            fontWeight: displayDelta !== 0 ? 'bold' : 'normal'
                          }}>
                            Change: {displayDelta > 0 ? '+' : ''}£{displayDelta.toLocaleString()}
                            {displayDelta > 0 && (
                              <span style={{ color: '#94a3b8', fontSize: '10px', marginLeft: '4px' }}>
                                (less debt ✓)
                              </span>
                            )}
                            {displayDelta < 0 && (
                              <span style={{ color: '#94a3b8', fontSize: '10px', marginLeft: '4px' }}>
                                (more debt)
                              </span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
          )}
        </div>
      )}
      
      {/* Growth Drivers - show compound growth vs contributions */}
      {(data.compoundGrowth !== undefined || data.totalContributionsThisPeriod !== undefined) && (
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', fontWeight: 'bold', margin: '0 0 6px 0', fontSize: '13px' }}>
            📈 Net Wealth Growth Drivers (This Month)
          </p>
          {data.compoundGrowth !== undefined && (
            <p style={{ color: '#10b981', margin: '4px 0', paddingLeft: '12px', fontSize: '12px' }}>
              Compound Growth (Interest/Returns): £{data.compoundGrowth.toLocaleString()}
            </p>
          )}
          {data.totalContributionsThisPeriod !== undefined && (
            <p style={{ color: '#3b82f6', margin: '4px 0', paddingLeft: '12px', fontSize: '12px' }}>
              New Contributions: £{data.totalContributionsThisPeriod.toLocaleString()}
            </p>
          )}
          {data.compoundGrowth !== undefined && data.totalContributionsThisPeriod !== undefined && (
            <>
              <p style={{ color: '#e2e8f0', margin: '6px 0 2px 12px', paddingLeft: '0px', paddingTop: '4px', borderTop: '1px dashed #334155', fontSize: '12px', fontWeight: 'bold' }}>
                Total Wealth Increase: £{(data.compoundGrowth + data.totalContributionsThisPeriod).toLocaleString()}
              </p>
              <p style={{ color: '#94a3b8', margin: '2px 0 0 12px', fontSize: '10px' }}>
                {(() => {
                  const total = data.compoundGrowth + data.totalContributionsThisPeriod
                  // Guard against zero/negative totals to prevent NaN or misleading percentages
                  if (total > 0.01) {
                    const growthPercent = ((data.compoundGrowth / total) * 100).toFixed(0)
                    const contribPercent = ((data.totalContributionsThisPeriod / total) * 100).toFixed(0)
                    return `(${growthPercent}% from growth, ${contribPercent}% from contributions)`
                  } else if (total < -0.01) {
                    return '(net wealth decrease this month)'
                  } else {
                    return '(breakdown n/a - values too small)'
                  }
                })()}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Custom tooltip for Account Contributions chart
function AccountContributionsTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  
  const data = payload[0].payload as ChartDataPoint
  
  // NEW: Use accountBreakdown if available
  if (data.accountBreakdown && data.accountBreakdown.length > 0) {
    const total = data.accountBreakdown.reduce((sum, acc) => sum + acc.amount, 0)
    
    return (
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
        <p style={{ color: '#f8fafc', fontWeight: 'bold', margin: '0 0 8px 0' }}>
          Year {data.yearLabel} (Age {data.age})
        </p>
        {data.accountBreakdown
          .filter(acc => acc.amount !== 0)
          .sort((a, b) => a.name.localeCompare(b.name))  // Sort deterministically
          .map((acc, idx) => {
            const color = getAccountColor(acc.name)
            const isISA = acc.name.toLowerCase().includes('isa')
            const exceedsLimit = isISA && acc.amount > 20000
            
            return (
              <p key={idx} style={{ color, margin: '4px 0' }}>
                {acc.name} ({acc.returnRate.toFixed(1)}%): £{acc.amount.toLocaleString()}
                {exceedsLimit && (
                  <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>
                    {' '}⚠ EXCEEDS £20k LIMIT
                  </span>
                )}
              </p>
            )
          })}
        <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px' }}>
          <p style={{ color: '#f8fafc', fontWeight: 'bold', margin: '0' }}>
            Total: £{total.toLocaleString()}
          </p>
        </div>
        
        {/* Show goal breakdowns if present */}
        {data.goalBreakdowns && data.goalBreakdowns.length > 0 && (
          <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px' }}>
            <p style={{ color: '#60a5fa', fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '13px' }}>
              Scenario Impacts:
            </p>
            {data.goalBreakdowns.map((goal, idx) => (
              <p key={idx} style={{ color: '#94a3b8', margin: '2px 0', paddingLeft: '8px', fontSize: '12px' }}>
                • {goal.name}: {goal.cashFlowImpact >= 0 ? '+' : ''}£{goal.cashFlowImpact.toLocaleString()}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  // LEGACY: Fall back to old behavior if accountBreakdown not available
  const savingsGoalsTotal = data.savingsGoals 
    ? Object.values(data.savingsGoals).reduce((sum, val) => sum + val, 0) 
    : 0
  const total = (data.cash || 0) + (data.pension || 0) + (data.isa || 0) + (data.investments || 0) + (data.debt || 0) + savingsGoalsTotal
  
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
      <p style={{ color: '#f8fafc', fontWeight: 'bold', margin: '0 0 8px 0' }}>
        Year {data.yearLabel} (Age {data.age})
      </p>
      {data.cash !== undefined && data.cash !== 0 && (
        <p style={{ color: '#64748b', margin: '4px 0' }}>
          Cash (0%): £{data.cash.toLocaleString()}
        </p>
      )}
      {data.pension !== undefined && data.pension !== 0 && (
        <p style={{ color: '#8b5cf6', margin: '4px 0' }}>
          Workplace Pension: £{data.pension.toLocaleString()}
        </p>
      )}
      {data.isa !== undefined && data.isa !== 0 && (
        <p style={{ color: '#10b981', margin: '4px 0' }}>
          Private ISA: £{data.isa.toLocaleString()}
          {data.isa > 20000 && (
            <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>
              {' '}⚠ EXCEEDS £20k LIMIT
            </span>
          )}
        </p>
      )}
      {data.savingsGoals && Object.keys(data.savingsGoals).length > 0 && (
        <>
          {Object.entries(data.savingsGoals).map(([fundName, amount]) => (
            amount !== 0 && (
              <p key={fundName} style={{ color: '#22d3ee', margin: '4px 0' }}>
                {fundName} (HYSA 4.5%): £{amount.toLocaleString()}
              </p>
            )
          ))}
        </>
      )}
      {data.investments !== undefined && data.investments !== 0 && (
        <p style={{ color: '#f59e0b', margin: '4px 0' }}>
          Taxable Investments: £{data.investments.toLocaleString()}
        </p>
      )}
      <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px' }}>
        <p style={{ color: '#f8fafc', fontWeight: 'bold', margin: '0' }}>
          Total: £{total.toLocaleString()}
        </p>
      </div>
      
      {/* Show goal breakdowns if present */}
      {data.goalBreakdowns && data.goalBreakdowns.length > 0 && (
        <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px' }}>
          <p style={{ color: '#60a5fa', fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '13px' }}>
            Scenario Impacts:
          </p>
          {data.goalBreakdowns.map((goal, idx) => (
            <p key={idx} style={{ color: '#94a3b8', margin: '2px 0', paddingLeft: '8px', fontSize: '12px' }}>
              • {goal.name}: {goal.cashFlowImpact >= 0 ? '+' : ''}£{goal.cashFlowImpact.toLocaleString()}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// Custom tick for X-axis - show every 5th year to avoid crowding
function CustomXAxisTick({ x, y, payload }: any) {
  const year = parseInt(payload.value, 10)
  const startYear = 2025
  
  // Show label if it's the start year or every 5 years from start
  if (year === startYear || (year - startYear) % 5 === 0) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="middle" 
          fill="#94a3b8"
          fontSize={12}
        >
          {payload.value}
        </text>
      </g>
    )
  }
  
  return null
}

// Smart Y-axis formatter that avoids duplicate labels
function formatYAxis(value: number): string {
  const abs = Math.abs(value)
  
  if (abs >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`
  } else if (abs >= 10000) {
    return `£${Math.round(value / 1000)}k`
  } else if (abs >= 1000) {
    return `£${(value / 1000).toFixed(1)}k`
  } else if (abs >= 100) {
    return `£${Math.round(value)}`
  } else {
    return `£${value.toFixed(0)}`
  }
}

export function ProjectionCharts() {
  const { chartData, modifiers } = useSimulation()

  // Extract active scenario keys and assign consistent colors
  // Each scenario uses one color for all years (positive values above x-axis, negative below)
  const activeScenarios = useMemo(() => {
    if (!chartData.cashFlow || chartData.cashFlow.length === 0) {
      return []
    }
    
    // Collect all unique scenario keys
    const scenarioKeySet = new Set<string>()
    chartData.cashFlow.forEach((dataPoint) => {
      Object.keys(dataPoint).forEach((key) => {
        if (key.startsWith('scenario_')) {
          scenarioKeySet.add(key)
        }
      })
    })
    
    const scenarios: Array<{ key: string; name: string; color: string; assumptions?: any }> = []
    const sortedKeys = Array.from(scenarioKeySet).sort() // Consistent ordering
    
    sortedKeys.forEach((key, index) => {
      // Convert 'scenario_Launch_a_New_Business__goal' -> 'Launch a New Business'
      // Strip 'scenario_' prefix and '__type' suffix, then clean up formatting
      let displayName = key.replace('scenario_', '')
      
      // Remove type suffix (e.g., __goal, __action, __event)
      displayName = displayName.replace(/__(goal|action|event)$/, '')
      
      // Replace underscores with spaces and apply title case
      displayName = displayName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
      
      // Find matching modifier to get assumptions
      const matchingModifier = modifiers?.find((m: any) => {
        const modifierKey = `scenario_${m.name.replace(/\s+/g, '_')}__${m.id.split('-')[0]}`
        return modifierKey === key
      })
      
      scenarios.push({
        key,
        name: displayName,
        color: SCENARIO_COLORS[index % SCENARIO_COLORS.length],
        assumptions: matchingModifier?.assumptions
      })
    })
    
    return scenarios
  }, [chartData.cashFlow, modifiers])

  return (
    <div className="charts-container">
      {/* Cash Flow Chart */}
      <div className="chart-section">
        <h3>Net Cash Flow (Income - Expenses + Pension Withdrawals)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData.cashFlow}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="yearLabel"
              stroke="#94a3b8"
              tick={<CustomXAxisTick />}
              interval={0}
              label={{ value: 'Year', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
            />
            <YAxis 
              stroke="#94a3b8"
              label={{ value: 'Amount (£)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<CashFlowTooltip activeScenarios={activeScenarios} />} />
            <Legend />
            <Bar dataKey="baselineCashFlowBar" stackId="a" fill="#667eea" name="Baseline Net Cash" />
            {/* Dynamically render scenario bars - stacked so negative impacts pull total down */}
            {activeScenarios.map((scenario) => (
              <Bar 
                key={scenario.key}
                dataKey={scenario.key}
                stackId="a"
                fill={scenario.color}
                name={scenario.name}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Attribution Chart */}
      <div className="chart-section">
        <h3>Account Contributions (matches Net Cash Flow above)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData.attribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="yearLabel"
              stroke="#94a3b8"
              tick={<CustomXAxisTick />}
              interval={0}
              label={{ value: 'Year', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
            />
            <YAxis 
              stroke="#94a3b8"
              label={{ value: 'Contributions (£)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<AccountContributionsTooltip />} />
            <Legend />
            {/* Render dynamic account bars from accountBreakdown if available */}
            {(() => {
              const firstDataPoint = chartData.attribution[0]
              if (firstDataPoint?.accountBreakdown && firstDataPoint.accountBreakdown.length > 0) {
                // NEW: Dynamic account rendering with return rates
                // Collect all unique account names across all years
                const allAccountNames = new Set<string>()
                chartData.attribution.forEach(point => {
                  point.accountBreakdown?.forEach(acc => allAccountNames.add(acc.name))
                })
                
                // Sort accounts deterministically for consistent legend ordering
                const sortedAccountNames = Array.from(allAccountNames).sort()
                
                return sortedAccountNames.map((accountName) => {
                  const color = getAccountColor(accountName)
                  // Get return rate from first occurrence
                  let returnRate = 0
                  for (const point of chartData.attribution) {
                    const acc = point.accountBreakdown?.find(a => a.name === accountName)
                    if (acc) {
                      returnRate = acc.returnRate
                      break
                    }
                  }
                  const displayName = `${accountName} (${returnRate.toFixed(1)}%)`
                  const dataKey = `account_${accountName.replace(/[^a-zA-Z0-9]/g, '_')}`
                  
                  return (
                    <Bar 
                      key={accountName}
                      dataKey={dataKey}
                      stackId="a"
                      fill={color}
                      name={displayName}
                    />
                  )
                })
              } else {
                // LEGACY: Fixed bars for backward compatibility
                return (
                  <>
                    <Bar dataKey="cash" stackId="a" fill="#64748b" name="Cash (0%)" />
                    <Bar dataKey="hysa" stackId="a" fill="#06b6d4" name="HYSA (4.5%)" />
                    <Bar dataKey="pension" stackId="a" fill="#8b5cf6" name="Pension" />
                    <Bar dataKey="isa" stackId="a" fill="#6366f1" name="Private ISA" />
                    <Bar dataKey="investments" stackId="a" fill="#f59e0b" name="Taxable Investments" />
                    <Bar dataKey="debt" stackId="a" fill="#ef4444" name="Mortgage/Debt" />
                  </>
                )
              }
            })()}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net Wealth Chart - Showing Assets, Debts, and Net Wealth */}
      <div className="chart-section">
        <h3>Net Wealth Breakdown (Assets - Debts = Net Wealth)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData.netWealth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="yearLabel"
              stroke="#94a3b8"
              tick={<CustomXAxisTick />}
              interval={0}
              label={{ value: 'Year', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
            />
            <YAxis 
              stroke="#94a3b8"
              label={{ value: 'Value (£)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<NetWealthTooltip />} />
            <Legend />
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
            
            {/* Assets (positive area above baseline) */}
            <Area 
              type="monotone" 
              dataKey="baselineAssets" 
              fill="#667eea" 
              fillOpacity={0.3}
              stroke="#667eea"
              strokeWidth={2}
              name="Baseline Assets"
            />
            
            {/* Debts (negative area below baseline) */}
            <Area 
              type="monotone" 
              dataKey={(data: ChartDataPoint) => -(data.baselineDebts || 0)} 
              fill="#ef4444" 
              fillOpacity={0.3}
              stroke="#ef4444"
              strokeWidth={2}
              name="Baseline Debts"
            />
            
            {/* Net Wealth lines (assets - debts) */}
            <Line 
              type="monotone" 
              dataKey="baseline" 
              stroke="#667eea" 
              strokeWidth={3}
              name="Baseline Net Wealth"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="scenario" 
              stroke="#f59e0b" 
              strokeWidth={3}
              strokeDasharray="5 5"
              name="Scenario Net Wealth"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
