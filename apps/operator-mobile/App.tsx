import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { MetricCard } from "./src/components/MetricCard";
import { TelemetryPlot } from "./src/components/TelemetryPlot";
import { getTelemetryObservations } from "./src/data/telemetryRepository";
import {
  summarizeTelemetry,
  type TelemetryObservation,
} from "./src/domain/telemetry";

type LoadState = "loading" | "ready" | "error";

export default function App() {
  const [observations, setObservations] = useState<TelemetryObservation[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const loadObservations = useCallback(async () => {
    setLoadState("loading");

    try {
      const nextObservations = await getTelemetryObservations();
      setObservations(nextObservations);
      setLoadState("ready");
    } catch (error) {
      console.error("Unable to load telemetry observations", error);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadObservations();
  }, [loadObservations]);

  const summary = useMemo(
    () => summarizeTelemetry(observations),
    [observations],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>NOVAFLAIR FIELD OPERATIONS</Text>
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
            onPress={() => void loadObservations()}
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
          <ActivityIndicator color="#3cc8b4" size="large" />
          <Text style={styles.stateText}>Loading telemetry...</Text>
        </View>
      ) : loadState === "error" ? (
        <View style={styles.centeredState}>
          <Text style={styles.errorTitle}>Telemetry unavailable</Text>
          <Text style={styles.stateText}>Check the data source and try again.</Text>
          <Pressable onPress={() => void loadObservations()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.metricsRail}>
            <MetricCard
              accent="#f05d4f"
              label="Crossing risk"
              value={`${Math.round(summary.highestCrossingProbability * 100)}%`}
              detail="Highest current estimate"
            />
            <MetricCard
              accent="#52a8e8"
              label="Wind speed"
              value={`${summary.averageWindSpeed.toFixed(1)} m/s`}
              detail="Average across sensors"
            />
            <MetricCard
              accent="#f0b84b"
              label="Flame length"
              value={`${summary.averageFlameLength.toFixed(1)} m`}
              detail="Average observed length"
            />
            <MetricCard
              accent="#69c779"
              label="Burn time"
              value={`${summary.averageBurnTime.toFixed(0)} s`}
              detail={`${summary.positionedObservationCount} mapped observations`}
            />
          </View>

          <TelemetryPlot observations={observations} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#11171d",
  },
  header: {
    minHeight: 78,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#29323a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#71808d",
    fontSize: 10,
    fontWeight: "700",
  },
  title: {
    marginTop: 3,
    color: "#f4f6f8",
    fontSize: 22,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#69c779",
  },
  statusText: {
    color: "#b8c1c9",
    fontSize: 12,
    fontWeight: "600",
  },
  refreshButton: {
    minWidth: 82,
    minHeight: 38,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "#2a9d8f",
  },
  refreshButtonPressed: {
    opacity: 0.72,
  },
  refreshButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    flexGrow: 1,
    flexDirection: "row",
    gap: 16,
    padding: 16,
  },
  metricsRail: {
    width: 232,
    gap: 10,
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  stateText: {
    color: "#9daab4",
    fontSize: 14,
  },
  errorTitle: {
    color: "#f4f6f8",
    fontSize: 20,
    fontWeight: "700",
  },
  retryButton: {
    marginTop: 4,
    minHeight: 40,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#44515b",
  },
  retryButtonText: {
    color: "#f4f6f8",
    fontSize: 13,
    fontWeight: "700",
  },
});
