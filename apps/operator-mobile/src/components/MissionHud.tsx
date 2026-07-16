import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { TelemetryObservation, TelemetrySummary } from "@/domain/telemetry";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export interface MapLayerVisibility {
    observations: boolean;
    wind: boolean;
    path: boolean;
    labels: boolean;
}

interface TopBarProps {
    connectionLabel: string;
    connectionColor: string;
    isRefreshing: boolean;
    lastSuccessfulRefreshAt: number | null;
    onRefresh: () => void;
    refreshDisabled: boolean;
}

export function TopBar({
    connectionLabel,
    connectionColor,
    isRefreshing,
    lastSuccessfulRefreshAt,
    onRefresh,
    refreshDisabled,
}: TopBarProps) {
    return (
        <View style={styles.topBar}>
            <View style={styles.brandBlock}>
                <Text style={styles.brand}>NOVAFLAIR</Text>
                <View style={styles.brandDivider} />
                <Text style={styles.missionName}>BRUSHFIRE WESTLINE 01</Text>
            </View>
            <View style={styles.topBarActions}>
                <View
                    accessibilityLabel={`Data status: ${connectionLabel}`}
                    style={styles.connectionStatus}
                >
                    <View
                        style={[
                            styles.statusDot,
                            { backgroundColor: connectionColor },
                        ]}
                    />
                    <Text style={styles.statusText}>{connectionLabel}</Text>
                </View>
                {lastSuccessfulRefreshAt !== null && (
                    <Text style={styles.timestamp}>
                        {new Date(lastSuccessfulRefreshAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                            second: "2-digit",
                        })}
                    </Text>
                )}
                {isRefreshing && (
                    <ActivityIndicator color={colors.info} size="small" />
                )}
                <Pressable
                    accessibilityLabel="Refresh telemetry"
                    accessibilityRole="button"
                    disabled={refreshDisabled}
                    onPress={onRefresh}
                    style={({ pressed }) => [
                        styles.refreshButton,
                        pressed && styles.pressed,
                        refreshDisabled && styles.disabled,
                    ]}
                >
                    <Text style={styles.refreshButtonText}>REFRESH</Text>
                </Pressable>
            </View>
        </View>
    );
}

interface LayerControlsProps {
    layers: MapLayerVisibility;
    onToggle: (layer: keyof MapLayerVisibility) => void;
}

const layerRows: {
    key: keyof MapLayerVisibility;
    label: string;
    color: string;
}[] = [
    { key: "observations", label: "Fire observations", color: colors.riskHigh },
    { key: "wind", label: "Wind vectors", color: colors.info },
    { key: "path", label: "Observed path", color: colors.riskElevated },
    { key: "labels", label: "Map labels", color: colors.riskLow },
];

export function LayerControls({ layers, onToggle }: LayerControlsProps) {
    return (
        <HudPanel style={styles.layerPanel}>
            <PanelTitle>MAP LAYERS</PanelTitle>
            <View style={styles.layerList}>
                {layerRows.map((layer) => {
                    const enabled = layers[layer.key];
                    return (
                        <Pressable
                            accessibilityLabel={`${enabled ? "Hide" : "Show"} ${layer.label.toLowerCase()}`}
                            accessibilityRole="switch"
                            accessibilityState={{ checked: enabled }}
                            key={layer.key}
                            onPress={() => onToggle(layer.key)}
                            style={({ pressed }) => [
                                styles.layerRow,
                                {
                                    borderColor: enabled
                                        ? `${layer.color}66`
                                        : colors.border,
                                },
                                pressed && styles.pressed,
                            ]}
                        >
                            <View
                                style={[
                                    styles.layerSwatch,
                                    { backgroundColor: layer.color },
                                    !enabled && styles.layerSwatchDisabled,
                                ]}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.layerLabel,
                                    !enabled && styles.layerLabelDisabled,
                                ]}
                            >
                                {layer.label}
                            </Text>
                            <Text
                                style={[
                                    styles.layerState,
                                    { color: enabled ? layer.color : colors.disabled },
                                ]}
                            >
                                {enabled ? "ON" : "OFF"}
                            </Text>
                        </Pressable>
                    );
                })}
                <View style={[styles.layerRow, styles.layerDisabled]}>
                    <View
                        style={[
                            styles.layerSwatch,
                            { backgroundColor: "#a78bfa" },
                            styles.layerSwatchDisabled,
                        ]}
                    />
                    <Text style={[styles.layerLabel, styles.layerLabelDisabled]}>
                        Drone coverage
                    </Text>
                    <Text style={[styles.layerState, { color: colors.disabled }]}>N/A</Text>
                </View>
            </View>
        </HudPanel>
    );
}

