import type { LatLng, Region } from "react-native-maps";

import type {
    TelemetryObservation,
    TelemetryRiskLevel,
} from "@/domain/telemetry";
import { colors } from "@/theme/tokens";

export type PositionedObservation = TelemetryObservation & {
    lat: number;
    lon: number;
};

const METERS_PER_LATITUDE_DEGREE = 111_320;
const MINIMUM_REGION_DELTA = 0.002;
const REGION_PADDING_FACTOR = 1.5;

export function isPositionedObservation(
    observation: TelemetryObservation,
): observation is PositionedObservation {
    return observation.lat !== null && observation.lon !== null;
}

export function getMarkerColor(
    riskLevel: TelemetryRiskLevel | null,
): string {
    switch (riskLevel) {
        case "moderate":
            return colors.riskLow;
        case "transition":
            return colors.riskElevated;
        case "high":
        case "severe":
            return colors.riskHigh;
        default:
            return colors.riskUnknown;
    }
}

export function getMarkerDiameter(flameLengthM: number): number {
    const boundedFlameLength = Math.min(Math.max(flameLengthM, 0), 6);
    return 16 + boundedFlameLength * 2;
}

export function getInitialRegion(coordinates: LatLng[]): Region | null {
    if (coordinates.length === 0) return null;

    const latitudes = coordinates.map((coordinate) => coordinate.latitude);
    const longitudes = coordinates.map((coordinate) => coordinate.longitude);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);

    return {
        latitude: (minLatitude + maxLatitude) / 2,
        longitude: (minLongitude + maxLongitude) / 2,
        latitudeDelta: Math.max(
            (maxLatitude - minLatitude) * REGION_PADDING_FACTOR,
            MINIMUM_REGION_DELTA,
        ),
        longitudeDelta: Math.max(
            (maxLongitude - minLongitude) * REGION_PADDING_FACTOR,
            MINIMUM_REGION_DELTA,
        ),
    };
}

export function getWindEndpoint(
    observation: PositionedObservation,
): LatLng {
    if (observation.windDirectionDeg === null) {
        return { latitude: observation.lat, longitude: observation.lon };
    }

    const downwindBearingDeg = (observation.windDirectionDeg + 180) % 360;
    const bearingRad = (downwindBearingDeg * Math.PI) / 180;
    const vectorLengthM = 12 + Math.min(observation.windSpeedMps, 15) * 3;
    const northM = Math.cos(bearingRad) * vectorLengthM;
    const eastM = Math.sin(bearingRad) * vectorLengthM;
    const longitudeScale =
        METERS_PER_LATITUDE_DEGREE *
        Math.max(Math.cos((observation.lat * Math.PI) / 180), 0.01);

    return {
        latitude: observation.lat + northM / METERS_PER_LATITUDE_DEGREE,
        longitude: observation.lon + eastM / longitudeScale,
    };
}
