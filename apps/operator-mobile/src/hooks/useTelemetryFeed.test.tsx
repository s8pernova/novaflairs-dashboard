import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import type { TelemetryObservation } from "@/domain/telemetry";
import {
    TELEMETRY_POLL_INTERVAL_MS,
    useTelemetryFeed,
    type TelemetryLoader,
} from "@/hooks/useTelemetryFeed";

jest.mock("@/data/telemetryRepository", () => ({
    listTelemetryObservations: jest.fn(),
}));

const observation: TelemetryObservation = {
    id: 1,
    scenarioId: 1,
    firebreakSegmentId: 1,
    droneId: "drone-01",
    observedAt: "2026-07-14T03:00:00Z",
    lat: 38.8123,
    lon: -77.0931,
    altitudeM: 42,
    windSpeedMps: 6,
    windDirectionDeg: 217,
    flameLengthM: 2,
    burnTimeS: 40,
    qualityScore: 0.92,
    predictionResultId: 101,
    modelRunId: 1,
    crossingProbability: 0.28,
    riskLevel: "transition",
    predictedCrossingDecision: "NO",
    predictionComputedAt: "2026-07-14T03:00:01Z",
};

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
}

describe("useTelemetryFeed", () => {
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    const removeAppStateListener = jest.fn();

    beforeEach(() => {
        jest.useFakeTimers();
        appStateListener = undefined;
        removeAppStateListener.mockClear();
        Object.defineProperty(AppState, "currentState", {
            configurable: true,
            value: "active",
        });
        jest.spyOn(AppState, "addEventListener").mockImplementation(
            ((_event, listener) => {
                appStateListener = listener;
                return { remove: removeAppStateListener };
            }) as typeof AppState.addEventListener,
        );
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("polls while active and removes its lifecycle subscription", async () => {
        const loadTelemetry = jest
            .fn<ReturnType<TelemetryLoader>, Parameters<TelemetryLoader>>()
            .mockResolvedValue([observation]);
        const hook = await renderHook(() =>
            useTelemetryFeed(1, loadTelemetry),
        );

        await act(flushPromises);
        expect(loadTelemetry).toHaveBeenCalledTimes(1);
        expect(hook.result.current.loadState).toBe("ready");

        await act(async () => {
            jest.advanceTimersByTime(TELEMETRY_POLL_INTERVAL_MS);
            await flushPromises();
        });

        expect(loadTelemetry).toHaveBeenCalledTimes(2);
        await hook.unmount();
        expect(removeAppStateListener).toHaveBeenCalledTimes(1);
    });

    it("stops in the background and refreshes once on resume", async () => {
        const loadTelemetry = jest
            .fn<ReturnType<TelemetryLoader>, Parameters<TelemetryLoader>>()
            .mockResolvedValue([observation]);
        const hook = await renderHook(() =>
            useTelemetryFeed(1, loadTelemetry),
        );
        await act(flushPromises);

        await act(async () => {
            appStateListener?.("background");
            jest.advanceTimersByTime(TELEMETRY_POLL_INTERVAL_MS * 2);
            await flushPromises();
        });
        expect(loadTelemetry).toHaveBeenCalledTimes(1);

        await act(async () => {
            appStateListener?.("active");
            await flushPromises();
        });
        expect(loadTelemetry).toHaveBeenCalledTimes(2);

        await act(async () => {
            jest.advanceTimersByTime(TELEMETRY_POLL_INTERVAL_MS);
            await flushPromises();
        });
        expect(loadTelemetry).toHaveBeenCalledTimes(3);
        await hook.unmount();
    });

    it("deduplicates refreshes while a request is in flight", async () => {
        let resolveRefresh: ((value: TelemetryObservation[]) => void) | undefined;
        const loadTelemetry = jest
            .fn<ReturnType<TelemetryLoader>, Parameters<TelemetryLoader>>()
            .mockResolvedValueOnce([observation])
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveRefresh = resolve;
                    }),
            );
        const hook = await renderHook(() =>
            useTelemetryFeed(1, loadTelemetry),
        );
        await act(flushPromises);

        let firstRefresh: Promise<boolean> | undefined;
        let secondRefresh: Promise<boolean> | undefined;
        await act(async () => {
            firstRefresh = hook.result.current.refresh();
            secondRefresh = hook.result.current.refresh();
            await flushPromises();
        });

        await expect(secondRefresh).resolves.toBe(false);
        expect(loadTelemetry).toHaveBeenCalledTimes(2);

        await act(async () => {
            resolveRefresh?.([observation]);
            await firstRefresh;
        });
        expect(hook.result.current.isRefreshing).toBe(false);
        await hook.unmount();
    });

    it("preserves good data and marks a refresh failure", async () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
        const loadTelemetry = jest
            .fn<ReturnType<TelemetryLoader>, Parameters<TelemetryLoader>>()
            .mockResolvedValueOnce([observation])
            .mockRejectedValueOnce(new Error("network unavailable"));
        const hook = await renderHook(() =>
            useTelemetryFeed(1, loadTelemetry),
        );
        await act(flushPromises);

        await act(async () => {
            await hook.result.current.refresh();
        });

        expect(hook.result.current.observations).toEqual([observation]);
        expect(hook.result.current.loadState).toBe("ready");
        expect(hook.result.current.hasRefreshError).toBe(true);
        expect(consoleError).toHaveBeenCalledWith(
            "Unable to load telemetry observations",
            expect.any(Error),
        );
        await hook.unmount();
    });
});