export function RiskGauge({ probability }: { probability: number }) {
    const percentage = Math.round(probability * 100);
    const riskColor =
        percentage >= 50
            ? colors.riskHigh
            : percentage >= 25
              ? colors.riskElevated
              : colors.riskLow;

    return (
        <HudPanel
            accessibilityLabel={`Crossing probability ${percentage} percent`}
            style={styles.gaugePanel}
        >
            <View style={[styles.gaugeArc, { borderColor: riskColor }]} />
            <View style={styles.gaugeReadout}>
                <Text style={[styles.gaugeValue, { color: riskColor }]}>
                    {percentage}%
                </Text>
                <Text style={styles.gaugeLabel}>CROSSING PROBABILITY</Text>
            </View>
        </HudPanel>
    );
}

interface MissionStatusProps {
    observations: TelemetryObservation[];
    summary: TelemetrySummary;
}

export function MissionStatus({ observations, summary }: MissionStatusProps) {
    const qualityValues = observations.flatMap((observation) =>
        observation.qualityScore === null ? [] : [observation.qualityScore],
    );
    const averageQuality =
        qualityValues.length === 0
            ? null
            : qualityValues.reduce((total, value) => total + value, 0) /
              qualityValues.length;
    const predictionCount = observations.filter(
        (observation) => observation.crossingProbability !== null,
    ).length;
    const cue =
        summary.highestCrossingProbability >= 0.35
            ? "Review the highest-risk observation and verify firebreak response."
            : "Continue monitoring the firefront and incoming telemetry.";

    return (
        <HudPanel style={styles.missionPanel}>
            <PanelTitle>MISSION STATUS</PanelTitle>
            <View style={styles.metricGrid}>
                <CompactMetric
                    accent={colors.riskLow}
                    detail="on map"
                    label="POSITIONED"
                    value={`${summary.positionedObservationCount}`}
                />
                <CompactMetric
                    accent={colors.warning}
                    detail="joined rows"
                    label="PREDICTIONS"
                    value={`${predictionCount}`}
                />
            </View>
            <CompactMetric
                accent={colors.info}
                detail={`${qualityValues.length} scored observations`}
                label="SIGNAL QUALITY"
                value={
                    averageQuality === null
                        ? "PENDING"
                        : `${Math.round(averageQuality * 100)}%`
                }
                wide
            />
            <View style={styles.cueBlock}>
                <Text style={styles.cueLabel}>OPERATOR CUE</Text>
                <Text style={styles.cueText}>{cue}</Text>
                <Text style={styles.simulationLabel}>SIMULATION DATA</Text>
            </View>
        </HudPanel>
    );
}

export function WindConditions({
    observation,
}: {
    observation: TelemetryObservation;
}) {
    const direction = observation.windDirectionDeg;
    return (
        <HudPanel style={styles.windPanel}>
            <PanelTitle>WIND CONDITIONS</PanelTitle>
            <View style={styles.windHeading}>
                <Text style={styles.windDegrees}>
                    {direction === null ? "--" : `${Math.round(direction)} deg`}
                </Text>
                <Text style={styles.windCompass}>
                    {direction === null ? "--" : getCompassDirection(direction)}
                </Text>
            </View>
            <Text style={styles.windSpeed}>
                {(observation.windSpeedMps * 3.6).toFixed(1)} km/h / {" "}
                {observation.windSpeedMps.toFixed(1)} m/s
            </Text>
            <Text numberOfLines={1} style={styles.sourceLabel}>
                {observation.droneId} / {formatAge(observation.observedAt)}
            </Text>
        </HudPanel>
    );
}

