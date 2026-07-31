import type { StyleSpecification } from "maplibre-gl";

// Types

export type MapStyleValue = StyleSpecification | string;

export interface MapStyleOption {
    id: string;
    label: string;
    style: MapStyleValue;
}

// Helpers

export function rasterMapStyle(
    sourceId: string,
    tiles: string[],
    attribution: string,
): StyleSpecification {
    return {
        version: 8,
        sources: {
            [sourceId]: { type: "raster", tiles, tileSize: 256, attribution },
        },
        layers: [{ id: sourceId, type: "raster", source: sourceId }],
    };
}

const CARTO_ATTR = "&copy; OpenStreetMap contributors &copy; CARTO";
const ESRI = "https://services.arcgisonline.com/ArcGIS/rest/services";
const ESRI_ATTR = "Tiles &copy; Esri";

function cartoTiles(path: string): string[] {
    return ["a", "b", "c"].map(
        (s) => `https://${s}.basemaps.cartocdn.com/${path}/{z}/{x}/{y}.png`,
    );
}

function esriTiles(service: string): string[] {
    return [`${ESRI}/${service}/MapServer/tile/{z}/{y}/{x}`];
}

// Map Style Catalogue

export const MAP_STYLE_OPTIONS: MapStyleOption[] = [
    {
        id: "satellite",
        label: "Satellite",
        style: rasterMapStyle(
            "esri-satellite",
            esriTiles("World_Imagery"),
            `${ESRI_ATTR}, Maxar, Earthstar Geographics, and the GIS User Community`,
        ),
    },
    {
        id: "osm",
        label: "OpenStreetMap",
        style: rasterMapStyle(
            "osm",
            ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            "&copy; OpenStreetMap contributors",
        ),
    },
    {
        id: "carto-light",
        label: "Carto Light",
        style: rasterMapStyle("carto-light", cartoTiles("light_all"), CARTO_ATTR),
    },
    {
        id: "carto-dark",
        label: "Carto Dark",
        style: rasterMapStyle("carto-dark", cartoTiles("dark_all"), CARTO_ATTR),
    },
    {
        id: "carto-voyager",
        label: "Voyager",
        style: rasterMapStyle(
            "carto-voyager",
            cartoTiles("rastertiles/voyager"),
            CARTO_ATTR,
        ),
    },
    {
        id: "carto-voyager-nolabels",
        label: "Voyager (No Labels)",
        style: rasterMapStyle(
            "carto-voyager-nolabels",
            cartoTiles("rastertiles/voyager_nolabels"),
            CARTO_ATTR,
        ),
    },
    {
        id: "carto-dark-nolabels",
        label: "Dark (No Labels)",
        style: rasterMapStyle(
            "carto-dark-nolabels",
            cartoTiles("dark_nolabels"),
            CARTO_ATTR,
        ),
    },
    {
        id: "esri-topo",
        label: "ESRI Topo",
        style: rasterMapStyle(
            "esri-topo",
            esriTiles("World_Topo_Map"),
            `${ESRI_ATTR} &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community`,
        ),
    },
    {
        id: "esri-dark-gray",
        label: "ESRI Dark Gray",
        style: rasterMapStyle(
            "esri-dark-gray",
            esriTiles("Canvas/World_Dark_Gray_Base"),
            `${ESRI_ATTR} &mdash; Esri, DeLorme, NAVTEQ`,
        ),
    },
    {
        id: "esri-natgeo",
        label: "NatGeo",
        style: rasterMapStyle(
            "esri-natgeo",
            esriTiles("NatGeo_World_Map"),
            `${ESRI_ATTR} &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC`,
        ),
    },
    {
        id: "esri-physical",
        label: "Physical",
        style: rasterMapStyle(
            "esri-physical",
            esriTiles("World_Physical_Map"),
            `${ESRI_ATTR} &mdash; US National Park Service`,
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
];
