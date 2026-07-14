import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TelemetryObservation } from "@/domain/telemetry";
import { colors, radii, spacing, typography } from "@/theme/tokens";

interface TelemetryPlotProps {
    observations: TelemetryObservation[];
    selectedObservationId: number | null;
    onSelectObservation: (observationId: number) => void;
}

interface PlotPoint {
    observation: TelemetryObservation;
    left: `${number}%`;
    top: `${number}%`;
}

function getRiskColor(probability: number | null): string {
    if (probability === null) return colors.riskUnknown;
    if (probability >= 0.45) return colors.riskHigh;
    if (probability >= 0.3) return colors.riskElevated;
    return colors.riskLow;
}

function makePlotPoints(observations: TelemetryObservation[]): PlotPoint[] {
    const positioned = observations.filter(
        (observation) => observation.lat !== null && observation.lon !== null,
    );

    if (positioned.length === 0) return [];

    const latitudes = positioned.map(
        (observation) => observation.lat as number,
    );
    const longitudes = positioned.map(
        (observation) => observation.lon as number,
    );
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);
    const latRange = maxLat - minLat || 1;
    const lonRange = maxLon - minLon || 1;

    return positioned.map((observation) => ({
        observation,
        left: `${10 + (((observation.lon as number) - minLon) / lonRange) * 80}%`,
        top: `${10 + ((maxLat - (observation.lat as number)) / latRange) * 80}%`,
    }));
}

export function TelemetryPlot({
    observations,
    selectedObservationId,
    onSelectObservation,
}: TelemetryPlotProps) {
    const points = makePlotPoints(observations);

    return (
        <View style={styles.panel}>
            <View style={styles.panelHeader}>
                <View>
                    <Text style={styles.title}>Site overview</Text>
                    <Text style={styles.subtitle}>
                        Observation positions and risk
                    </Text>
                </View>
                <View style={styles.legend}>
                    <LegendItem color={colors.riskLow} label="Low" />
                    <LegendItem color={colors.riskElevated} label="Elevated" />
                    <LegendItem color={colors.riskHigh} label="High" />
                </View>
            </View>

            <View style={styles.plot}>
                <View style={[styles.gridLine, styles.horizontalOne]} />
                <View style={[styles.gridLine, styles.horizontalTwo]} />
                <View style={[styles.gridLine, styles.verticalOne]} />
                <View style={[styles.gridLine, styles.verticalTwo]} />

                {points.map(({ observation, left, top }) => {
                    const isSelected = observation.id === selectedObservationId;

                    return (
                        <Pressable
                            accessibilityLabel={`Observation ${observation.id}, ${Math.round(
                                (observation.crossingProbability ?? 0) * 100,
                            )} percent crossing risk`}
                            accessibilityHint="Shows observation details"
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            key={observation.id}
                            onPress={() => onSelectObservation(observation.id)}
                            style={({ pressed }) => [
                                styles.marker,
                                isSelected && styles.markerSelected,
                                pressed && styles.markerPressed,
                                {
                                    left,
                                    top,
                                    backgroundColor: getRiskColor(
                                        observation.crossingProbability,
                                    ),
                                },
                            ]}
                        />
                    );
                })}

                {points.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>
                            No positioned observations
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerLabel}>N</Text>
                <Text style={styles.footerText}>
                    {points.length} active positions
                </Text>
                <Text style={styles.footerText}>Updated from repository</Text>
            </View>
        </View>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        flex: 1,
        minWidth: 420,
        minHeight: 374,
        overflow: "hidden",
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    panelHeader: {
        minHeight: 62,
        paddingHorizontal: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        color: colors.textPrimary,
        fontSize: typography.panelTitle,
        fontWeight: "700",
    },
    subtitle: {
        marginTop: spacing.xs,
        color: colors.textMuted,
        fontSize: typography.caption,
    },
    legend: {
        flexDirection: "row",
        gap: spacing.md,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    legendDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    legendText: {
        color: colors.riskUnknown,
        fontSize: typography.caption,
    },
    plot: {
        flex: 1,
        minHeight: 270,
        margin: spacing.lg,
        overflow: "hidden",
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.mapBorder,
        backgroundColor: colors.plot,
    },
    gridLine: {
        position: "absolute",
        backgroundColor: colors.grid,
    },
    horizontalOne: {
        top: "33%",
        left: 0,
        right: 0,
        height: 1,
    },
    horizontalTwo: {
        top: "66%",
        left: 0,
        right: 0,
        height: 1,
    },
    verticalOne: {
        left: "33%",
        top: 0,
        bottom: 0,
        width: 1,
    },
    verticalTwo: {
        left: "66%",
        top: 0,
        bottom: 0,
        width: 1,
    },
    marker: {
        position: "absolute",
        width: 20,
        height: 20,
        marginLeft: -10,
        marginTop: -10,
        borderRadius: radii.full,
        borderWidth: 2,
        borderColor: colors.textPrimary,
    },
    markerSelected: {
        zIndex: 1,
        borderWidth: 4,
        borderColor: colors.white,
        transform: [{ scale: 1.2 }],
    },
    markerPressed: {
        opacity: 0.7,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: typography.body,
    },
    footer: {
        minHeight: 38,
        paddingHorizontal: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerLabel: {
        color: colors.info,
        fontSize: typography.bodySmall,
        fontWeight: "800",
    },
    footerText: {
        color: colors.textMuted,
        fontSize: typography.caption,
    },
});
