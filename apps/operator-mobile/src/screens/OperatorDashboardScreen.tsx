import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MetricCard } from "@/components/MetricCard";
import { TelemetryPlot } from "@/components/TelemetryPlot";
import { getTelemetryObservations } from "@/data/telemetryRepository";
import {
    summarizeTelemetry,
    type TelemetryObservation,
} from "@/domain/telemetry";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

export default function OperatorDashboardScreen() {
    const [observations, setObservations] = useState<TelemetryObservation[]>(
        [],
    );
    const [loadState, setLoadState] = useState<LoadState>("loading");

    const fetchObservations = useCallback(async () => {
        try {
            const nextObservations = await getTelemetryObservations();
            setObservations(nextObservations);
            setLoadState("ready");
        } catch (error) {
            console.error("Unable to load telemetry observations", error);
            setLoadState("error");
        }
    }, []);

    const refreshObservations = useCallback(() => {
        setLoadState("loading");
        void fetchObservations();
    }, [fetchObservations]);

    useEffect(() => {
        let isActive = true;

        getTelemetryObservations().then(
            (nextObservations) => {
                if (!isActive) return;

                setObservations(nextObservations);
                setLoadState("ready");
            },
            (error: unknown) => {
                if (!isActive) return;

                console.error("Unable to load telemetry observations", error);
                setLoadState("error");
            },
        );

        return () => {
            isActive = false;
        };
    }, []);

    const summary = useMemo(
        () => summarizeTelemetry(observations),
        [observations],
    );

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.eyebrow}>
                        NOVAFLAIR FIELD OPERATIONS
                    </Text>
                    <Text style={styles.title}>Live fire telemetry</Text>
                </View>

                <View style={styles.headerActions}>
                    <View style={styles.connectionStatus}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Training data</Text>
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        disabled={loadState === "loading"}
                        onPress={refreshObservations}
                        style={({ pressed }) => [
                            styles.refreshButton,
                            pressed && styles.refreshButtonPressed,
                        ]}
                    >
                        <Text style={styles.refreshButtonText}>Refresh</Text>
                    </Pressable>
                </View>
            </View>

            {loadState === "loading" ? (
                <View style={styles.centeredState}>
                    <ActivityIndicator color={colors.accent} size="large" />
                    <Text style={styles.stateText}>Loading telemetry...</Text>
                </View>
            ) : loadState === "error" ? (
                <View style={styles.centeredState}>
                    <Text style={styles.errorTitle}>Telemetry unavailable</Text>
                    <Text style={styles.stateText}>
                        Check the data source and try again.
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        onPress={refreshObservations}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryButtonText}>Try again</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.metricsRail}>
                        <MetricCard
                            accent={colors.riskHigh}
                            label="Crossing risk"
                            value={`${Math.round(summary.highestCrossingProbability * 100)}%`}
                            detail="Highest current estimate"
                        />
                        <MetricCard
                            accent={colors.info}
                            label="Wind speed"
                            value={`${summary.averageWindSpeed.toFixed(1)} m/s`}
                            detail="Average across sensors"
                        />
                        <MetricCard
                            accent={colors.riskElevated}
                            label="Flame length"
                            value={`${summary.averageFlameLength.toFixed(1)} m`}
                            detail="Average observed length"
                        />
                        <MetricCard
                            accent={colors.riskLow}
                            label="Burn time"
                            value={`${summary.averageBurnTime.toFixed(0)} s`}
                            detail={`${summary.positionedObservationCount} mapped observations`}
                        />
                    </View>

                    <TelemetryPlot observations={observations} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        minHeight: 78,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    eyebrow: {
        color: colors.textMuted,
        fontSize: typography.caption,
        fontWeight: "700",
    },
    title: {
        marginTop: spacing.xs,
        color: colors.textPrimary,
        fontSize: typography.title,
        fontWeight: "700",
    },
    headerActions: {
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
        width: 8,
        height: 8,
        borderRadius: radii.full,
        backgroundColor: colors.riskLow,
    },
    statusText: {
        color: colors.textSecondary,
        fontSize: typography.bodySmall,
        fontWeight: "600",
    },
    refreshButton: {
        minWidth: 82,
        minHeight: 38,
        paddingHorizontal: spacing.lg,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.md,
        backgroundColor: colors.accent,
    },
    refreshButtonPressed: {
        opacity: 0.72,
    },
    refreshButtonText: {
        color: colors.white,
        fontSize: typography.body,
        fontWeight: "700",
    },
    content: {
        flexGrow: 1,
        flexDirection: "row",
        gap: spacing.lg,
        padding: spacing.lg,
    },
    metricsRail: {
        width: 232,
        gap: 10,
    },
    centeredState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.md,
        padding: spacing.xl,
    },
    stateText: {
        color: colors.riskUnknown,
        fontSize: typography.bodyLarge,
    },
    errorTitle: {
        color: colors.textPrimary,
        fontSize: typography.heading,
        fontWeight: "700",
    },
    retryButton: {
        marginTop: spacing.xs,
        minHeight: 40,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.borderStrong,
    },
    retryButtonText: {
        color: colors.textPrimary,
        fontSize: typography.body,
        fontWeight: "700",
    },
});
