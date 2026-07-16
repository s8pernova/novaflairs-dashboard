import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TelemetryObservation } from "@/domain/telemetry";
import { colors, radii, spacing, typography } from "@/theme/tokens";

interface ObservationDetailsProps {
    observation: TelemetryObservation | null;
    onClear: () => void;
}

function formatNullableNumber(
    value: number | null,
    digits: number,
    unit: string,
): string {
    return value === null
        ? "Not available"
        : `${value.toFixed(digits)} ${unit}`;
}

function formatPercentage(value: number | null): string {
    return value === null ? "Pending" : `${Math.round(value * 100)}%`;
}

function formatRiskLevel(value: string | null): string {
    if (value === null) return "Pending";
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function ObservationDetails({
    observation,
    onClear,
}: ObservationDetailsProps) {
    if (observation === null) {
        return (
            <View style={[styles.panel, styles.emptyPanel]}>
                <Text style={styles.emptyTitle}>No observation selected</Text>
                <Text style={styles.emptyText}>
                    Select a plotted observation to inspect its current
                    readings.
                </Text>
            </View>
        );
    }

    return (
        <View
            accessibilityLabel={`Details for observation ${observation.id}`}
            style={styles.panel}
        >
            <View style={styles.header}>
                <View style={styles.headerCopy}>
                    <Text style={styles.eyebrow}>OBSERVATION</Text>
                    <Text
                        adjustsFontSizeToFit
                        numberOfLines={1}
                        style={styles.title}
                    >
                        #{observation.id}
                    </Text>
                </View>
                <Pressable
                    accessibilityLabel="Clear selected observation"
                    accessibilityRole="button"
                    onPress={onClear}
                    style={({ pressed }) => [
                        styles.clearButton,
                        pressed && styles.clearButtonPressed,
                    ]}
                >
                    <Text style={styles.clearButtonText}>Clear</Text>
                </Pressable>
            </View>

            <View style={styles.rows}>
                <DetailRow
                    label="Observed"
                    value={new Date(observation.observedAt).toLocaleString()}
                />
                <DetailRow
                    label="Wind"
                    value={`${observation.windSpeedMps.toFixed(1)} m/s at ${formatNullableNumber(
                        observation.windDirectionDeg,
                        0,
                        "deg",
                    )}`}
                />
                <DetailRow
                    label="Flame length"
                    value={`${observation.flameLengthM.toFixed(1)} m`}
                />
                <DetailRow
                    label="Burn time"
                    value={`${observation.burnTimeS.toFixed(0)} s`}
                />
                <DetailRow
                    label="Quality"
                    value={formatPercentage(observation.qualityScore)}
                />
                <DetailRow
                    label="Crossing risk"
                    value={formatPercentage(observation.crossingProbability)}
                />
                <DetailRow
                    label="Risk level"
                    value={formatRiskLevel(observation.riskLevel)}
                />
                <DetailRow
                    label="Predicted crossing"
                    value={observation.predictedCrossingDecision ?? "Pending"}
                />
            </View>
        </View>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={styles.rowValue}
            >
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        width: 304,
        minHeight: 328,
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
    emptyPanel: {
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontSize: typography.panelTitle,
        fontWeight: "700",
        textAlign: "center",
    },
    emptyText: {
        marginTop: spacing.sm,
        color: colors.textMuted,
        fontSize: typography.bodySmall,
        lineHeight: 18,
        textAlign: "center",
    },
    header: {
        minHeight: 52,
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerCopy: {
        flex: 1,
        minWidth: 0,
    },
    eyebrow: {
        color: colors.textMuted,
        fontSize: typography.caption,
        fontWeight: "700",
    },
    title: {
        marginTop: 2,
        color: colors.textPrimary,
        fontSize: typography.panelTitle,
        fontWeight: "700",
    },
    clearButton: {
        minWidth: 52,
        minHeight: 30,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.borderStrong,
    },
    clearButtonPressed: {
        opacity: 0.66,
    },
    clearButtonText: {
        color: colors.textSecondary,
        fontSize: typography.bodySmall,
        fontWeight: "700",
    },
    rows: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    row: {
        minHeight: 32,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    rowLabel: {
        color: colors.textMuted,
        fontSize: 9,
    },
    rowValue: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: typography.bodySmall,
        fontWeight: "600",
        textAlign: "right",
    },
});
