import DeckGL from "@deck.gl/react";
import { LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const INITIAL_VIEW_STATE = {
    longitude: -77.0931,
    latitude: 38.8123,
    zoom: 14,
    pitch: 0,
    bearing: 0,
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
    const length = d.wind_speed_2m_mps * 0.00008;

    const radians = (d.wind_direction_deg * Math.PI) / 180;

    const dx = Math.sin(radians) * length;
    const dy = Math.cos(radians) * length;

    return {
        ...d,
        start: [d.lon, d.lat],
        end: [d.lon + dx, d.lat + dy],
    };
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
            getWidth: 3,
            getColor: [40, 140, 255],
            pickable: true,
        }),

        new ScatterplotLayer<PositionedFireObservation>({
            id: "fire-points",
            data: positionedObservations,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => Math.max(5, d.flame_length_m * 8),
            radiusUnits: "meters",
            getFillColor: (d) => {
                const probability = d.crossing_probability;

                if (probability === null || probability === undefined) {
                    return [120, 120, 120, 180];
                }

                if (probability >= 0.45) return [180, 0, 0, 180];
                if (probability >= 0.35) return [255, 90, 0, 180];
                if (probability >= 0.25) return [255, 180, 0, 180];
                return [80, 180, 80, 180];
            },
            pickable: true,
        }),
    ];

    return (
        <DeckGL
            initialViewState={INITIAL_VIEW_STATE}
            controller={true}
            layers={layers}
        >
            <Map mapStyle="https://demotiles.maplibre.org/style.json" />
        </DeckGL>
    );
}
