import { StyleSheet, Text, View } from "react-native";

import type { TelemetryObservation } from "../domain/telemetry";

interface TelemetryPlotProps {
    observations: TelemetryObservation[];
}

interface PlotPoint {
    observation: TelemetryObservation;
    left: `${number}%`;
    top: `${number}%`;
}

function getRiskColor(probability: number | null): string {
    if (probability === null) return "#8f9ca6";
    if (probability >= 0.45) return "#f05d4f";
    if (probability >= 0.3) return "#f0b84b";
    return "#69c779";
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

export function TelemetryPlot({ observations }: TelemetryPlotProps) {
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
                    <LegendItem color="#69c779" label="Low" />
                    <LegendItem color="#f0b84b" label="Elevated" />
                    <LegendItem color="#f05d4f" label="High" />
                </View>
            </View>

            <View style={styles.plot}>
                <View style={[styles.gridLine, styles.horizontalOne]} />
                <View style={[styles.gridLine, styles.horizontalTwo]} />
                <View style={[styles.gridLine, styles.verticalOne]} />
                <View style={[styles.gridLine, styles.verticalTwo]} />

                {points.map(({ observation, left, top }) => (
                    <View
                        accessibilityLabel={`Observation ${observation.id}, ${Math.round(
                            (observation.crossingProbability ?? 0) * 100,
                        )} percent crossing risk`}
                        key={observation.id}
                        style={[
                            styles.marker,
                            {
                                left,
                                top,
                                backgroundColor: getRiskColor(
                                    observation.crossingProbability,
                                ),
                            },
                        ]}
                    />
                ))}

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
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#29323a",
        backgroundColor: "#151d23",
    },
    panelHeader: {
        minHeight: 62,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#29323a",
    },
    title: {
        color: "#f4f6f8",
        fontSize: 16,
        fontWeight: "700",
    },
    subtitle: {
        marginTop: 2,
        color: "#71808d",
        fontSize: 10,
    },
    legend: {
        flexDirection: "row",
        gap: 12,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    legendDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    legendText: {
        color: "#8f9ca6",
        fontSize: 10,
    },
    plot: {
        flex: 1,
        minHeight: 270,
        margin: 14,
        overflow: "hidden",
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#31404a",
        backgroundColor: "#1b2a30",
    },
    gridLine: {
        position: "absolute",
        backgroundColor: "#2b4148",
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
        width: 16,
        height: 16,
        marginLeft: -8,
        marginTop: -8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "#f4f6f8",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        color: "#71808d",
        fontSize: 13,
    },
    footer: {
        minHeight: 38,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: "#29323a",
    },
    footerLabel: {
        color: "#52a8e8",
        fontSize: 12,
        fontWeight: "800",
    },
    footerText: {
        color: "#71808d",
        fontSize: 10,
    },
});
