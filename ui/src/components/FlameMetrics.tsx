import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";

interface FlameReading {
    /** Short label for x-axis — e.g. drone ID or timestamp */
    label: string;
    /** telemetry_observations.flame_length_m */
    flameLengthM: number;
    /** telemetry_observations.burn_time_s */
    burnTimeS: number;
}

interface FlameMetricsProps {
    readings?: FlameReading[];
    /** Current single observation values (for the stat cards) */
    currentFlameLengthM?: number;
    currentBurnTimeS?: number;
}

// Mock: last 8 drone readings
const MOCK_READINGS: FlameReading[] = [
    { label: "17:30", flameLengthM: 3.1, burnTimeS: 42 },
    { label: "17:35", flameLengthM: 3.8, burnTimeS: 51 },
    { label: "17:40", flameLengthM: 4.5, burnTimeS: 63 },
    { label: "17:45", flameLengthM: 5.2, burnTimeS: 71 },
    { label: "17:50", flameLengthM: 4.9, burnTimeS: 68 },
    { label: "17:55", flameLengthM: 6.1, burnTimeS: 84 },
    { label: "18:00", flameLengthM: 7.3, burnTimeS: 97 },
    { label: "18:05", flameLengthM: 8.0, burnTimeS: 112 },
];

function flameColor(len: number): string {
    if (len < 3)  return "#facc15"; // yellow — low
    if (len < 6)  return "#f97316"; // orange — moderate
    return "#ef4444";               // red — severe
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: { payload: FlameReading }[];
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-slate-900/90 border border-white/10 rounded-lg px-3 py-2 text-xs space-y-1">
            <p className="text-white/50">{label}</p>
            <p className="text-orange-400 font-bold">Flame: {d.flameLengthM.toFixed(1)} m</p>
            <p className="text-yellow-400 font-bold">Burn: {d.burnTimeS}s</p>
        </div>
    );
}

export default function FlameMetrics({
    readings             = MOCK_READINGS,
    currentFlameLengthM  = 8.0,
    currentBurnTimeS     = 112,
}: FlameMetricsProps) {
    return (
        <div className="flex flex-col h-full gap-3 pointer-events-auto">

            {/* Stat row */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-xl px-3 py-2 flex flex-col">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest">Flame Length</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                        <span
                            className="text-2xl font-black tabular-nums leading-none"
                            style={{ color: flameColor(currentFlameLengthM) }}
                        >
                            {currentFlameLengthM.toFixed(1)}
                        </span>
                        <span className="text-xs text-white/30">m</span>
                    </div>
                </div>
                <div className="bg-white/5 rounded-xl px-3 py-2 flex flex-col">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest">Burn Duration</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-black tabular-nums text-amber-400 leading-none">
                            {currentBurnTimeS}
                        </span>
                        <span className="text-xs text-white/30">s</span>
                    </div>
                </div>
            </div>

            {/* Bar chart */}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={readings} margin={{ top: 2, right: 4, left: -28, bottom: 0 }} barSize={8}>
                        <XAxis
                            dataKey="label"
                            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                            interval={1}
                        />
                        <YAxis
                            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}m`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                        <Bar dataKey="flameLengthM" radius={[3, 3, 0, 0]}>
                            {readings.map((entry, i) => (
                                <Cell key={i} fill={flameColor(entry.flameLengthM)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
