export interface TelemetryObservation {
    id: number;
    observedAt: string;
    lat: number | null;
    lon: number | null;
    windSpeedMps: number;
    windDirectionDeg: number | null;
    flameLengthM: number;
    burnTimeS: number;
    crossingProbability: number | null;
}

export interface TelemetrySummary {
    averageWindSpeed: number;
    averageFlameLength: number;
    averageBurnTime: number;
    highestCrossingProbability: number;
    positionedObservationCount: number;
}

export function summarizeTelemetry(
    observations: TelemetryObservation[],
): TelemetrySummary {
    if (observations.length === 0) {
        return {
            averageWindSpeed: 0,
            averageFlameLength: 0,
            averageBurnTime: 0,
            highestCrossingProbability: 0,
            positionedObservationCount: 0,
        };
    }

    const totals = observations.reduce(
        (summary, observation) => ({
            windSpeed: summary.windSpeed + observation.windSpeedMps,
            flameLength: summary.flameLength + observation.flameLengthM,
            burnTime: summary.burnTime + observation.burnTimeS,
            crossingProbability: Math.max(
                summary.crossingProbability,
                observation.crossingProbability ?? 0,
            ),
            positionedCount:
                summary.positionedCount +
                (observation.lat !== null && observation.lon !== null ? 1 : 0),
        }),
        {
            windSpeed: 0,
            flameLength: 0,
            burnTime: 0,
            crossingProbability: 0,
            positionedCount: 0,
        },
    );

    return {
        averageWindSpeed: totals.windSpeed / observations.length,
        averageFlameLength: totals.flameLength / observations.length,
        averageBurnTime: totals.burnTime / observations.length,
        highestCrossingProbability: totals.crossingProbability,
        positionedObservationCount: totals.positionedCount,
    };
}
