import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { getTelemetryObservations } from "@/data/telemetryRepository";
import type { TelemetryObservation } from "@/domain/telemetry";
import OperatorDashboardScreen from "@/screens/OperatorDashboardScreen";

jest.mock("@/data/telemetryRepository", () => ({
    getTelemetryObservations: jest.fn(),
}));

jest.mock("@/components/ObservationMap", () => {
    const React = jest.requireActual("react");
    const { Pressable } = jest.requireActual("react-native");

    return {
        ObservationMap: ({ observations, onSelectObservation }: {
            observations: TelemetryObservation[];
            onSelectObservation: (observationId: number) => void;
        }) => {
            const observation = observations[0];
            return React.createElement(Pressable, {
                accessibilityLabel: `Observation ${observation.id}, ${Math.round(
                    (observation.crossingProbability ?? 0) * 100,
                )} percent crossing risk`,
                onPress: () => onSelectObservation(observation.id),
            });
        },
    };
});

const mockGetTelemetryObservations = jest.mocked(getTelemetryObservations);

function makeObservation(
    overrides: Partial<TelemetryObservation> = {},
): TelemetryObservation {
    return {
        id: 286568,
        scenarioId: 1,
        firebreakSegmentId: 1,
        droneId: "drone-01",
        observedAt: new Date().toISOString(),
        lat: 38.8123,
        lon: -77.0931,
        altitudeM: 42,
        windSpeedMps: 4.2,
        windDirectionDeg: 315,
        flameLengthM: 2.4,
        burnTimeS: 40,
        qualityScore: 0.92,
        predictionResultId: 101,
        modelRunId: 1,
        crossingProbability: 0.28,
        riskLevel: "transition",
        predictedCrossingDecision: "NO",
        predictionComputedAt: new Date().toISOString(),
        ...overrides,
    };
}

describe("OperatorDashboardScreen", () => {
    beforeEach(() => {
        mockGetTelemetryObservations.mockReset();
    });

    it("shows an explicit loading state while the first request is pending", async () => {
        mockGetTelemetryObservations.mockImplementation(
            () => new Promise(() => undefined),
        );
        const screen = await render(<OperatorDashboardScreen />);

        expect(screen.getByLabelText("Data status: Loading")).toBeTruthy();
        expect(screen.getByText("Loading telemetry...")).toBeTruthy();
    });

    it("renders live observations and exposes selectable details", async () => {
        mockGetTelemetryObservations.mockResolvedValue([makeObservation()]);
        const screen = await render(<OperatorDashboardScreen />);

        await waitFor(() => {
            expect(screen.getByLabelText("Data status: Live")).toBeTruthy();
        });

        await fireEvent.press(
            screen.getByLabelText("Observation 286568, 28 percent crossing risk"),
        );

        await waitFor(() => {
            expect(screen.getByText("#286568")).toBeTruthy();
        });
        expect(screen.getAllByText("28%")).toHaveLength(2);
        expect(screen.getByText("Transition")).toBeTruthy();

        await fireEvent.press(
            screen.getByLabelText("Clear selected observation"),
        );
        await waitFor(() => {
            expect(screen.getByText("MISSION STATUS")).toBeTruthy();
        });
    });

    it("toggles operational map layers through accessible switches", async () => {
        mockGetTelemetryObservations.mockResolvedValue([makeObservation()]);
        const screen = await render(<OperatorDashboardScreen />);

        await waitFor(() => {
            expect(screen.getByLabelText("Hide wind vectors")).toBeTruthy();
        });

        await fireEvent.press(screen.getByLabelText("Hide wind vectors"));

        await waitFor(() => {
            expect(screen.getByLabelText("Show wind vectors")).toBeTruthy();
        });
    });

    it("distinguishes an empty feed from a request failure", async () => {
        mockGetTelemetryObservations.mockResolvedValue([]);
        const screen = await render(<OperatorDashboardScreen />);

        await waitFor(() => {
            expect(screen.getByLabelText("Data status: Empty")).toBeTruthy();
        });
        expect(screen.getByText("No telemetry yet")).toBeTruthy();
    });

    it("recovers from an unavailable feed through Retry", async () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
        mockGetTelemetryObservations
            .mockRejectedValueOnce(new Error("invalid project URL"))
            .mockResolvedValueOnce([makeObservation()]);
        const screen = await render(<OperatorDashboardScreen />);

        await waitFor(() => {
            expect(screen.getByText("Telemetry unavailable")).toBeTruthy();
        });

        expect(consoleError).toHaveBeenCalledWith(
            "Unable to load telemetry observations",
            expect.any(Error),
        );

        await fireEvent.press(screen.getByLabelText("Try again"));

        await waitFor(() => {
            expect(screen.getByLabelText("Data status: Live")).toBeTruthy();
        });
    });

    it("refreshes an already visible feed without returning to loading", async () => {
        mockGetTelemetryObservations
            .mockResolvedValueOnce([makeObservation()])
            .mockResolvedValueOnce([
                makeObservation({
                    id: 286569,
                    crossingProbability: 0.65,
                    riskLevel: "severe",
                    predictedCrossingDecision: "YES",
                }),
            ]);
        const screen = await render(<OperatorDashboardScreen />);

        await waitFor(() => {
            expect(screen.getByLabelText("Data status: Live")).toBeTruthy();
        });

        fireEvent.press(screen.getByLabelText("Refresh telemetry"));

        await waitFor(() => {
            expect(
                screen.getByLabelText("Crossing probability 65 percent"),
            ).toBeTruthy();
        });
        expect(mockGetTelemetryObservations).toHaveBeenCalledTimes(2);
        expect(screen.queryByText("Loading telemetry...")).toBeNull();
    });

    it("labels observations older than thirty seconds as stale", async () => {
        mockGetTelemetryObservations.mockResolvedValue([
            makeObservation({ observedAt: "2026-01-01T00:00:00Z" }),
        ]);
        const screen = await render(<OperatorDashboardScreen />);

        await waitFor(() => {
            expect(screen.getByLabelText("Data status: Stale")).toBeTruthy();
        });
    });
});
