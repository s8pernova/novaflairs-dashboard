import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    AlertsPanel,
    FlameTrend,
    LayerControls,
    MissionStatus,
    RiskGauge,
    TopBar,
    WindConditions,
    type MapLayerVisibility,
} from "@/components/MissionHud";
import { ObservationDetails } from "@/components/ObservationDetails";
import { ObservationMap } from "@/components/ObservationMap";
import { isTelemetryStale, summarizeTelemetry } from "@/domain/telemetry";
import { useTelemetryFeed } from "@/hooks/useTelemetryFeed";
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

const initialLayers: MapLayerVisibility = {
    observations: true,
    wind: true,
    path: true,
    labels: true,
};

export default function OperatorDashboardScreen() {
    const {
        observations,
        loadState,
        isRefreshing,
        hasRefreshError,
        lastSuccessfulRefreshAt,
        refresh,
    } = useTelemetryFeed(DEMO_SCENARIO_ID);
    const [selectedObservationId, setSelectedObservationId] = useState<
        number | null
    >(null);
    const [layers, setLayers] =
        useState<MapLayerVisibility>(initialLayers);
    const [nowMs, setNowMs] = useState(() => Date.now());

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
    const latestObservation = observations[0] ?? null;
    const connectionState: ConnectionState =
        loadState !== "ready"
            ? loadState
            : observations.length === 0
              ? "empty"
              : hasRefreshError || isTelemetryStale(observations, nowMs)
                ? "stale"
                : "ready";
    const connectionStatus = connectionStatuses[connectionState];

    const selectObservation = useCallback((observationId: number) => {
        setSelectedObservationId((currentId) =>
            currentId === observationId ? null : observationId,
        );
    }, []);
    const toggleLayer = useCallback((layer: keyof MapLayerVisibility) => {
        setLayers((current) => ({ ...current, [layer]: !current[layer] }));
    }, []);

    return (
        <SafeAreaView style={styles.screen}>
            {loadState === "ready" && observations.length > 0 && (
                <View style={StyleSheet.absoluteFill}>
                    <ObservationMap
                        layers={layers}
                        observations={observations}
                        onSelectObservation={selectObservation}
                        selectedObservationId={selectedObservationId}
                    />
                    <View pointerEvents="none" style={styles.mapTint} />
                </View>
            )}

            <TopBar
                connectionColor={connectionStatus.color}
                connectionLabel={connectionStatus.label}
                isRefreshing={isRefreshing}
                lastSuccessfulRefreshAt={lastSuccessfulRefreshAt}
                onRefresh={() => void refresh()}
                refreshDisabled={loadState === "loading" || isRefreshing}
            />

            {loadState === "loading" ? (
                <StatePanel
                    message="Establishing the live operator feed."
                    title="Loading telemetry..."
                >
                    <ActivityIndicator color={colors.info} size="large" />
                </StatePanel>
            ) : loadState === "error" ? (
                <StatePanel
                    message="Check the data source and try again."
                    title="Telemetry unavailable"
                >
                    <Pressable
                        accessibilityLabel="Try again"
                        accessibilityRole="button"
                        onPress={() => void refresh()}
                        style={({ pressed }) => [
                            styles.retryButton,
                            pressed && styles.buttonPressed,
                        ]}
                    >
                        <Text style={styles.retryButtonText}>TRY AGAIN</Text>
                    </Pressable>
                </StatePanel>
            ) : observations.length === 0 ? (
                <StatePanel
                    message="This scenario has not produced any observations."
                    title="No telemetry yet"
                >
                    <Pressable
                        accessibilityLabel="Refresh empty telemetry feed"
                        accessibilityRole="button"
                        onPress={() => void refresh()}
                        style={({ pressed }) => [
                            styles.retryButton,
                            pressed && styles.buttonPressed,
                        ]}
                    >
                        <Text style={styles.retryButtonText}>REFRESH</Text>
                    </Pressable>
                </StatePanel>
            ) : latestObservation !== null ? (
                <View pointerEvents="box-none" style={styles.hudLayer}>
                    <View style={styles.layerPosition}>
                        <LayerControls layers={layers} onToggle={toggleLayer} />
                    </View>
                    <View style={styles.gaugePosition}>
                        <RiskGauge
                            probability={summary.highestCrossingProbability}
                        />
                    </View>
                    <View style={styles.rightPosition}>
                        {selectedObservation === null ? (
                            <MissionStatus
                                observations={observations}
                                summary={summary}
                            />
                        ) : (
                            <ObservationDetails
                                observation={selectedObservation}
                                onClear={() => setSelectedObservationId(null)}
                            />
                        )}
                    </View>
                    <View style={styles.bottomHud}>
                        <WindConditions observation={latestObservation} />
                        <FlameTrend observations={observations} />
                        <AlertsPanel
                            connectionLabel={connectionStatus.label}
                            observations={observations}
                            probability={summary.highestCrossingProbability}
                        />
                    </View>
                </View>
            ) : null}
        </SafeAreaView>
    );
}

function StatePanel({
    children,
    message,
    title,
}: {
    children: React.ReactNode;
    message: string;
    title: string;
}) {
    return (
        <View style={styles.centeredState}>
            <View style={styles.statePanel}>
                <Text style={styles.stateEyebrow}>NOVAFLAIR OPERATOR</Text>
                <Text style={styles.stateTitle}>{title}</Text>
                <Text style={styles.stateText}>{message}</Text>
                <View style={styles.stateAction}>{children}</View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        overflow: "hidden",
        backgroundColor: colors.background,
    },
    mapTint: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(7, 14, 10, 0.18)",
    },
    hudLayer: {
        flex: 1,
    },
    layerPosition: {
        position: "absolute",
        top: spacing.md,
        left: spacing.md,
    },
    gaugePosition: {
        position: "absolute",
        top: spacing.md,
        left: "50%",
        marginLeft: -143,
    },
    rightPosition: {
        position: "absolute",
        top: spacing.md,
        right: spacing.md,
    },
    bottomHud: {
        position: "absolute",
        right: spacing.md,
        bottom: spacing.md,
        left: spacing.md,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: spacing.md,
    },
    centeredState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
        backgroundColor: colors.background,
    },
    statePanel: {
        width: 430,
        alignItems: "center",
        padding: 32,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceGlass,
    },
    stateEyebrow: {
        color: colors.info,
        fontSize: typography.caption,
        fontWeight: "900",
    },
    stateTitle: {
        marginTop: spacing.md,
        color: colors.textPrimary,
        fontSize: typography.heading,
        fontWeight: "900",
    },
    stateText: {
        marginTop: spacing.sm,
        color: colors.textMuted,
        fontSize: typography.bodyLarge,
        textAlign: "center",
    },
    stateAction: {
        minHeight: 42,
        marginTop: spacing.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    retryButton: {
        minWidth: 112,
        minHeight: 38,
        paddingHorizontal: spacing.lg,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: `${colors.info}66`,
        backgroundColor: `${colors.info}1f`,
    },
    retryButtonText: {
        color: colors.info,
        fontSize: typography.bodySmall,
        fontWeight: "900",
    },
    buttonPressed: { opacity: 0.66 },
});
