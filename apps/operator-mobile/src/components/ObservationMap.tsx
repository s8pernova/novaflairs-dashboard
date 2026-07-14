import {
    Fragment,
    useCallback,
    useMemo,
    useRef,
    type ComponentProps,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";

import {
    getInitialRegion,
    getMarkerColor,
    getMarkerDiameter,
    getWindEndpoint,
    isPositionedObservation,
} from "@/components/observationMapHelpers";
import type { TelemetryObservation } from "@/domain/telemetry";
import { colors, radii, spacing, typography } from "@/theme/tokens";

interface ObservationMapProps {
    observations: TelemetryObservation[];
    selectedObservationId: number | null;
    onSelectObservation: (observationId: number) => void;
}

const mapStyle: NonNullable<
    ComponentProps<typeof MapView>["customMapStyle"]
> = [
    { elementType: "geometry", stylers: [{ color: "#1b2a30" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#9aa8b2" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#11171d" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#31404a" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#13222b" }] },
];

export function ObservationMap({
    observations,
    selectedObservationId,
    onSelectObservation,
}: ObservationMapProps) {
    const mapRef = useRef<MapView>(null);
    const hasFitInitialCameraRef = useRef(false);
    const positionedObservations = useMemo(
        () => observations.filter(isPositionedObservation),
        [observations],
    );
    const coordinates = useMemo<LatLng[]>(
        () =>
            positionedObservations.map((observation) => ({
                latitude: observation.lat,
                longitude: observation.lon,
            })),
        [positionedObservations],
    );
    const initialRegion = useMemo(
        () => getInitialRegion(coordinates),
        [coordinates],
    );

    const fitInitialCamera = useCallback(() => {
        if (
            hasFitInitialCameraRef.current ||
            coordinates.length === 0 ||
            mapRef.current === null
        ) {
            return;
        }

        mapRef.current.fitToCoordinates(coordinates, {
            animated: false,
            edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        });
        hasFitInitialCameraRef.current = true;
    }, [coordinates]);

    return (
        <View style={styles.panel}>
            <View style={styles.panelHeader}>
                <View>
                    <Text style={styles.title}>Site overview</Text>
                    <Text style={styles.subtitle}>
                        Observation positions, wind, and risk
                    </Text>
                </View>
                <View style={styles.legend}>
                    <LegendItem color={colors.riskLow} label="Moderate" />
                    <LegendItem color={colors.riskElevated} label="Transition" />
                    <LegendItem color={colors.riskHigh} label="High" />
                </View>
            </View>

            <View style={styles.mapFrame}>
                {initialRegion === null ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>
                            No positioned observations
                        </Text>
                    </View>
                ) : (
                    <MapView
                        accessibilityLabel="Observation map"
                        customMapStyle={[...mapStyle]}
                        initialRegion={initialRegion}
                        loadingBackgroundColor={colors.plot}
                        loadingEnabled
                        loadingIndicatorColor={colors.accent}
                        mapPadding={{ top: 12, right: 12, bottom: 12, left: 12 }}
                        onMapReady={fitInitialCamera}
                        pitchEnabled={false}
                        ref={mapRef}
                        rotateEnabled={false}
                        showsBuildings={false}
                        showsCompass
                        showsIndoors={false}
                        showsPointsOfInterests={false}
                        showsTraffic={false}
                        style={styles.map}
                        toolbarEnabled={false}
                    >
                        {positionedObservations.map((observation) => {
                            const coordinate = {
                                latitude: observation.lat,
                                longitude: observation.lon,
                            };
                            const isSelected =
                                observation.id === selectedObservationId;
                            const diameter = getMarkerDiameter(
                                observation.flameLengthM,
                            );

                            return (
                                <Fragment key={observation.id}>
                                    {observation.windDirectionDeg !== null && (
                                        <Polyline
                                            coordinates={[
                                                coordinate,
                                                getWindEndpoint(observation),
                                            ]}
                                            lineCap="round"
                                            strokeColor={colors.info}
                                            strokeWidth={2}
                                        />
                                    )}
                                    <Marker
                                        accessibilityLabel={`Observation ${observation.id}, ${Math.round(
                                            (observation.crossingProbability ?? 0) *
                                                100,
                                        )} percent crossing risk`}
                                        accessibilityRole="button"
                                        accessibilityState={{
                                            selected: isSelected,
                                        }}
                                        anchor={{ x: 0.5, y: 0.5 }}
                                        coordinate={coordinate}
                                        onPress={() =>
                                            onSelectObservation(observation.id)
                                        }
                                        stopPropagation
                                    >
                                        <View
                                            style={[
                                                styles.marker,
                                                {
                                                    width: diameter,
                                                    height: diameter,
                                                    backgroundColor:
                                                        getMarkerColor(
                                                            observation.riskLevel,
                                                        ),
                                                },
                                                isSelected &&
                                                    styles.markerSelected,
                                            ]}
                                        />
                                    </Marker>
                                </Fragment>
                            );
                        })}
                    </MapView>
                )}
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerLabel}>N</Text>
                <Text style={styles.footerText}>
                    {positionedObservations.length} mapped observations
                </Text>
                <Text style={styles.footerText}>Wind vectors point downwind</Text>
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
        minWidth: 360,
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
        borderRadius: radii.full,
    },
    legendText: {
        color: colors.riskUnknown,
        fontSize: typography.caption,
    },
    mapFrame: {
        flex: 1,
        minHeight: 270,
        margin: spacing.lg,
        overflow: "hidden",
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.mapBorder,
        backgroundColor: colors.plot,
    },
    map: {
        flex: 1,
    },
    marker: {
        minWidth: 16,
        minHeight: 16,
        borderRadius: radii.full,
        borderWidth: 2,
        borderColor: colors.textPrimary,
    },
    markerSelected: {
        borderWidth: 4,
        borderColor: colors.white,
        transform: [{ scale: 1.15 }],
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