export function FlameTrend({
    observations,
}: {
    observations: TelemetryObservation[];
}) {
    const trend = observations.slice(0, 8).reverse();
    const maxFlame = Math.max(...trend.map((item) => item.flameLengthM), 1);
    const latestFlame = observations[0]?.flameLengthM ?? 0;

    return (
        <HudPanel style={styles.trendPanel}>
            <PanelTitle>FLAME TREND</PanelTitle>
            <View style={styles.trendContent}>
                <View style={styles.bars}>
                    {trend.map((observation) => {
                        const ratio = observation.flameLengthM / maxFlame;
                        return (
                            <View
                                accessibilityLabel={`${observation.flameLengthM.toFixed(1)} meter flame length`}
                                key={observation.id}
                                style={[
                                    styles.flameBar,
                                    {
                                        height: 10 + ratio * 34,
                                        backgroundColor:
                                            ratio > 0.72
                                                ? colors.riskHigh
                                                : colors.warning,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>
                <Text style={styles.latestFlame}>
                    {latestFlame.toFixed(1)}m{"\n"}latest
                </Text>
            </View>
        </HudPanel>
    );
}

interface AlertsPanelProps {
    connectionLabel: string;
    observations: TelemetryObservation[];
    probability: number;
}

export function AlertsPanel({
    connectionLabel,
    observations,
    probability,
}: AlertsPanelProps) {
    const latest = observations[0];
    const severity =
        connectionLabel === "Stale"
            ? "STALE"
            : probability >= 0.5
              ? "SEVERE"
              : probability >= 0.25
                ? "WATCH"
                : "STABLE";
    const accent =
        severity === "SEVERE"
            ? colors.riskHigh
            : severity === "WATCH" || severity === "STALE"
              ? colors.riskElevated
              : colors.riskLow;
    const message =
        connectionLabel === "Stale"
            ? "Telemetry is older than 30 seconds. Refresh or replay the scenario."
            : latest.predictedCrossingDecision === "YES"
              ? `Crossing predicted from observation #${latest.id}. Review the selected point.`
              : `No crossing predicted at observation #${latest.id}. Continue monitoring.`;

    return (
        <HudPanel style={styles.alertPanel}>
            <View style={styles.alertHeader}>
                <PanelTitle>ALERTS</PanelTitle>
                <View style={[styles.severityChip, { borderColor: accent }]}>
                    <Text style={[styles.severityText, { color: accent }]}>
                        {severity}
                    </Text>
                </View>
            </View>
            <Text numberOfLines={2} style={styles.alertText}>
                {message}
            </Text>
        </HudPanel>
    );
}

export function HudPanel({
    children,
    style,
    ...props
}: React.ComponentProps<typeof View>) {
    return (
        <View {...props} style={[styles.panel, style]}>
            {children}
        </View>
    );
}

function PanelTitle({ children }: { children: string }) {
    return <Text style={styles.panelTitle}>{children}</Text>;
}

function CompactMetric({
    accent,
    detail,
    label,
    value,
    wide = false,
}: {
    accent: string;
    detail: string;
    label: string;
    value: string;
    wide?: boolean;
}) {
    return (
        <View style={[styles.compactMetric, wide && styles.compactMetricWide]}>
            <View style={[styles.metricAccent, { backgroundColor: accent }]} />
            <Text style={styles.metricLabel}>{label}</Text>
            <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[styles.metricValue, { color: accent }]}
            >
                {value}
            </Text>
            <Text numberOfLines={1} style={styles.metricDetail}>
                {detail}
            </Text>
        </View>
    );
}

export function getCompassDirection(directionDeg: number): string {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return directions[Math.round((((directionDeg % 360) + 360) % 360) / 45) % 8];
}

function formatAge(observedAt: string): string {
    const ageSeconds = Math.max(
        0,
        Math.round((Date.now() - Date.parse(observedAt)) / 1_000),
    );
    if (!Number.isFinite(ageSeconds)) return "time unavailable";
    return ageSeconds < 60 ? `${ageSeconds}s ago` : `${Math.floor(ageSeconds / 60)}m ago`;
}

const styles = StyleSheet.create({
    panel: {
        overflow: "hidden",
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceGlass,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
        elevation: 8,
    },
    topBar: {
        height: 46,
        paddingHorizontal: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surfaceGlassStrong,
    },
    brandBlock: {
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
    brand: {
        color: colors.white,
        fontSize: typography.body,
        fontWeight: "900",
    },
    brandDivider: {
        width: 1,
        height: 18,
        backgroundColor: colors.borderStrong,
    },
    missionName: {
        color: colors.textMuted,
        fontSize: typography.caption,
        fontWeight: "700",
    },
    topBarActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
    connectionStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: radii.full,
    },
    statusText: {
        color: colors.textSecondary,
        fontSize: typography.bodySmall,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    timestamp: {
        color: colors.textMuted,
        fontSize: typography.caption,
    },
    refreshButton: {
        minWidth: 72,
        minHeight: 30,
        paddingHorizontal: spacing.md,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: `${colors.info}66`,
        backgroundColor: `${colors.info}1f`,
    },
    refreshButtonText: {
        color: colors.info,
        fontSize: typography.caption,
        fontWeight: "900",
    },
    pressed: { opacity: 0.66 },
    disabled: { opacity: 0.42 },
    layerPanel: {
        width: 216,
        padding: spacing.md,
    },
    panelTitle: {
        color: colors.white,
        fontSize: typography.bodySmall,
        fontWeight: "900",
    },
    layerList: {
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    layerRow: {
        minHeight: 36,
        paddingHorizontal: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: radii.sm,
        borderWidth: 1,
        backgroundColor: "rgba(255, 255, 255, 0.045)",
    },
    layerDisabled: { opacity: 0.58 },
    layerSwatch: {
        width: 8,
        height: 8,
        borderRadius: radii.full,
    },
    layerSwatchDisabled: { opacity: 0.42 },
    layerLabel: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: typography.caption,
        fontWeight: "600",
    },
    layerLabelDisabled: { color: colors.textMuted },
    layerState: {
        minWidth: 24,
        fontSize: 8,
        fontWeight: "900",
        textAlign: "right",
    },
    gaugePanel: {
        width: 286,
        height: 132,
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: spacing.md,
    },
    gaugeArc: {
        position: "absolute",
        top: 16,
        width: 150,
        height: 75,
        borderWidth: 12,
        borderBottomWidth: 0,
        borderTopLeftRadius: 76,
        borderTopRightRadius: 76,
        opacity: 0.92,
    },
    gaugeReadout: { alignItems: "center" },
    gaugeValue: {
        fontSize: 31,
        fontWeight: "900",
    },
    gaugeLabel: {
        marginTop: 2,
        color: colors.white,
        fontSize: 9,
        fontWeight: "900",
    },
    missionPanel: {
        width: 304,
        padding: spacing.lg,
        gap: spacing.md,
    },
    metricGrid: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    compactMetric: {
        flex: 1,
        minHeight: 76,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        overflow: "hidden",
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "rgba(3, 9, 13, 0.74)",
    },
    compactMetricWide: { flex: 0, width: "100%" },
    metricAccent: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
    },
    metricLabel: {
        color: colors.textMuted,
        fontSize: 8,
        fontWeight: "800",
    },
    metricValue: {
        marginTop: 2,
        fontSize: typography.heading,
        fontWeight: "900",
    },
    metricDetail: {
        marginTop: 1,
        color: colors.textSecondary,
        fontSize: 9,
    },
    cueBlock: {
        paddingTop: spacing.xs,
    },
    cueLabel: {
        color: colors.textMuted,
        fontSize: 9,
        fontWeight: "900",
    },
    cueText: {
        marginTop: spacing.xs,
        color: colors.textPrimary,
        fontSize: typography.bodySmall,
        fontWeight: "700",
        lineHeight: 16,
    },
    simulationLabel: {
        alignSelf: "flex-start",
        marginTop: spacing.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.full,
        overflow: "hidden",
        color: colors.riskElevated,
        fontSize: 8,
        fontWeight: "900",
        backgroundColor: `${colors.riskElevated}1f`,
    },
    windPanel: {
        width: 258,
        height: 118,
        padding: spacing.md,
    },
    windHeading: {
        marginTop: spacing.sm,
        flexDirection: "row",
        alignItems: "baseline",
        gap: spacing.md,
    },
    windDegrees: {
        color: colors.info,
        fontSize: typography.heading,
        fontWeight: "900",
    },
    windCompass: {
        color: colors.warning,
        fontSize: typography.body,
        fontWeight: "900",
    },
    windSpeed: {
        marginTop: spacing.xs,
        color: colors.textSecondary,
        fontSize: typography.bodySmall,
        fontWeight: "600",
    },
    sourceLabel: {
        marginTop: spacing.xs,
        color: colors.riskLow,
        fontSize: 9,
        fontWeight: "700",
    },
    trendPanel: {
        width: 278,
        height: 118,
        padding: spacing.md,
    },
    trendContent: {
        flex: 1,
        marginTop: spacing.sm,
        flexDirection: "row",
        alignItems: "flex-end",
    },
    bars: {
        flex: 1,
        height: 48,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: spacing.sm,
    },
    flameBar: {
        width: 10,
        borderRadius: 3,
    },
    latestFlame: {
        color: colors.warning,
        fontSize: typography.bodySmall,
        fontWeight: "900",
        lineHeight: 14,
    },
    alertPanel: {
        flex: 1,
        minWidth: 330,
        height: 118,
        padding: spacing.md,
    },
    alertHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
    severityChip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radii.full,
        borderWidth: 1,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
    },
    severityText: {
        fontSize: 8,
        fontWeight: "900",
    },
    alertText: {
        marginTop: spacing.md,
        color: colors.textSecondary,
        fontSize: typography.bodySmall,
        fontWeight: "600",
        lineHeight: 17,
    },
});
