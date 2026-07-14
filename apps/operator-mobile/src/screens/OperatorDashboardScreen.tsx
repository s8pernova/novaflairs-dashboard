import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ObservationDetails } from "@/components/ObservationDetails";
import { TelemetryPlot } from "@/components/TelemetryPlot";
import { getTelemetryObservations } from "@/data/telemetryRepository";
import {
    isTelemetryStale,
    summarizeTelemetry,
    type TelemetryObservation,
} from "@/domain/telemetry";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";
type ConnectionState = LoadState | "empty" | "stale";

const DEMO_SCENARIO_ID = 1;

const connectionStatuses: Record<
    ConnectionState,
    { label: string; color: string }
> = {
    loading: { label: "Loading", color: colors.info },
    ready: { label: "Live", color: colors.riskLow },
    empty: { label: "Empty", color: colors.riskUnknown },
    stale: { label: "Stale", color: colors.riskElevated },
    error: { label: "Unavailable", color: colors.riskHigh },
};

export default function OperatorDashboardScreen() {
    const [observations, setObservations] = useState<TelemetryObservation[]>(
        [],
    );
    const [loadState, setLoadState] = useState<LoadState>("loading");
    const [selectedObservationId, setSelectedObservationId] = useState<
        number | null
    >(null);
    const [lastSuccessfulRefreshAt, setLastSuccessfulRefreshAt] = useState<
        number | null
    >(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const isMountedRef = useRef(true);

    const acceptObservations = useCallback(
        (nextObservations: TelemetryObservation[]) => {
            if (!isMountedRef.current) return;

            setObservations(nextObservations);
            setSelectedObservationId((currentId) =>
                nextObservations.some(
                    (observation) => observation.id === currentId,
                )
                    ? currentId
                    : null,
            );
            const refreshedAt = Date.now();
            setLastSuccessfulRefreshAt(refreshedAt);
            setNowMs(refreshedAt);
            setLoadState("ready");
        },
        [],
    );

    const rejectObservations = useCallback((error: unknown) => {
        if (!isMountedRef.current) return;

        console.error("Unable to load telemetry observations", error);
        setLoadState("error");
    }, []);

    const fetchObservations = useCallback(async () => {
        try {
            acceptObservations(
                await getTelemetryObservations(DEMO_SCENARIO_ID),
            );
        } catch (error) {
            rejectObservations(error);
        }
    }, [acceptObservations, rejectObservations]);

    const refreshObservations = useCallback(() => {
        setLoadState("loading");
        void fetchObservations();
    }, [fetchObservations]);

    useEffect(() => {
        isMountedRef.current = true;
        getTelemetryObservations(DEMO_SCENARIO_ID).then(
            acceptObservations,
            rejectObservations,
        );
        return () => {
            isMountedRef.current = false;
        };
    }, [acceptObservations, rejectObservations]);

    useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 5_000);
        return () => clearInterval(timer);
    }, []);

    const summary = useMemo(
        () => summarizeTelemetry(observations),
        [observations],
    );
    const selectedObservation =
        observations.find(
            (observation) => observation.id === selectedObservationId,
        ) ?? null;
    const connectionState: ConnectionState =
        loadState !== "ready"
            ? loadState
            : observations.length === 0
              ? "empty"
              : isTelemetryStale(observations, nowMs)
                ? "stale"
                : "ready";
    const connectionStatus = connectionStatuses[connectionState];

    const selectObservation = useCallback((observationId: number) => {
        setSelectedObservationId((currentId) =>
            currentId === observationId ? null : observationId,
        );
    }, []);

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
                    <View
                        accessibilityLabel={`Data status: ${connectionStatus.label}`}
                        style={styles.connectionStatus}
                    >
                        <View
                            style={[
                                styles.statusDot,
                                { backgroundColor: connectionStatus.color },
                            ]}
                        />
                        <Text style={styles.statusText}>
                            {connectionStatus.label}
                        </Text>
                    </View>
                    {lastSuccessfulRefreshAt !== null && (
                        <Text style={styles.lastRefreshText}>
                            Updated{" "}
                            {new Date(
                                lastSuccessfulRefreshAt,
                            ).toLocaleTimeString()}
                        </Text>
                    )}
                    <Pressable
                        accessibilityLabel="Refresh telemetry"
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
            ) : observations.length === 0 ? (
                <View style={styles.centeredState}>
                    <Text style={styles.emptyTitle}>No telemetry yet</Text>
                    <Text style={styles.stateText}>
                        This scenario has not produced any observations.
                    </Text>
                    <Pressable
                        accessibilityLabel="Refresh empty telemetry feed"
                        accessibilityRole="button"
                        onPress={refreshObservations}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryButtonText}>Refresh</Text>
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

                    <TelemetryPlot
                        observations={observations}
                        onSelectObservation={selectObservation}
                        selectedObservationId={selectedObservationId}
                    />
                    <ObservationDetails
                        observation={selectedObservation}
                        onClear={() => setSelectedObservationId(null)}
                    />
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
    },
    statusText: {
        color: colors.textSecondary,
        fontSize: typography.bodySmall,
        fontWeight: "600",
    },
    lastRefreshText: {
        color: colors.textMuted,
        fontSize: typography.caption,
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
    emptyTitle: {
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
