import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";

interface RiskDataPoint {
    /** Display label — e.g. "14:32" */
    time: string;
    probability: number;
}

interface RiskTimelineProps {
    data?: RiskDataPoint[];
    crossThreshold?: number;
    severeThreshold?: number;
}

// Realistic mock — last 12 observations
const MOCK_DATA: RiskDataPoint[] = [
    { time: "17:10", probability: 0.18 },
    { time: "17:15", probability: 0.22 },
    { time: "17:20", probability: 0.29 },
    { time: "17:25", probability: 0.33 },
    { time: "17:30", probability: 0.41 },
    { time: "17:35", probability: 0.38 },
    { time: "17:40", probability: 0.47 },
    { time: "17:45", probability: 0.55 },
    { time: "17:50", probability: 0.59 },
    { time: "17:55", probability: 0.62 },
    { time: "18:00", probability: 0.67 },
    { time: "18:05", probability: 0.71 },
];

interface CustomTooltipProps {
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    const val = payload[0].value;
    return (
        <div className="bg-slate-900/90 border border-white/10 rounded-lg px-3 py-2 text-xs">
            <p className=" mb-0.5">{label}</p>
            <p className="text-white font-bold">{Math.round(val * 100)}% probability</p>
        </div>
    );
}

export default function RiskTimeline({
    data = MOCK_DATA,
    crossThreshold = 0.3,
    severeThreshold = 0.45,
}: RiskTimelineProps) {
    const latest = data[data.length - 1]?.probability ?? 0;
    const previous = data[data.length - 2]?.probability ?? 0;
    const delta = latest - previous;
    const trending = delta > 0.01 ? "↑ Rising" : delta < -0.01 ? "↓ Falling" : "→ Stable";
    const trendColor = delta > 0.01 ? "#ef4444" : delta < -0.01 ? "#22c55e" : "#94a3b8";

    return (
        <div className="flex flex-col h-full gap-2 pointer-events-auto">
            <div className="flex items-baseline justify-between px-1">
                <span className="text-[11px]  uppercase tracking-widest">Last 60 min</span>
                <span className="text-xs font-semibold" style={{ color: trendColor }}>
                    {trending}
                </span>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <defs>
                            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>

                        <XAxis
                            dataKey="time"
                            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                            interval={2}
                        />
                        <YAxis
                            domain={[0, 1]}
                            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${Math.round(v * 100)}%`}
                        />

                        {/* Model threshold lines */}
                        <ReferenceLine
                            y={crossThreshold}
                            stroke="#facc15"
                            strokeDasharray="4 3"
                            strokeWidth={1}
                            label={{ value: "Cross", fill: "#facc1588", fontSize: 8, position: "insideTopLeft" }}
                        />
                        <ReferenceLine
                            y={severeThreshold}
                            stroke="#ef4444"
                            strokeDasharray="4 3"
                            strokeWidth={1}
                            label={{ value: "Severe", fill: "#ef444488", fontSize: 8, position: "insideTopLeft" }}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        <Area
                            type="monotone"
                            dataKey="probability"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fill="url(#riskGradient)"
                            dot={false}
                            activeDot={{ r: 4, fill: "#ef4444", stroke: "#fff", strokeWidth: 1.5 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
