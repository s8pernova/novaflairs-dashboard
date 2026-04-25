import { useState, type CSSProperties } from "react";
import DeckGL from "@deck.gl/react";
import { LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import Map from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type MapStyleValue = StyleSpecification | string;

interface MapStyleOption {
    id: string;
    label: string;
    style: MapStyleValue;
}

function rasterMapStyle(
    sourceId: string,
    tiles: string[],
    attribution: string,
): StyleSpecification {
    return {
        version: 8,
        sources: {
            [sourceId]: {
                type: "raster",
                tiles,
                tileSize: 256,
                attribution,
            },
        },
        layers: [
            {
                id: sourceId,
                type: "raster",
                source: sourceId,
            },
        ],
    };
}

const MAP_STYLE_OPTIONS: MapStyleOption[] = [
    {
        id: "satellite",
        label: "Satellite",
        style: rasterMapStyle(
            "esri-world-imagery",
            [
                "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        ),
    },
    {
        id: "osm",
        label: "OpenStreetMap",
        style: rasterMapStyle(
            "openstreetmap",
            ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            "&copy; OpenStreetMap contributors",
        ),
    },
    {
        id: "carto-light",
        label: "Light",
        style: rasterMapStyle(
            "carto-light",
            [
                "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
                "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
                "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
            ],
            "&copy; OpenStreetMap contributors &copy; CARTO",
        ),
    },
    {
        id: "carto-dark",
        label: "Dark",
        style: rasterMapStyle(
            "carto-dark",
            [
                "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            ],
            "&copy; OpenStreetMap contributors &copy; CARTO",
        ),
    },
    {
        id: "carto-voyager",
        label: "Voyager",
        style: rasterMapStyle(
            "carto-voyager",
            [
                "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
                "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
                "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
            ],
            "&copy; OpenStreetMap contributors &copy; CARTO",
        ),
    },
    {
        id: "terrain",
        label: "Terrain",
        style: rasterMapStyle(
            "opentopomap",
            ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
            "Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap",
        ),
    },
    {
        id: "maplibre-demo",
        label: "MapLibre Demo",
        style: "https://demotiles.maplibre.org/style.json",
    },
    {
        id: "maplibre-plain",
        label: "MapLibre Plain",
        style: "https://demotiles.maplibre.org/tiles-mlt/plain.json",
    },
];

const DEFAULT_MAP_STYLE_ID = "satellite";

const MAP_CONTROL_STYLE = {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
    display: "grid",
    gap: 4,
    padding: "8px 10px",
    borderRadius: 6,
    background: "rgba(15, 23, 42, 0.84)",
    color: "#f8fafc",
    boxShadow: "0 10px 28px rgba(0, 0, 0, 0.28)",
    backdropFilter: "blur(8px)",
} satisfies CSSProperties;

const MAP_SELECT_STYLE = {
    minWidth: 168,
    border: "1px solid rgba(148, 163, 184, 0.62)",
    borderRadius: 4,
    background: "#0f172a",
    color: "#f8fafc",
    fontSize: 13,
    lineHeight: 1.2,
    padding: "6px 8px",
} satisfies CSSProperties;

const MAP_LABEL_STYLE = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "uppercase",
} satisfies CSSProperties;

const MAP_SHELL_STYLE = {
    position: "relative",
    width: "100vw",
    height: "100vh",
} satisfies CSSProperties;

const DECK_STYLE = {
    position: "absolute",
    inset: "0",
} satisfies CSSProperties;

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
    const [mapStyleId, setMapStyleId] = useState(DEFAULT_MAP_STYLE_ID);
    const selectedMapStyle =
        MAP_STYLE_OPTIONS.find((option) => option.id === mapStyleId) ??
        MAP_STYLE_OPTIONS[0];
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
            <label style={MAP_CONTROL_STYLE}>
                <span style={MAP_LABEL_STYLE}>Map Style</span>
                <select
                    value={mapStyleId}
                    onChange={(event) => setMapStyleId(event.target.value)}
                    style={MAP_SELECT_STYLE}
                >
                    {MAP_STYLE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>

            <DeckGL
                initialViewState={INITIAL_VIEW_STATE}
                controller={true}
                layers={layers}
                style={DECK_STYLE}
            >
                <Map mapStyle={selectedMapStyle.style} />
            </DeckGL>
        </div>
    );
}
