import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { SiteListItem } from "@/lib/atlas";
import { cn } from "@/lib/utils";

type Basemap = "street" | "aerial";

export type FlowSegment = {
  from: [number, number];
  to: [number, number];
};

export type HubRings = {
  lat: number;
  lon: number;
  km: number[];
};

type Props = {
  sites: SiteListItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  basemap: Basemap;
  flowLines?: FlowSegment[];
  accentHubId?: number | null;
  rings?: HubRings | null;
  fitToken?: string;
};

type Layers = {
  street: import("leaflet").TileLayer;
  aerial: import("leaflet").TileLayer;
  outline: import("leaflet").Polygon;
};

/** Simplified Sicily shoreline (lat, lon) — geography, not store data. */
const SICILY_OUTLINE: [number, number][] = [
  [38.26, 12.43],
  [38.2, 12.9],
  [38.17, 13.35],
  [38.2, 13.85],
  [38.3, 14.55],
  [38.27, 15.15],
  [38.27, 15.65],
  [38.07, 15.52],
  [37.82, 15.27],
  [37.55, 15.18],
  [37.25, 15.22],
  [36.95, 15.13],
  [36.68, 15.08],
  [36.7, 14.75],
  [36.78, 14.35],
  [36.82, 13.95],
  [37.08, 13.55],
  [37.32, 13.25],
  [37.55, 12.88],
  [37.85, 12.48],
  [38.05, 12.42],
  [38.26, 12.43],
];

function pinClass(site: SiteListItem, active: boolean, hubAccent: boolean) {
  const kind =
    site.kindSlug === "warehouse"
      ? "is-hub"
      : site.ownershipSlug === "affiliated"
        ? "is-aff"
        : "is-store";
  const extra = hubAccent && site.kindSlug !== "warehouse" ? " is-fed" : "";
  const recon = !site.giftCard && site.kindSlug !== "warehouse" ? " is-recon" : "";
  return `atlas-pin ${kind}${active ? " is-active" : ""}${extra}${recon}`;
}

function applyBasemap(
  map: import("leaflet").Map,
  layers: Layers,
  mode: Basemap,
) {
  if (mode === "aerial") {
    if (!map.hasLayer(layers.aerial)) layers.aerial.addTo(map);
    if (map.hasLayer(layers.street)) map.removeLayer(layers.street);
    layers.outline.setStyle({ color: "#eceae4", weight: 1.2 });
  } else {
    if (!map.hasLayer(layers.street)) layers.street.addTo(map);
    if (map.hasLayer(layers.aerial)) map.removeLayer(layers.aerial);
    layers.outline.setStyle({ color: "#121210", weight: 1.1 });
  }
}

export function SicilyMap({
  sites,
  selectedId,
  onSelect,
  basemap,
  flowLines = [],
  accentHubId = null,
  rings = null,
  fitToken = "",
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layersRef = useRef<Layers | null>(null);
  const basemapRef = useRef(basemap);
  const markersRef = useRef<Map<number, import("leaflet").Marker>>(new Map());
  const flowsRef = useRef<import("leaflet").Polyline[]>([]);
  const ringsRef = useRef<import("leaflet").Circle[]>([]);
  const lastFitRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  const [epoch, setEpoch] = useState(0);
  onSelectRef.current = onSelect;
  basemapRef.current = basemap;

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !hostRef.current) return;
      mapRef.current?.remove();
      mapRef.current = null;
      const map = L.map(hostRef.current, {
        zoomControl: true,
        attributionControl: true,
        minZoom: 7,
        maxZoom: 18,
      });
      const street = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
          subdomains: "abcd",
          maxZoom: 18,
        },
      );
      const aerial = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
          maxZoom: 18,
        },
      );
      const outline = L.polygon(SICILY_OUTLINE, {
        color: "#121210",
        weight: 1.1,
        fill: false,
        interactive: false,
      }).addTo(map);
      const layers = { street, aerial, outline };
      layersRef.current = layers;
      applyBasemap(map, layers, basemapRef.current);
      map.fitBounds(SICILY_OUTLINE, { padding: [28, 28] });
      map.invalidateSize();
      mapRef.current = map;
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(hostRef.current);
      setEpoch((n) => n + 1);
    })();
    return () => {
      cancelled = true;
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    applyBasemap(map, layers, basemap);
  }, [basemap, epoch]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !epoch) return;
    let disposed = false;
    (async () => {
      const L = await import("leaflet");
      if (disposed || !mapRef.current) return;
      for (const m of markersRef.current.values()) m.remove();
      markersRef.current.clear();
      for (const site of sites) {
        const icon = L.divIcon({
          className: "atlas-icon",
          html: `<span class="${pinClass(site, site.id === selectedId, accentHubId != null)}"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const marker = L.marker([site.lat, site.lon], { icon, title: site.label }).addTo(
          map,
        );
        marker.on("click", () => onSelectRef.current(site.id));
        markersRef.current.set(site.id, marker);
      }
      map.invalidateSize();
    })();
    return () => {
      disposed = true;
    };
  }, [sites, selectedId, epoch, accentHubId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !epoch) return;
    let disposed = false;
    (async () => {
      const L = await import("leaflet");
      if (disposed || !mapRef.current) return;
      for (const line of flowsRef.current) line.remove();
      flowsRef.current = [];
      for (const seg of flowLines) {
        const line = L.polyline([seg.from, seg.to], {
          color: "#c45c4a",
          weight: 1.4,
          opacity: 0.7,
          dashArray: "5 7",
          interactive: false,
        }).addTo(map);
        flowsRef.current.push(line);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [flowLines, epoch]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !epoch) return;
    let disposed = false;
    (async () => {
      const L = await import("leaflet");
      if (disposed || !mapRef.current) return;
      for (const c of ringsRef.current) c.remove();
      ringsRef.current = [];
      if (!rings) return;
      for (const km of rings.km) {
        const circle = L.circle([rings.lat, rings.lon], {
          radius: km * 1000,
          color: "#c45c4a",
          weight: 1,
          opacity: 0.55,
          fill: false,
          dashArray: "4 8",
          interactive: false,
        }).addTo(map);
        ringsRef.current.push(circle);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [rings, epoch]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !epoch) return;
    if (lastFitRef.current === null) {
      lastFitRef.current = fitToken;
      return;
    }
    if (lastFitRef.current === fitToken) return;
    lastFitRef.current = fitToken;
    if (sites.length === 0) return;
    const bounds = sites.map((s) => [s.lat, s.lon] as [number, number]);
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
  }, [fitToken, sites, epoch]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedId == null) return;
    const site = sites.find((s) => s.id === selectedId);
    if (!site) return;
    map.flyTo([site.lat, site.lon], Math.max(map.getZoom(), 13), { duration: 0.55 });
  }, [selectedId, sites, epoch]);

  return (
    <div
      ref={hostRef}
      className={cn("h-full min-h-[280px] w-full", basemap === "aerial" && "is-aerial")}
      data-testid="atlas-map"
      data-basemap={basemap}
    />
  );
}
