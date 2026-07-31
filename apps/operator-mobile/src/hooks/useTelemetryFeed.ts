import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { getTelemetryObservations } from "@/data/telemetryRepository";
import type { TelemetryObservation } from "@/domain/telemetry";

export type TelemetryLoadState = "loading" | "ready" | "error";
export type TelemetryLoader = (
    scenarioId: number,
) => Promise<TelemetryObservation[]>;

export const TELEMETRY_POLL_INTERVAL_MS = 8_000;

export function useTelemetryFeed(
    scenarioId: number,
    loadTelemetry: TelemetryLoader = getTelemetryObservations,
) {
    const [observations, setObservations] = useState<TelemetryObservation[]>([]);
    const [loadState, setLoadState] =
        useState<TelemetryLoadState>("loading");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasRefreshError, setHasRefreshError] = useState(false);
    const [lastSuccessfulRefreshAt, setLastSuccessfulRefreshAt] = useState<
        number | null
    >(null);
    const observationsRef = useRef<TelemetryObservation[]>([]);
    const isMountedRef = useRef(true);
    const isRequestInFlightRef = useRef(false);

    const acceptObservations = useCallback(
        (nextObservations: TelemetryObservation[]) => {
            if (!isMountedRef.current) return;

            observationsRef.current = nextObservations;
            setObservations(nextObservations);
            setLastSuccessfulRefreshAt(Date.now());
            setHasRefreshError(false);
            setLoadState("ready");
        },
        [],
    );

    const rejectObservations = useCallback((error: unknown) => {
        if (!isMountedRef.current) return;

        console.error("Unable to load telemetry observations", error);
        if (observationsRef.current.length > 0) {
            setHasRefreshError(true);
            setLoadState("ready");
        } else {
            setLoadState("error");
        }
    }, []);

    const refresh = useCallback(async (): Promise<boolean> => {
        if (isRequestInFlightRef.current) return false;

        isRequestInFlightRef.current = true;
        const hasExistingData = observationsRef.current.length > 0;
        if (isMountedRef.current) {
            if (hasExistingData) {
                setIsRefreshing(true);
            } else {
                setLoadState("loading");
            }
        }

        try {
            acceptObservations(await loadTelemetry(scenarioId));
            return true;
        } catch (error) {
            rejectObservations(error);
            return false;
        } finally {
            isRequestInFlightRef.current = false;
            if (isMountedRef.current) setIsRefreshing(false);
        }
    }, [acceptObservations, loadTelemetry, rejectObservations, scenarioId]);

    useEffect(() => {
        isMountedRef.current = true;
        isRequestInFlightRef.current = true;
        loadTelemetry(scenarioId)
            .then(acceptObservations, rejectObservations)
            .finally(() => {
                isRequestInFlightRef.current = false;
            });

        return () => {
            isMountedRef.current = false;
        };
    }, [acceptObservations, loadTelemetry, rejectObservations, scenarioId]);

    useEffect(() => {
        let pollTimer: ReturnType<typeof setInterval> | null = null;

        const stopPolling = () => {
            if (pollTimer === null) return;
            clearInterval(pollTimer);
            pollTimer = null;
        };
        const startPolling = () => {
            if (pollTimer !== null) return;
            pollTimer = setInterval(() => {
                void refresh();
            }, TELEMETRY_POLL_INTERVAL_MS);
        };
        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (nextState === "active") {
                void refresh();
                startPolling();
            } else {
                stopPolling();
            }
        };

        if (AppState.currentState === "active") startPolling();
        const subscription = AppState.addEventListener(
            "change",
            handleAppStateChange,
        );

        return () => {
            stopPolling();
            subscription.remove();
        };
    }, [refresh]);

    return {
        observations,
        loadState,
        isRefreshing,
        hasRefreshError,
        lastSuccessfulRefreshAt,
        refresh,
    };
}
