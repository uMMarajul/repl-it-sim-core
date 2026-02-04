
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, Tooltip, ReferenceLine, YAxis } from 'recharts'


interface ChatChartProps {
    data: any[]
    type: 'netWorth' | 'cashFlow'
    height?: number
}

export function ChatChart({ data, type, height = 160 }: ChatChartProps) {
    // Only show every 5th year to save space, but keep start/end
    const filteredData = data.filter((d, i) => i === 0 || i === data.length - 1 || i % 5 === 0)

    const isNetWorth = type === 'netWorth'

    // Calculate Impact (Difference at end)
    const finalPoint = data[data.length - 1]
    const initialPoint = data[0]
    const impactVal = finalPoint ? (isNetWorth ? (finalPoint.scenario - finalPoint.baseline) : (finalPoint.scenarioNetCashFlow)) : 0
    const impactedPositive = impactVal >= 0

    // Formatter
    const fmt = (n: number) => `£${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact' })}`

    // Minimal Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload
            const baseline = dataPoint.baseline || 0
            const scenario = isNetWorth ? dataPoint.scenario : dataPoint.scenarioNetCashFlow
            const diff = scenario - baseline

            return (
                <div style={{
                    background: '#1e293b',
                    border: '1px solid #475569',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#f8fafc',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)'
                }}>
                    <p style={{ fontWeight: 600, marginBottom: '4px', borderBottom: '1px solid #475569', paddingBottom: '2px' }}>
                        {label} (Age {dataPoint.age || '?'})
                    </p>
                    {isNetWorth && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ color: '#94a3b8' }}>Baseline:</span>
                                <span>{fmt(baseline)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ color: '#10b981' }}>Scenario:</span>
                                <span>{fmt(scenario)}</span>
                            </div>
                            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Difference:</span>
                                <span style={{ color: diff >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                                    {diff >= 0 ? '+' : '-'}{fmt(diff)}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            )
        }
        return null
    }

    return (
        <div style={{
            width: '100%',
            marginTop: '12px',
            background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '12px',
            padding: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                    <h4 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
                        {isNetWorth ? 'Projected Net Worth' : 'Annual Cash Flow'}
                    </h4>
                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                        Over next 30 years
                    </p>
                </div>

                {/* Impact Badge */}
                <div style={{
                    background: impactedPositive ? '#dcfce7' : '#fee2e2',
                    color: impactedPositive ? '#166534' : '#991b1b',
                    padding: '4px 8px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <span>{impactedPositive ? '↗' : '↘'}</span>
                    {fmt(impactVal)}
                </div>
            </div>

            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {isNetWorth ? (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorScenario" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="yearLabel"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} />

                            {/* Baseline (Dotted) */}
                            <Area
                                type="monotone"
                                dataKey="baseline"
                                stroke="#cbd5e1"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                fill="none"
                                isAnimationActive={false}
                            />

                            {/* Scenario (Active) */}
                            <Area
                                type="monotone"
                                dataKey="scenario"
                                stroke="#10b981"
                                fill="url(#colorScenario)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    ) : (
                        <BarChart data={filteredData}>
                            <XAxis dataKey="yearLabel" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={0} stroke="#cbd5e1" />
                            <Bar
                                dataKey="scenarioNetCashFlow"
                                fill="#f97316"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            {isNetWorth && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b' }}>
                        <div style={{ width: '8px', height: '2px', background: '#cbd5e1', borderTop: '2px dotted #cbd5e1' }}></div>
                        Current Path
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#0f172a', fontWeight: 600 }}>
                        <div style={{ width: '8px', height: '2px', background: '#10b981' }}></div>
                        With Scenario
                    </div>
                </div>
            )}
        </div>
    )
}
