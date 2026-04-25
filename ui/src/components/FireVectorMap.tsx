import DeckGL from "@deck.gl/react";
import { LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import Map from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const SATELLITE_MAP_STYLE: StyleSpecification = {
    version: 8,
    sources: {
        "esri-world-imagery": {
            type: "raster",
            tiles: [
                "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution:
                "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        },
    },
    layers: [
        {
            id: "esri-world-imagery",
            type: "raster",
            source: "esri-world-imagery",
        },
    ],
};

const INITIAL_VIEW_STATE = {
    longitude: -77.0931,
    latitude: 38.8123,
    zoom: 15,
    pitch: 42,
    bearing: -18,
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

function getRiskColor(d: PositionedFireObservation): [number, number, number, number] {
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
        <DeckGL
            initialViewState={INITIAL_VIEW_STATE}
            controller={true}
            layers={layers}
        >
            <Map mapStyle={SATELLITE_MAP_STYLE} />
        </DeckGL>
    );
}
