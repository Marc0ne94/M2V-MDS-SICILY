import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  MapPin,
  Search,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import type {
  AtlasPayload,
  AtlasSource,
  LogisticsHub,
  SiteListItem,
} from "@/lib/atlas";
import { SicilyMap, type FlowSegment } from "@/components/map/sicily-map";
import { cn } from "@/lib/utils";

type Tab = "siti" | "flussi" | "dossier" | "rete";
type Basemap = "street" | "aerial";

function formatAddress(s: SiteListItem) {
  const line = [s.street, s.civic].filter(Boolean).join(" ");
  return [line, `${s.postalCode ?? ""} ${s.municipality} (${s.provinceCode})`.trim()]
    .filter((x) => x && x !== "")
    .join(" · ");
}

function MapMount(props: {
  sites: SiteListItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  basemap: Basemap;
  flowLines: FlowSegment[];
  accentHubId: number | null;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  if (!on) {
    return <div className="h-full w-full bg-surface" aria-hidden />;
  }
  return <SicilyMap {...props} />;
}

function StreetStill({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  const src = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=16&size=640x280&maptype=mapnik&markers=${lat},${lon},red-pushpin`;
  return (
    <figure className="overflow-hidden rounded-md border border-border">
      <img
        alt={`Estratto stradale ${label}`}
        className="h-32 w-full object-cover md:h-36"
        src={src}
        onError={() => setOk(false)}
      />
      <figcaption className="px-2 py-1 text-[10px] tracking-wide text-subtle uppercase">
        Carta stradale OSM
      </figcaption>
    </figure>
  );
}

function AerialStill({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  const dLon = 0.0036;
  const dLat = 0.0024;
  const src = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}&bboxSR=4326&imageSR=3857&size=720,400&format=jpg&f=image`;
  return (
    <figure className="overflow-hidden rounded-md border border-border">
      <img
        alt={`Vista aerea ${label}`}
        className="h-40 w-full object-cover md:h-48"
        src={src}
        onError={() => setOk(false)}
      />
      <figcaption className="px-2 py-1 text-[10px] tracking-wide text-subtle uppercase">
        Vista aerea Esri / Maxar
      </figcaption>
    </figure>
  );
}

function clusterCentroids(sites: SiteListItem[]) {
  const groups = new Map<string, { lat: number; lon: number; n: number }>();
  for (const s of sites) {
    if (!s.clusterSlug || s.kindSlug === "warehouse") continue;
    const g = groups.get(s.clusterSlug) ?? { lat: 0, lon: 0, n: 0 };
    g.lat += s.lat;
    g.lon += s.lon;
    g.n += 1;
    groups.set(s.clusterSlug, g);
  }
  return [...groups.entries()].map(([slug, g]) => ({
    slug,
    lat: g.lat / g.n,
    lon: g.lon / g.n,
  }));
}

export function AtlasApp({ atlas }: { atlas: AtlasPayload }) {
  const [tab, setTab] = useState<Tab>("siti");
  const [q, setQ] = useState("");
  const [province, setProvince] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [cluster, setCluster] = useState<string>("all");
  const [recent, setRecent] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hubSlug, setHubSlug] = useState<string | null>(null);
  const [mobileList, setMobileList] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("street");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return atlas.sites.filter((s) => {
      if (province !== "all" && s.provinceCode !== province) return false;
      if (cluster !== "all" && s.clusterSlug !== cluster) return false;
      if (kind === "warehouse" && s.kindSlug !== "warehouse") return false;
      if (kind === "store" && s.kindSlug !== "store") return false;
      if (kind === "affiliated" && s.ownershipSlug !== "affiliated") return false;
      if (kind === "direct" && s.ownershipSlug !== "direct") return false;
      if (recent && (!s.openedOn || s.openedOn < "2020-01-01")) return false;
      if (!needle) return true;
      const hay = `${s.label} ${s.municipality} ${s.street ?? ""} ${s.code}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [atlas.sites, q, province, kind, cluster, recent]);

  const selected = atlas.sites.find((s) => s.id === selectedId) ?? null;
  const selectedHub = atlas.hubs.find((h) => h.slug === hubSlug) ?? null;
  const selectedEvents = selected
    ? atlas.events.filter((e) => e.siteId === selected.id)
    : [];
  const selectedSources = selected
    ? atlas.sources.filter((src) =>
        atlas.siteSources.some((l) => l.siteId === selected.id && l.sourceSlug === src.slug),
      )
    : [];

  const stores = atlas.sites.filter((s) => s.kindSlug === "store").length;
  const sicilyHubs = atlas.sites.filter((s) => s.kindSlug === "warehouse").length;
  const lastStat = atlas.stats[atlas.stats.length - 1];
  const warehouse = atlas.sites.find((s) => s.kindSlug === "warehouse") ?? null;
  const activeHubs = atlas.hubs.filter((h) => h.status === "active").length;

  const flowLines = useMemo<FlowSegment[]>(() => {
    if (!warehouse || selectedHub?.onSicilyMap !== true) return [];
    return clusterCentroids(atlas.sites).map((c) => ({
      from: [warehouse.lat, warehouse.lon],
      to: [c.lat, c.lon],
    }));
  }, [atlas.sites, warehouse, selectedHub]);

  function pick(id: number) {
    setSelectedId(id);
    const site = atlas.sites.find((s) => s.id === id);
    if (site?.kindSlug === "warehouse") {
      const hub = atlas.hubs.find((h) => h.siteCode === site.code);
      setHubSlug(hub?.slug ?? null);
    } else {
      setHubSlug(null);
    }
    setMobileList(false);
  }

  function pickHub(slug: string) {
    const hub = atlas.hubs.find((h) => h.slug === slug);
    if (!hub) return;
    setHubSlug(slug);
    setTab("flussi");
    if (hub.siteCode) {
      const site = atlas.sites.find((s) => s.code === hub.siteCode);
      setSelectedId(site?.id ?? null);
    } else {
      setSelectedId(null);
    }
    setMobileList(false);
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-bg text-fg">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
            M2V · Atlante territoriale
          </p>
          <h1 className="truncate font-display text-xl font-medium tracking-tight md:text-2xl">
            {atlas.network.brandName} Sicilia
          </h1>
        </div>
        <div className="hidden items-end gap-6 text-right md:flex">
          <Stat k="Siti mappati" v={String(atlas.sites.length)} />
          <Stat k="Punti vendita" v={String(stores)} />
          <Stat k="Hub isolano" v={String(sicilyHubs)} />
          <Stat k="Ce.Di. attivi" v={String(activeHubs)} />
          <Stat k="Rete dichiarata" v={lastStat ? String(lastStat.reportedCount) : "—"} />
        </div>
        <button
          type="button"
          className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-fg md:hidden"
          onClick={() => setMobileList((x) => !x)}
        >
          Elenco
        </button>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(280px,340px)_1fr_minmax(0,360px)]">
        <aside
          className={cn(
            "z-20 flex min-h-0 flex-col border-border bg-surface md:relative md:flex md:border-r",
            mobileList ? "absolute inset-0 flex" : "hidden md:flex",
          )}
        >
          <div className="flex items-center gap-1 border-b border-border p-2">
            {(["siti", "flussi", "dossier", "rete"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 rounded-sm px-2 py-2 text-xs font-medium tracking-wide uppercase",
                  tab === t ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              className="rounded-sm p-2 text-muted md:hidden"
              onClick={() => setMobileList(false)}
              aria-label="Chiudi elenco"
            >
              <X className="size-4" />
            </button>
          </div>

          {tab === "siti" ? (
            <SitesPane
              atlas={atlas}
              q={q}
              setQ={setQ}
              province={province}
              setProvince={setProvince}
              kind={kind}
              setKind={setKind}
              cluster={cluster}
              setCluster={setCluster}
              recent={recent}
              setRecent={setRecent}
              filtered={filtered}
              selectedId={selectedId}
              onPick={pick}
            />
          ) : null}
          {tab === "flussi" ? (
            <FlowsPane
              atlas={atlas}
              hubSlug={hubSlug}
              onPickHub={pickHub}
              servedCount={stores}
            />
          ) : null}
          {tab === "dossier" ? <DossierPane atlas={atlas} /> : null}
          {tab === "rete" ? (
            <OrgPane atlas={atlas} onPickHub={pickHub} />
          ) : null}
        </aside>

        <section className="relative min-h-0 min-w-0 overflow-hidden">
          <MapMount
            sites={filtered}
            selectedId={selectedId}
            onSelect={pick}
            basemap={basemap}
            flowLines={flowLines}
            accentHubId={selectedHub?.onSicilyMap ? warehouse?.id ?? null : null}
          />
          <div className="pointer-events-none absolute top-3 right-3 z-10 md:top-4 md:right-4">
            <div className="pointer-events-auto inline-flex overflow-hidden rounded-md border border-border bg-bg/90 text-[11px] tracking-wide uppercase">
              <button
                type="button"
                className={cn(
                  "px-3 py-2",
                  basemap === "street" ? "bg-elevated text-fg" : "text-muted",
                )}
                onClick={() => setBasemap("street")}
              >
                Carta
              </button>
              <button
                type="button"
                className={cn(
                  "px-3 py-2",
                  basemap === "aerial" ? "bg-elevated text-fg" : "text-muted",
                )}
                onClick={() => setBasemap("aerial")}
              >
                Satellite
              </button>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 md:bottom-4 md:left-4">
            <LegendDot className="bg-mark-store" label="Punto vendita" />
            <LegendDot className="bg-mark-aff" label="Affiliato" />
            <LegendDot className="bg-mark-hub" label="Centro distributivo" />
          </div>
        </section>

        <aside
          className={cn(
            "min-h-0 overflow-y-auto border-border bg-surface",
            selected || selectedHub
              ? "absolute inset-x-0 bottom-0 z-20 max-h-[52vh] border-t md:static md:z-0 md:max-h-none md:border-l md:border-t-0"
              : "hidden md:block md:border-l",
          )}
        >
          {selected ? (
            <SitePanel
              site={selected}
              events={selectedEvents}
              sources={selectedSources}
              brand={atlas.network.brandName}
              servedCount={stores}
              onClose={() => {
                setSelectedId(null);
                setHubSlug(null);
              }}
              onOpenHub={selected.servedByHubSlug ? () => pickHub(selected.servedByHubSlug!) : undefined}
            />
          ) : selectedHub ? (
            <HubPanel
              hub={selectedHub}
              atlas={atlas}
              servedCount={selectedHub.onSicilyMap ? stores : selectedHub.claimedStores}
              onClose={() => setHubSlug(null)}
              onJumpSicily={
                selectedHub.siteCode
                  ? () => pickHub(selectedHub.slug)
                  : undefined
              }
            />
          ) : (
            <EmptyDossier atlas={atlas} />
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="font-mono text-lg tabular-nums leading-none">{v}</div>
      <div className="mt-1 text-[11px] tracking-wide text-muted uppercase">{k}</div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="pointer-events-auto inline-flex items-center gap-2 rounded-md border border-border bg-bg/80 px-2 py-1 text-[11px] text-muted">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  );
}

function SitesPane({
  atlas,
  q,
  setQ,
  province,
  setProvince,
  kind,
  setKind,
  cluster,
  setCluster,
  recent,
  setRecent,
  filtered,
  selectedId,
  onPick,
}: {
  atlas: AtlasPayload;
  q: string;
  setQ: (v: string) => void;
  province: string;
  setProvince: (v: string) => void;
  kind: string;
  setKind: (v: string) => void;
  cluster: string;
  setCluster: (v: string) => void;
  recent: boolean;
  setRecent: (v: boolean) => void;
  filtered: SiteListItem[];
  selectedId: number | null;
  onPick: (id: number) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-border p-3">
        <label className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2">
          <Search className="size-4 text-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Comune, via, codice"
            className="w-full bg-transparent text-sm outline-none placeholder:text-subtle"
          />
        </label>
        <div className="flex gap-2">
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border bg-elevated px-2 py-2 text-xs text-fg"
          >
            <option value="all">Tutte le province</option>
            {atlas.provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.siteCount})
              </option>
            ))}
          </select>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border bg-elevated px-2 py-2 text-xs text-fg"
          >
            <option value="all">Tutti i tipi</option>
            <option value="store">Punti vendita</option>
            <option value="warehouse">Magazzini</option>
            <option value="direct">Diretti</option>
            <option value="affiliated">Affiliati</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCluster("all")}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px]",
              cluster === "all"
                ? "border-accent bg-elevated text-fg"
                : "border-border text-muted",
            )}
          >
            Tutti i cluster
          </button>
          {atlas.clusters.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCluster(c.slug)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px]",
                cluster === c.slug
                  ? "border-accent bg-elevated text-fg"
                  : "border-border text-muted",
              )}
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRecent(!recent)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px]",
              recent ? "border-accent bg-elevated text-fg" : "border-border text-muted",
            )}
          >
            Aperture dal 2020
          </button>
        </div>
        <p className="font-mono text-[11px] text-subtle tabular-nums">
          {filtered.length} visibili
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left hover:bg-elevated",
                selectedId === s.id && "bg-elevated",
              )}
            >
              {s.kindSlug === "warehouse" ? (
                <Warehouse className="mt-0.5 size-4 shrink-0 text-mark-hub" />
              ) : (
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{s.label}</span>
                <span className="block truncate text-xs text-muted">
                  {s.municipality} · {s.provinceCode}
                  {s.openedOn ? ` · ${s.openedOn.slice(0, 4)}` : ""}
                </span>
              </span>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-subtle" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlowsPane({
  atlas,
  hubSlug,
  onPickHub,
  servedCount,
}: {
  atlas: AtlasPayload;
  hubSlug: string | null;
  onPickHub: (slug: string) => void;
  servedCount: number;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <p className="text-xs tracking-wide text-muted uppercase">Rete logistica nazionale</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Sei depositi attivi dalle pagine societarie. Sull'isola ne compare uno solo:
        cliccalo per vederlo sulla mappa e i flussi verso i cluster siciliani. Gli altri
        restano schede nazionali — non sono pin siciliani.
      </p>
      <ItalySchematic hubs={atlas.hubs} selected={hubSlug} onPick={onPickHub} />
      <ul className="mt-4 space-y-2">
        {atlas.hubs.map((h) => (
          <li key={h.slug}>
            <button
              type="button"
              onClick={() => onPickHub(h.slug)}
              className={cn(
                "w-full rounded-lg border p-3 text-left",
                hubSlug === h.slug
                  ? "border-accent bg-elevated"
                  : "border-border bg-elevated/40 hover:bg-elevated",
              )}
            >
              <div className="flex items-start gap-2">
                <Warehouse
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    h.onSicilyMap ? "text-mark-hub" : "text-muted",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{h.label}</div>
                  <div className="mt-0.5 font-mono text-[11px] tracking-wide text-subtle uppercase">
                    {h.locality}
                    {h.province ? ` · ${h.province}` : ""} · {h.region}
                    {h.status === "planned" ? " · progetto" : ""}
                  </div>
                  <p className="mt-1 text-xs text-muted">{h.catchment}</p>
                  {h.onSicilyMap ? (
                    <p className="mt-1 text-[11px] text-mark-hub">
                      Sulla mappa · rifornisce {servedCount} pdv siciliani
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ITA_MAIN: [number, number][] = [
  [7.52, 43.78],
  [8.6, 44.4],
  [9.2, 45.5],
  [10.8, 45.85],
  [11.9, 46.6],
  [12.5, 46.6],
  [13.7, 45.65],
  [13.5, 43.6],
  [13.2, 42.4],
  [13.9, 41.2],
  [15.0, 41.7],
  [16.2, 41.7],
  [17.3, 40.8],
  [18.35, 40.35],
  [17.2, 39.5],
  [16.6, 38.85],
  [16.5, 38.15],
  [15.65, 37.92],
  [15.65, 38.9],
  [15.0, 40.25],
  [14.2, 40.85],
  [13.5, 41.25],
  [12.5, 41.55],
  [11.5, 42.4],
  [10.25, 42.85],
  [9.7, 44.05],
  [8.15, 44.05],
  [7.52, 43.78],
];

const ITA_SARD: [number, number][] = [
  [8.15, 41.25],
  [9.65, 41.25],
  [9.7, 39.15],
  [8.35, 38.85],
  [8.15, 41.25],
];

const ITA_SIC: [number, number][] = [
  [12.43, 38.26],
  [13.35, 38.17],
  [14.55, 38.3],
  [15.65, 38.27],
  [15.18, 37.55],
  [15.08, 36.68],
  [13.55, 37.08],
  [12.48, 37.85],
  [12.43, 38.26],
];

function project(lat: number, lon: number) {
  const x = ((lon - 6.6) / (18.6 - 6.6)) * 260 + 12;
  const y = ((47.15 - lat) / (47.15 - 36.45)) * 360 + 8;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function poly(points: [number, number][]) {
  return points.map(([lon, lat]) => project(lat, lon)).join(" ");
}

function ItalySchematic({
  hubs,
  selected,
  onPick,
}: {
  hubs: LogisticsHub[];
  selected: string | null;
  onPick: (slug: string) => void;
}) {
  return (
    <svg
      viewBox="0 0 284 376"
      className="mt-4 w-full rounded-lg border border-border bg-elevated"
      role="img"
      aria-label="Schema dei centri distributivi in Italia"
    >
      <polygon points={poly(ITA_MAIN)} className="fill-none stroke-border" strokeWidth="1.2" />
      <polygon points={poly(ITA_SARD)} className="fill-none stroke-border" strokeWidth="1.2" />
      <polygon points={poly(ITA_SIC)} className="fill-none stroke-border" strokeWidth="1.2" />
      {hubs.map((h) => {
        if (h.lat == null || h.lon == null) return null;
        const [x, y] = project(h.lat, h.lon).split(",").map(Number);
        const active = selected === h.slug;
        return (
          <g key={h.slug}>
            <circle
              cx={x}
              cy={y}
              r={active ? 7 : 5}
              className={h.onSicilyMap ? "fill-mark-hub" : "fill-accent"}
              opacity={h.status === "planned" ? 0.45 : 1}
              role="button"
              tabIndex={0}
              onClick={() => onPick(h.slug)}
              style={{ cursor: "pointer" }}
            />
            <text
              x={x + 9}
              y={y + 3}
              className="fill-muted"
              fontSize="9"
              fontFamily="IBM Plex Sans, sans-serif"
            >
              {h.locality.split("/")[0].trim()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DossierPane({ atlas }: { atlas: AtlasPayload }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <p className="text-xs tracking-wide text-muted uppercase">Conteggi dichiarati</p>
      <ol className="mt-3 space-y-3">
        {atlas.stats.map((st) => (
          <li key={st.asOf} className="border-l border-border pl-3">
            <div className="font-mono text-xs text-subtle">{st.asOf}</div>
            <div className="font-display text-2xl tabular-nums">{st.reportedCount}</div>
            {st.note ? <p className="mt-1 text-xs text-muted">{st.note}</p> : null}
          </li>
        ))}
      </ol>
      <div className="mt-8 space-y-6">
        {atlas.notes.map((n) => (
          <article key={n.slug}>
            <h2 className="font-display text-lg">{n.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{n.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-8">
        <h2 className="font-display text-lg">Fonti</h2>
        <ul className="mt-3 space-y-2">
          {atlas.sources.map((s) => (
            <li key={s.slug} className="text-xs leading-relaxed">
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline-offset-4 hover:underline"
                >
                  {s.title}
                </a>
              ) : (
                <span>{s.title}</span>
              )}
              <span className="ml-2 text-subtle">
                {s.kind}
                {s.publishedOn ? ` · ${s.publishedOn}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function OrgPane({
  atlas,
  onPickHub,
}: {
  atlas: AtlasPayload;
  onPickHub: (slug: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <p className="mb-4 text-sm text-muted">
        Struttura ricostruita da fonti pubbliche. I nodi arrivano dal backend, non
        dal layout. I Ce.Di. sono cliccabili.
      </p>
      <ul className="space-y-3">
        {atlas.org.map((n) => {
          const hub = atlas.hubs.find((h) => h.slug === n.slug);
          return (
            <li key={n.slug} className="rounded-lg border border-border bg-elevated p-3">
              {hub ? (
                <button
                  type="button"
                  onClick={() => onPickHub(hub.slug)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <Warehouse className="size-4 text-mark-hub" />
                  <span className="text-sm font-medium">{n.label}</span>
                  <ChevronRight className="ml-auto size-4 text-subtle" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted" />
                  <span className="text-sm font-medium">{n.label}</span>
                </div>
              )}
              <div className="mt-1 font-mono text-[11px] tracking-wide text-subtle uppercase">
                {n.kind}
                {n.parentLabel ? ` · sotto ${n.parentLabel}` : ""}
              </div>
              {n.blurb ? <p className="mt-2 text-xs text-muted">{n.blurb}</p> : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-6 rounded-lg border border-border p-3 text-xs text-muted">
        <div className="font-medium text-fg">{atlas.network.legalName}</div>
        <div>{atlas.network.parentName}</div>
        <div className="mt-2">
          {atlas.network.hqAddress}
          <br />
          {atlas.network.hqCity}
        </div>
      </div>
    </div>
  );
}

function EmptyDossier({ atlas }: { atlas: AtlasPayload }) {
  return (
    <div className="hidden h-full flex-col justify-between p-6 md:flex">
      <div>
        <p className="font-mono text-xs tracking-widest text-muted uppercase">
          Seleziona un pin
        </p>
        <h2 className="mt-2 font-display text-2xl">Scheda sito</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{atlas.network.notes}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Non è un dump ufficiale della rete: è una ricostruzione da pagine societarie,
          PDF gift card, stampa GDO e directory, con livello di confidenza su ogni pin.
        </p>
      </div>
      <p className="text-xs text-subtle">
        Coordinate da OpenStreetMap / Photon. Viste aeree Esri. Estratti OSM (ODbL).
      </p>
    </div>
  );
}

function HubPanel({
  hub,
  atlas,
  servedCount,
  onClose,
  onJumpSicily,
}: {
  hub: LogisticsHub;
  atlas: AtlasPayload;
  servedCount: number | null;
  onClose: () => void;
  onJumpSicily?: () => void;
}) {
  const flows = atlas.flows.filter((f) => f.fromHub === hub.slug);
  return (
    <div className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-muted uppercase">
            Centro distributivo · {hub.status === "planned" ? "In progetto" : "Attivo"}
          </p>
          <h2 className="mt-1 font-display text-2xl leading-tight">{hub.label}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border p-2 text-muted hover:text-fg"
          aria-label="Chiudi scheda"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-3 text-sm text-muted">
        {hub.locality}
        {hub.province ? ` (${hub.province})` : ""} · {hub.region}
      </p>
      {hub.lat != null && hub.lon != null ? (
        <div className="mt-4 space-y-2">
          <AerialStill lat={hub.lat} lon={hub.lon} label={hub.label} />
        </div>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Fact k="Apertura" v={hub.openedOn ?? "—"} />
        <Fact k="Coperti" v={hub.coveredSqm ? `${hub.coveredSqm.toLocaleString("it-IT")} mq` : "—"} />
        <Fact k="Area" v={hub.totalSqm ? `${hub.totalSqm.toLocaleString("it-IT")} mq` : "—"} />
        <Fact k="Pdv dichiarati" v={servedCount != null ? String(servedCount) : "—"} />
        <Fact k="Confidenza" v={hub.confidenceLabel} />
        <Fact k="Sulla mappa" v={hub.onSicilyMap ? "Sì, Sicilia" : "No"} />
      </dl>
      {hub.catchment ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{hub.catchment}</p>
      ) : null}
      {hub.notes ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">{hub.notes}</p>
      ) : null}
      {flows.length ? (
        <div className="mt-6">
          <h3 className="text-xs tracking-wide text-muted uppercase">Flussi</h3>
          <ul className="mt-2 space-y-2">
            {flows.map((f) => (
              <li key={`${f.fromHub}-${f.label}`} className="flex gap-2 text-sm">
                <Truck className="mt-0.5 size-3.5 shrink-0 text-mark-hub" />
                <span>
                  <span className="font-medium">{f.label}</span>
                  {f.toRegion ? (
                    <span className="text-muted"> · {f.toRegion}</span>
                  ) : null}
                  {f.blurb ? (
                    <span className="mt-0.5 block text-xs text-muted">{f.blurb}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {onJumpSicily && hub.onSicilyMap ? (
        <button
          type="button"
          onClick={onJumpSicily}
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm"
        >
          <MapPin className="size-4 text-mark-hub" />
          Vedi il pin sull'isola
        </button>
      ) : null}
    </div>
  );
}

function SitePanel({
  site,
  events,
  sources,
  brand,
  servedCount,
  onClose,
  onOpenHub,
}: {
  site: SiteListItem;
  events: AtlasPayload["events"];
  sources: AtlasSource[];
  brand: string;
  servedCount: number;
  onClose: () => void;
  onOpenHub?: () => void;
}) {
  return (
    <div className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-muted uppercase">
            {site.kindLabel} · {site.ownershipLabel}
          </p>
          <h2 className="mt-1 font-display text-2xl leading-tight">{site.label}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border p-2 text-muted hover:text-fg"
          aria-label="Chiudi scheda"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="mt-3 text-sm text-muted">{formatAddress(site)}</p>
      <div className="mt-4 space-y-2">
        <AerialStill lat={site.lat} lon={site.lon} label={site.label} />
        <StreetStill lat={site.lat} lon={site.lon} label={site.label} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Fact k="Insegna" v={brand} />
        <Fact k="Codice" v={site.code} />
        <Fact k="Telefono" v={site.phone ?? "—"} />
        <Fact k="Apertura" v={site.openedOn ?? "—"} />
        <Fact k="Superficie" v={site.areaSqm ? `${site.areaSqm} mq` : "—"} />
        <Fact k="Personale" v={site.staffCount ? String(site.staffCount) : "—"} />
        <Fact k="Parcheggi" v={site.parkingSpots ? String(site.parkingSpots) : "—"} />
        <Fact k="Confidenza" v={site.confidenceLabel} />
        <Fact k="Cluster" v={site.clusterLabel ?? "—"} />
        <Fact k="Geocoding" v={site.geocodeMethod} />
      </dl>

      {site.kindSlug === "warehouse" ? (
        <p className="mt-4 text-sm text-muted">
          Rifornisce i {servedCount} punti vendita mappati sull'isola (fonte societaria:
          tutta la Sicilia e parte della Calabria).
        </p>
      ) : site.servedByHubLabel ? (
        <button
          type="button"
          onClick={onOpenHub}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm"
        >
          <Truck className="size-4 text-mark-hub" />
          Rifornito da {site.servedByHubLabel}
        </button>
      ) : null}

      {site.phonesExtra ? (
        <p className="mt-3 text-xs text-muted">Altri numeri: {site.phonesExtra}</p>
      ) : null}
      {site.partnerName ? (
        <p className="mt-3 text-sm text-muted">Partner affiliato: {site.partnerName}</p>
      ) : null}
      {site.notes ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{site.notes}</p>
      ) : null}

      {events.length ? (
        <div className="mt-6">
          <h3 className="text-xs tracking-wide text-muted uppercase">Cronologia</h3>
          <ol className="mt-2 space-y-3">
            {events.map((e) => (
              <li key={`${e.occurredOn}-${e.title}`} className="border-l border-border pl-3">
                <div className="font-mono text-[11px] text-subtle">{e.occurredOn}</div>
                <div className="text-sm font-medium">{e.title}</div>
                {e.body ? <p className="text-xs text-muted">{e.body}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {sources.length ? (
        <div className="mt-6">
          <h3 className="text-xs tracking-wide text-muted uppercase">Fonti della scheda</h3>
          <ul className="mt-2 space-y-1">
            {sources.map((s) => (
              <li key={s.slug} className="text-xs">
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {site.osmUrl ? (
        <a
          href={site.osmUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex text-sm text-accent underline-offset-4 hover:underline"
        >
          Apri in OpenStreetMap
        </a>
      ) : null}
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-subtle uppercase">{k}</dt>
      <dd className="mt-0.5 text-fg">{v}</dd>
    </div>
  );
}
