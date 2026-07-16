import {
    Fragment,
    useCallback,
    useMemo,
    useRef,
    type ComponentProps,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";

import type { MapLayerVisibility } from "@/components/MissionHud";
import {
    getInitialRegion,
    getMarkerColor,
    getMarkerDiameter,
    getWindEndpoint,
    isPositionedObservation,
} from "@/components/observationMapHelpers";
import type { TelemetryObservation } from "@/domain/telemetry";
import { colors, radii, typography } from "@/theme/tokens";

interface ObservationMapProps {
    layers: MapLayerVisibility;
    observations: TelemetryObservation[];
    selectedObservationId: number | null;
    onSelectObservation: (observationId: number) => void;
}

const mapStyle: NonNullable<
    ComponentProps<typeof MapView>["customMapStyle"]
> = [
    { elementType: "geometry", stylers: [{ color: "#60776b" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#102028" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#91a597" }] },
    {
        featureType: "administrative",
        elementType: "geometry",
        stylers: [{ color: "#52685f" }],
    },
    {
        featureType: "landscape.natural",
        elementType: "geometry",
        stylers: [{ color: "#718b79" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#6f8d75" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#656f69" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#59636b" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#3f6870" }],
    },
];

const hideLabelsStyle: NonNullable<
    ComponentProps<typeof MapView>["customMapStyle"]
> = [{ elementType: "labels", stylers: [{ visibility: "off" }] }];

export function ObservationMap({
    layers,
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
    const pathCoordinates = useMemo(
        () => [...coordinates].reverse(),
        [coordinates],
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
            edgePadding: { top: 160, right: 330, bottom: 150, left: 236 },
        });
        hasFitInitialCameraRef.current = true;
    }, [coordinates]);

    return (
        <View style={styles.canvas}>
            {initialRegion === null ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No positioned observations</Text>
                </View>
            ) : (
                <MapView
                    accessibilityLabel="Observation map"
                    customMapStyle={[
                        ...mapStyle,
                        ...(layers.labels ? [] : hideLabelsStyle),
                    ]}
                    initialRegion={initialRegion}
                    loadingBackgroundColor={colors.plot}
                    loadingEnabled
                    loadingIndicatorColor={colors.info}
                    mapPadding={{ top: 52, right: 24, bottom: 24, left: 24 }}
                    onMapReady={fitInitialCamera}
                    pitchEnabled={false}
                    ref={mapRef}
                    rotateEnabled={false}
                    showsBuildings={false}
                    showsCompass={false}
                    showsIndoors={false}
                    showsPointsOfInterests={false}
                    showsTraffic={false}
                    style={styles.map}
                    toolbarEnabled={false}
                >
                    {layers.path && pathCoordinates.length > 1 && (
                        <Polyline
                            coordinates={pathCoordinates}
                            lineCap="round"
                            lineJoin="round"
                            strokeColor={colors.warning}
                            strokeWidth={4}
                        />
                    )}
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
                                    {layers.wind &&
                                        observation.windDirectionDeg !== null && (
                                        <Polyline
                                            coordinates={[
                                                coordinate,
                                                getWindEndpoint(observation),
                                            ]}
                                            lineCap="round"
                                            strokeColor={colors.info}
                                            strokeWidth={3}
                                        />
                                    )}
                                    {layers.observations && <Marker
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
                                    </Marker>}
                                </Fragment>
                            );
                        })}
                </MapView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    canvas: {
        flex: 1,
        overflow: "hidden",
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
        borderColor: colors.white,
        shadowColor: "#000000",
        shadowOpacity: 0.45,
        shadowRadius: 4,
        elevation: 5,
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
});
