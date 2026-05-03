import {
    RadialBarChart,
    RadialBar,
    ResponsiveContainer,
    PolarAngleAxis,
} from "recharts";

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";

interface CrossingProbabilityGaugeProps {
    /** 0.0 - 1.0 */
    crossingProbability?: number;
    riskLevel?: RiskLevel;
    predictedCrossed?: "YES" | "NO";
}

const RISK_CONFIG: Record<RiskLevel, { color: string; label: string }> = {
    LOW: { color: "#22c55e", label: "LOW" },
    MODERATE: { color: "#facc15", label: "MODERATE" },
    HIGH: { color: "#f97316", label: "HIGH" },
    SEVERE: { color: "#ef4444", label: "SEVERE" },
};

function deriveRiskLevel(prob: number): RiskLevel {
    if (prob < 0.3) return "LOW";
    if (prob < 0.35) return "MODERATE";
    if (prob < 0.45) return "HIGH";
    return "SEVERE";
}

export default function CrossingProbabilityGauge({
    crossingProbability = 0.62,
    riskLevel,
    predictedCrossed = "YES",
}: CrossingProbabilityGaugeProps) {
    const prob = Math.min(1, Math.max(0, crossingProbability));
    const level = riskLevel ?? deriveRiskLevel(prob);
    const config = RISK_CONFIG[level];
    const pct = Math.round(prob * 100);
    const isSevere = level === "SEVERE" || level === "HIGH";

    // Gauge fills from 0 → pct on a 0-100 scale
    const data = [{ value: pct }];

    return (
        <div className="flex flex-col items-center justify-center h-full gap-1 pointer-events-auto">
            {/* Pulsing alert dot for severe risk */}
            {isSevere && (
                <div className="flex items-center gap-2 mb-1">
                    <span
                        className="inline-block w-2.5 h-2.5 rounded-full animate-ping"
                        style={{ backgroundColor: config.color }}
                    />
                    <span className="text-xs font-bold tracking-widest uppercase" style={{ color: config.color }}>
                        {predictedCrossed === "YES" ? "Crossing Predicted" : "Monitoring"}
                    </span>
                </div>
            )}

            {/* Radial gauge */}
            <div className="relative w-full" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="70%"
                        innerRadius="80%"
                        outerRadius="110%"
                        startAngle={180}
                        endAngle={0}
                        data={data}
                    >
                        {/* Background track */}
                        <RadialBar
                            dataKey="value"
                            cornerRadius={6}
                            background={{ fill: "rgba(255,255,255,0.06)" }}
                            fill={config.color}
                            max={100}
                        />
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            tick={false}
                            axisLine={false}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>

                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
                    <span
                        className="text-4xl font-black tabular-nums leading-none"
                        style={{ color: config.color }}
                    >
                        {pct}%
                    </span>
                    <span className="text-[10px] tracking-widest uppercase mt-2">
                        Crossing Probability
                    </span>
                </div>
            </div>

            {/* Risk level badge */}
            <div
                className="px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border"
                style={{
                    color: config.color,
                    borderColor: `${config.color}55`,
                    backgroundColor: `${config.color}18`,
                }}
            >
                {config.label} RISK
            </div>
        </div>
    );
}
