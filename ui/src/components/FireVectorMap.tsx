import { type CSSProperties } from "react";
import DeckGL from "@deck.gl/react";
import type { MapViewState } from "@deck.gl/core";
import { LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_OPTIONS } from "../constants/mapTypes";

const MAP_SHELL_STYLE = {
    position: "relative",
    width: "100vw",
    height: "100vh",
} satisfies CSSProperties;

const DECK_STYLE = {
    position: "absolute",
    inset: "0",
} satisfies CSSProperties;

const INITIAL_VIEW_STATE: MapViewState = {
    longitude: -77.0931,
    latitude: 38.8123,
    zoom: 15,
};

export interface FireObservation {
    id?: number;
    telemetry_observation_id?: number;
    observed_at?: string;
    lat: number | null;
    lon: number | null;
    wind_speed_2m_mps: number;
    wind_direction_deg: number | null;
    flame_length_m: number;
    crossing_probability?: number | null;
}

interface PositionedFireObservation extends FireObservation {
    lat: number;
    lon: number;
}

interface WindVectorObservation extends PositionedFireObservation {
    wind_direction_deg: number;
    start: [number, number];
    end: [number, number];
}

interface FireVectorMapProps {
    observations?: FireObservation[];
}

function hasPosition(d: FireObservation): d is PositionedFireObservation {
    return d.lat !== null && d.lon !== null;
}

function hasWindDirection(
    d: PositionedFireObservation,
): d is PositionedFireObservation & { wind_direction_deg: number } {
    return d.wind_direction_deg !== null;
}

function makeWindArrow(
    d: PositionedFireObservation & { wind_direction_deg: number },
): WindVectorObservation {
    const length = d.wind_speed_2m_mps * 0.000055;

    const radians = (d.wind_direction_deg * Math.PI) / 180;

    const dx = Math.sin(radians) * length;
    const dy = Math.cos(radians) * length;

    return {
        ...d,
        start: [d.lon, d.lat],
        end: [d.lon + dx, d.lat + dy],
    };
}

function getRiskColor(
    d: PositionedFireObservation,
): [number, number, number, number] {
    const probability = d.crossing_probability;

    if (probability === null || probability === undefined) {
        return [235, 235, 235, 230];
    }

    if (probability >= 0.45) return [230, 35, 35, 235];
    if (probability >= 0.35) return [255, 112, 36, 235];
    if (probability >= 0.25) return [255, 200, 64, 235];
    return [92, 200, 104, 235];
}

function getMarkerRadius(d: PositionedFireObservation) {
    return Math.min(11, Math.max(5, 4 + d.flame_length_m * 1.4));
}

export default function FireVectorMap({
    observations = [],
}: FireVectorMapProps) {
    const positionedObservations = observations.filter(hasPosition);

    const windArrows = positionedObservations
        .filter(hasWindDirection)
        .map(makeWindArrow);

    const layers = [
        new LineLayer<WindVectorObservation>({
            id: "wind-vector-arrows",
            data: windArrows,
            getSourcePosition: (d) => d.start,
            getTargetPosition: (d) => d.end,
            getWidth: 2,
            getColor: [90, 190, 255, 210],
            pickable: true,
        }),

        new ScatterplotLayer<PositionedFireObservation>({
            id: "fire-points",
            data: positionedObservations,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: getMarkerRadius,
            radiusUnits: "pixels",
            radiusMinPixels: 5,
            radiusMaxPixels: 11,
            stroked: true,
            filled: true,
            getFillColor: getRiskColor,
            getLineColor: [18, 24, 30, 240],
            getLineWidth: 1.5,
            lineWidthUnits: "pixels",
            pickable: true,
        }),
    ];

    return (
        <div style={MAP_SHELL_STYLE}>
            <DeckGL
                initialViewState={INITIAL_VIEW_STATE}
                controller={true}
                layers={layers}
                style={DECK_STYLE}
            >
                <Map mapStyle={MAP_STYLE_OPTIONS[4].style} />
            </DeckGL>
        </div>
    );
}
