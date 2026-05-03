// Fallback timestamp computed once at module load — avoids impure Date.now() during render.
const FALLBACK_OBSERVED_AT = new Date(Date.now() - 18000).toISOString();

interface WindConditionsProps {
    /** m/s from telemetry_observations.wind_speed_2m_mps */
    windSpeedMps?: number;
    /** 0-359 degrees from telemetry_observations.wind_direction_deg */
    windDirectionDeg?: number;
    /** 0.0 - 1.0 from telemetry_observations.quality_score */
    qualityScore?: number;
    droneId?: string;
    /** ISO timestamp string */
    observedAt?: string;
}

function mpsToKph(mps: number) {
    return (mps * 3.6).toFixed(1);
}

function degreesToCardinal(deg: number): string {
    const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return dirs[Math.round(deg / 22.5) % 16];
}

function timeAgo(isoString: string): string {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

export default function WindConditions({
    windSpeedMps = 8.4,
    windDirectionDeg = 247,
    qualityScore = 0.87,
    droneId = "DRONE-04",
    observedAt,
}: WindConditionsProps) {
    const resolvedObservedAt = observedAt ?? FALLBACK_OBSERVED_AT;
    const kph = mpsToKph(windSpeedMps);
    const cardinal = degreesToCardinal(windDirectionDeg);
    const isStale = qualityScore !== undefined && qualityScore < 0.6;

    // Quality bar color
    const qualityColor =
        qualityScore >= 0.8 ? "#22c55e" :
            qualityScore >= 0.6 ? "#facc15" :
                "#ef4444";

    return (
        <div className="flex flex-col h-full gap-3 pointer-events-auto">

            {/* Main wind row */}
            <div className="flex items-center gap-4">
                {/* Compass */}
                <div className="relative flex-shrink-0 w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                    {/* Cardinal labels */}
                    {[
                        { label: "N", top: "2px", left: "50%", transform: "translateX(-50%)" },
                        { label: "S", bottom: "2px", left: "50%", transform: "translateX(-50%)" },
                        { label: "W", top: "50%", left: "2px", transform: "translateY(-50%)" },
                        { label: "E", top: "50%", right: "2px", transform: "translateY(-50%)" },
                    ].map(({ label, ...style }) => (
                        <span
                            key={label}
                            className="absolute text-[8px]  font-bold"
                            style={style as React.CSSProperties}
                        >
                            {label}
                        </span>
                    ))}

                    {/* Arrow — points in wind direction */}
                    <div
                        className="w-10 h-10 flex items-center justify-center"
                        style={{ transform: `rotate(${windDirectionDeg}deg)`, transition: "transform 0.8s ease" }}
                    >
                        <svg viewBox="0 0 24 24" className="w-8 h-8">
                            {/* Arrow pointing up = wind coming from north (0°) */}
                            <path
                                d="M12 3 L16 14 L12 11 L8 14 Z"
                                fill="#f97316"
                                stroke="none"
                            />
                            <path
                                d="M12 21 L12 11"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </div>

                {/* Speed + direction text */}
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-white tabular-nums leading-none">{kph}</span>
                        <span className="text-xs  font-medium">km/h</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-orange-400">{cardinal}</span>
                        <span className="text-xs ">{windDirectionDeg.toFixed(0)}°</span>
                    </div>
                    <span className="text-[10px]  mt-0.5">{windSpeedMps.toFixed(1)} m/s</span>
                </div>
            </div>

            {/* Drone + quality row */}
            <div className="border-t border-white/6 pt-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        {/* Live dot */}
                        <span className={`w-1.5 h-1.5 rounded-full ${isStale ? "bg-red-500" : "bg-green-400 animate-pulse"}`} />
                        <span className="text-[10px]  font-mono">{droneId}</span>
                    </div>
                    <span className="text-[10px] ">{timeAgo(resolvedObservedAt)}</span>
                </div>

                {/* Signal quality bar */}
                <div className="flex items-center gap-2">
                    <span className="text-[9px]  uppercase tracking-widest w-10">Signal</span>
                    <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${(qualityScore ?? 0) * 100}%`,
                                backgroundColor: qualityColor,
                            }}
                        />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: qualityColor }}>
                        {Math.round((qualityScore ?? 0) * 100)}%
                    </span>
                </div>
            </div>
        </div>
    );
}
