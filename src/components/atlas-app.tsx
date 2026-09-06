import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  ChevronRight,
  CircleDot,
  Download,
  Link2,
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
import { SicilyMap, type FlowSegment, type HubRings } from "@/components/map/sicily-map";
import { cn } from "@/lib/utils";

type Tab = "siti" | "flussi" | "fonti" | "dossier" | "rete";
type Basemap = "street" | "aerial";
type DocFilter = "all" | "gift" | "uno" | "verified" | "gaps";

const REL_LABEL: Record<string, string> = {
  possible_same: "Possibile stesso sito",
  possible_relocation: "Possibile trasferimento",
  distinct_homonym: "Omonimo distinto",
};

const FLAG_LABEL: Record<string, string> = {
  uno_ex: "Ex Uno 2019",
  post_giftcard: "Dopo il PDF",
  toponym_conflict: "Toponimo discordante",
  possible_duplicate: "Possibile doppio",
  possible_relocation: "Possibile trasferimento",
  wave_2019: "Ondata 2019",
};

const ROLE_LABEL: Record<string, string> = {
  gift_card: "Gift card",
  press: "Stampa",
  corporate: "Societaria",
  directory: "Directory",
  supporting: "Di contesto",
};

const KIND_LABEL: Record<string, string> = {
  corporate: "Societarie",
  press: "Stampa",
  reference: "Riferimento",
  directory: "Directory",
  web: "Web",
};

function missing(v: string | number | null | undefined) {
  return v == null || v === "" ? "non in fonti" : String(v);
}

function exportGeojson(sites: SiteListItem[]) {
  const fc = {
    type: "FeatureCollection",
    features: sites.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: {
        code: s.code,
        label: s.label,
        kind: s.kindSlug,
        municipality: s.municipality,
        province: s.provinceCode,
        giftCard: s.giftCard,
        confidence: s.confidenceSlug,
        street: s.street,
        kmFromHub: s.kmFromHub,
      },
    })),
  };
  const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "atlante-sicilia.geojson";
  a.click();
  URL.revokeObjectURL(url);
}

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
  rings: HubRings | null;
  fitToken: string;
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
  const [era, setEra] = useState<string>("all");
  const [doc, setDoc] = useState<DocFilter>("all");
  const [sourceSlug, setSourceSlug] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hubSlug, setHubSlug] = useState<string | null>(null);
  const [mobileList, setMobileList] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("street");
  const [showRings, setShowRings] = useState(false);

  useEffect(() => {
    const raw = window.location.hash.replace(/^#s=/i, "");
    if (!raw) return;
    const site = atlas.sites.find((s) => s.code.toLowerCase() === raw.toLowerCase());
    if (site) {
      setSelectedId(site.id);
      if (site.kindSlug === "warehouse") {
        const hub = atlas.hubs.find((h) => h.siteCode === site.code);
        setHubSlug(hub?.slug ?? null);
      }
    }
    // mount-only: open shared pin from hash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hashReady = useRef(false);
  useEffect(() => {
    if (!hashReady.current) {
      hashReady.current = true;
      return;
    }
    const site = atlas.sites.find((s) => s.id === selectedId);
    history.replaceState(
      null,
      "",
      site ? `#s=${site.code}` : window.location.pathname,
    );
  }, [atlas.sites, selectedId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const sourceIds = sourceSlug
      ? new Set(
          atlas.siteSources.filter((l) => l.sourceSlug === sourceSlug).map((l) => l.siteId),
        )
      : null;
    return atlas.sites.filter((s) => {
      if (province !== "all" && s.provinceCode !== province) return false;
      if (cluster !== "all" && s.clusterSlug !== cluster) return false;
      if (kind === "warehouse" && s.kindSlug !== "warehouse") return false;
      if (kind === "store" && s.kindSlug !== "store") return false;
      if (kind === "affiliated" && s.ownershipSlug !== "affiliated") return false;
      if (kind === "direct" && s.ownershipSlug !== "direct") return false;
      if (era === "gift-2025" && !s.giftCard) return false;
      if (era === "uno-2019" && !s.flags.includes("uno_ex") && !s.flags.includes("wave_2019"))
        return false;
      if (era === "post-pdf" && !s.flags.includes("post_giftcard")) return false;
      if (doc === "gift" && !s.giftCard) return false;
      if (doc === "uno" && !s.flags.includes("uno_ex")) return false;
      if (doc === "verified" && s.confidenceSlug !== "verified") return false;
      if (doc === "gaps" && s.phone && s.openedOn && s.sourceCount > 0) return false;
      if (sourceIds && !sourceIds.has(s.id)) return false;
      if (!needle) return true;
      const hay = `${s.label} ${s.municipality} ${s.street ?? ""} ${s.code}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [atlas.sites, atlas.siteSources, q, province, kind, cluster, era, doc, sourceSlug]);

  const selected = atlas.sites.find((s) => s.id === selectedId) ?? null;
  const selectedHub = atlas.hubs.find((h) => h.slug === hubSlug) ?? null;
  const selectedEvents = selected
    ? atlas.events.filter((e) => e.siteId === selected.id)
    : [];

  const stores = atlas.sites.filter((s) => s.kindSlug === "store").length;
  const lastStat = atlas.stats[atlas.stats.length - 1];
  const warehouse = atlas.sites.find((s) => s.kindSlug === "warehouse") ?? null;
  const activeHubs = atlas.hubs.filter((h) => h.status === "active").length;

  const rings = useMemo<HubRings | null>(() => {
    if (!showRings || !warehouse) return null;
    return { lat: warehouse.lat, lon: warehouse.lon, km: [50, 100, 150] };
  }, [showRings, warehouse]);

  const fitToken = `${era}|${doc}|${sourceSlug ?? ""}|${province}|${cluster}|${kind}|${q}`;

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

  function pickSource(slug: string) {
    setSourceSlug((prev) => (prev === slug ? null : slug));
    setEra("all");
    setDoc("all");
    setTab("fonti");
    setMobileList(false);
  }

  const related = selected
    ? atlas.relations
        .filter((r) => r.siteA === selected.id || r.siteB === selected.id)
        .map((r) => {
          const otherId = r.siteA === selected.id ? r.siteB : r.siteA;
          const other = atlas.sites.find((s) => s.id === otherId);
          return { ...r, other };
        })
        .filter((r) => r.other)
    : [];

  const selectedSource = atlas.sources.find((s) => s.slug === sourceSlug) ?? null;
  const selectedFlagNotes = selected
    ? atlas.flags.filter((f) => f.siteId === selected.id)
    : [];
  const selectedSourceLinks = selected
    ? atlas.siteSources
        .filter((l) => l.siteId === selected.id)
        .map((l) => {
          const src = atlas.sources.find((s) => s.slug === l.sourceSlug);
          return src ? { ...src, role: l.role } : null;
        })
        .filter((x): x is AtlasSource & { role: string } => x != null)
    : [];

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
          <p className="mt-0.5 hidden truncate text-[11px] text-subtle md:block">
            Ricostruzione da fonti pubbliche · non un elenco ufficiale
          </p>
        </div>
        <div className="hidden items-end gap-6 text-right md:flex">
          <Stat k="Siti mappati" v={String(atlas.sites.length)} />
          <Stat k="Gift card" v={String(atlas.coverage.giftCard)} />
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
            {(["siti", "flussi", "fonti", "dossier", "rete"] as const).map((t) => (
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
              era={era}
              setEra={setEra}
              doc={doc}
              setDoc={setDoc}
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
          {tab === "fonti" ? (
            <FontiPane
              atlas={atlas}
              sourceSlug={sourceSlug}
              onPickSource={pickSource}
              visible={filtered.length}
            />
          ) : null}
          {tab === "dossier" ? (
            <DossierPane
              atlas={atlas}
              onPick={pick}
              onPickSource={pickSource}
              onProvince={(code) => {
                setProvince(code);
                setTab("siti");
              }}
            />
          ) : null}
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
            rings={rings}
            fitToken={fitToken}
          />
          <div className="pointer-events-none absolute top-3 left-3 right-16 z-10 md:top-4 md:left-4">
            <div className="pointer-events-auto flex flex-wrap gap-1">
              {atlas.eras.map((e) => (
                <button
                  key={e.slug}
                  type="button"
                  onClick={() => {
                    setEra(e.slug);
                    setSourceSlug(null);
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px]",
                    era === e.slug
                      ? "border-accent bg-bg text-fg"
                      : "border-border bg-bg/80 text-muted",
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
            {selectedSource ? (
              <button
                type="button"
                onClick={() => setSourceSlug(null)}
                className="pointer-events-auto mt-1 max-w-sm rounded-md border border-border bg-bg/90 px-2 py-1 text-left text-[11px] text-muted"
              >
                Fonte: {selectedSource.title} · {filtered.length} pin · togli filtro
              </button>
            ) : null}
          </div>
          <div className="pointer-events-none absolute top-3 right-3 z-10 md:top-4 md:right-4">
            <div className="pointer-events-auto flex flex-col items-end gap-1">
              <div className="inline-flex overflow-hidden rounded-md border border-border bg-bg/90 text-[11px] tracking-wide uppercase">
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
              <button
                type="button"
                onClick={() => setShowRings((x) => !x)}
                className={cn(
                  "pointer-events-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px]",
                  showRings
                    ? "border-accent bg-bg text-fg"
                    : "border-border bg-bg/90 text-muted",
                )}
              >
                <CircleDot className="size-3" />
                Raggio Ce.Di.
              </button>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 md:bottom-4 md:left-4">
            <LegendDot className="bg-mark-store" label="Gift card" />
            <LegendDot className="border border-mark-store bg-transparent" label="Ricostruito" />
            <LegendDot className="bg-mark-aff" label="Affiliato" />
            <LegendDot className="bg-mark-hub" label="Centro distributivo" />
            {showRings ? (
              <span className="pointer-events-auto inline-flex items-center gap-2 rounded-md border border-border bg-bg/80 px-2 py-1 text-[11px] text-muted">
                Cerchi 50 / 100 / 150 km
              </span>
            ) : null}
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
              sources={selectedSourceLinks}
              brand={atlas.network.brandName}
              servedCount={stores}
              related={related}
              flagNotes={selectedFlagNotes}
              onPickRelated={pick}
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
  era,
  setEra,
  doc,
  setDoc,
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
  era: string;
  setEra: (v: string) => void;
  doc: DocFilter;
  setDoc: (v: DocFilter) => void;
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
            value={cluster}
            onChange={(e) => setCluster(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border bg-elevated px-2 py-2 text-xs text-fg"
          >
            <option value="all">Tutti i cluster</option>
            {atlas.clusters.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
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
          <select
            value={era}
            onChange={(e) => setEra(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border bg-elevated px-2 py-2 text-xs text-fg"
          >
            {atlas.eras.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "Tutti"],
              ["gift", "Gift card"],
              ["uno", "Ex Uno"],
              ["verified", "Verificati"],
              ["gaps", "Campi vuoti"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDoc(id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px]",
                doc === id ? "border-accent bg-elevated text-fg" : "border-border text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="flex items-center justify-between gap-2 font-mono text-[11px] text-subtle tabular-nums">
          <span>
            {filtered.length} visibili · {atlas.coverage.giftCard} in PDF gift card
          </span>
          <button
            type="button"
            onClick={() => exportGeojson(filtered)}
            className="inline-flex items-center gap-1 text-muted hover:text-fg"
          >
            <Download className="size-3" />
            GeoJSON
          </button>
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
                  {s.giftCard ? " · gift" : ""}
                  {s.sourceCount ? ` · ${s.sourceCount} fonti` : " · senza fonte"}
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


function FontiPane({
  atlas,
  sourceSlug,
  onPickSource,
  visible,
}: {
  atlas: AtlasPayload;
  sourceSlug: string | null;
  onPickSource: (slug: string) => void;
  visible: number;
}) {
  const kinds = [...new Set(atlas.sources.map((s) => s.kind))];
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <p className="text-xs tracking-wide text-muted uppercase">Provenienza</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Ogni pin è agganciato a fonti in tabella, con un ruolo. Clicca una fonte
        per filtrare la mappa. Il PDF gift card è ufficiale ma sottoinsieme;
        lo store locator non è un dump per scheda. Siamo certi delle fonti
        collegate, non della completezza della rete.
      </p>
      <p className="mt-2 font-mono text-[11px] text-subtle tabular-nums">
        {atlas.coverage.sourceLinks} legami · {atlas.coverage.sources} fonti · {visible} pin visibili
      </p>
      {kinds.map((k) => (
        <div key={k} className="mt-5">
          <h3 className="text-[11px] tracking-wide text-subtle uppercase">
            {KIND_LABEL[k] ?? k}
          </h3>
          <ul className="mt-2 space-y-2">
            {atlas.sources
              .filter((s) => s.kind === k)
              .map((s) => (
                <li key={s.slug}>
                  <div
                    className={cn(
                      "w-full rounded-lg border p-3 text-left",
                      sourceSlug === s.slug
                        ? "border-accent bg-elevated"
                        : "border-border bg-elevated/40 hover:bg-elevated",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onPickSource(s.slug)}
                      className="w-full text-left"
                    >
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="mt-1 font-mono text-[11px] text-subtle">
                        {s.siteCount} schede
                        {s.publishedOn ? ` · ${s.publishedOn}` : ""}
                      </div>
                    </button>
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-[11px] text-accent underline-offset-4 hover:underline"
                      >
                        Apri originale
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Meter({
  label,
  num,
  den,
}: {
  label: string;
  num: number;
  den: number;
}) {
  const pct = den ? Math.round((num / den) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between gap-2 text-[11px] tracking-wide uppercase">
        <span className="text-subtle">{label}</span>
        <span className="font-mono text-muted tabular-nums">
          {num}/{den} · {pct}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function DossierPane({
  atlas,
  onPick,
  onPickSource,
  onProvince,
}: {
  atlas: AtlasPayload;
  onPick: (id: number) => void;
  onPickSource: (slug: string) => void;
  onProvince: (code: string) => void;
}) {
  const cov = atlas.coverage;
  const last = atlas.stats[atlas.stats.length - 1];
  const chrono = [
    ...atlas.stats.map((st) => ({
      date: st.asOf,
      title: `Rete dichiarata: ${st.reportedCount}`,
      body: st.note,
      siteId: null as number | null,
    })),
    ...atlas.events.map((e) => ({
      date: e.occurredOn ?? "",
      title: e.title,
      body: e.body,
      siteId: e.siteId,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const provinces = [...atlas.provinces].sort((a, b) => b.siteCount - a.siteCount);
  const maxP = Math.max(1, ...provinces.map((p) => p.siteCount));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <p className="text-xs tracking-wide text-muted uppercase">Certezza</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Siamo certi delle fonti collegate a ogni pin, non della completezza
        della rete. Non è un dump ufficiale: è una ricostruzione. I campi vuoti
        restano vuoti — non inventiamo zeri.
      </p>
      <div className="mt-4 space-y-3">
        <Meter label="In PDF gift card" num={cov.giftCard} den={cov.stores} />
        <Meter label="Geocoding verificato" num={cov.verified} den={cov.sites} />
        <Meter label="Con telefono" num={cov.withPhone} den={cov.sites} />
        <Meter label="Con data di apertura" num={cov.withOpenedOn} den={cov.sites} />
        <Meter label="Con superficie" num={cov.withArea} den={cov.sites} />
        <Meter label="Ex Uno 2019" num={cov.unoEx} den={cov.stores} />
        {last ? (
          <Meter
            label="Mappati vs dichiarati"
            num={cov.stores}
            den={last.reportedCount}
          />
        ) : null}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        I mappati possono superare i dichiarati: gift card, stampa e directory
        si sovrappongono in modo diverso, e restano coppie da verificare.
      </p>

      <p className="mt-8 text-xs tracking-wide text-muted uppercase">Per provincia</p>
      <ul className="mt-3 space-y-2">
        {provinces.map((p) => (
          <li key={p.code}>
            <button
              type="button"
              onClick={() => onProvince(p.code)}
              className="w-full text-left"
            >
              <div className="flex justify-between text-[11px] tracking-wide uppercase">
                <span className="text-muted">{p.name}</span>
                <span className="font-mono text-subtle tabular-nums">{p.siteCount}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(p.siteCount / maxP) * 100}%` }}
                />
              </div>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs tracking-wide text-muted uppercase">Conteggi dichiarati</p>
      <ol className="mt-3 space-y-3">
        {atlas.stats.map((st) => (
          <li key={st.asOf} className="border-l border-border pl-3">
            <div className="font-mono text-xs text-subtle">{st.asOf}</div>
            <div className="font-display text-2xl tabular-nums">{st.reportedCount}</div>
            {st.note ? <p className="mt-1 text-xs text-muted">{st.note}</p> : null}
          </li>
        ))}
      </ol>

      <p className="mt-8 text-xs tracking-wide text-muted uppercase">Cronologia</p>
      <ol className="mt-3 space-y-3">
        {chrono.map((ev, i) => (
          <li key={`${ev.date}-${ev.title}-${i}`} className="border-l border-border pl-3">
            <div className="font-mono text-[11px] text-subtle">{ev.date || "data non in fonti"}</div>
            {ev.siteId != null ? (
              <button
                type="button"
                onClick={() => onPick(ev.siteId!)}
                className="text-left text-sm font-medium hover:underline"
              >
                {ev.title}
              </button>
            ) : (
              <div className="text-sm font-medium">{ev.title}</div>
            )}
            {ev.body ? <p className="text-xs text-muted">{ev.body}</p> : null}
          </li>
        ))}
      </ol>

      <div className="mt-8 space-y-6">
        {atlas.notes.map((n) => (
          <article key={n.slug}>
            <h2 className="font-display text-lg">{n.title}</h2>
            {n.asOf ? (
              <p className="mt-1 font-mono text-[11px] text-subtle">{n.asOf}</p>
            ) : null}
            <p className="mt-2 text-sm leading-relaxed text-muted">{n.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-8">
        <h2 className="font-display text-lg">Fonti</h2>
        <ul className="mt-3 space-y-2">
          {atlas.sources.map((s) => (
            <li key={s.slug} className="text-xs leading-relaxed">
              <button
                type="button"
                onClick={() => onPickSource(s.slug)}
                className="text-left text-accent underline-offset-4 hover:underline"
              >
                {s.title}
              </button>
              <span className="ml-2 text-subtle">
                {KIND_LABEL[s.kind] ?? s.kind}
                {s.publishedOn ? ` · ${s.publishedOn}` : ""}
                {` · ${s.siteCount} schede`}
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
  const cov = atlas.coverage;
  const last = atlas.stats[atlas.stats.length - 1];
  return (
    <div className="hidden h-full flex-col justify-between p-6 md:flex">
      <div>
        <p className="font-mono text-xs tracking-widest text-muted uppercase">
          Seleziona un pin
        </p>
        <h2 className="mt-2 font-display text-2xl">Scheda sito</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{atlas.network.notes}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Non è un dump ufficiale della rete: è una ricostruzione da pagine
          societarie, PDF gift card, stampa GDO e directory. Siamo certi delle
          fonti agganciate, non della completezza.
        </p>
        <div className="mt-6 space-y-3">
          <Meter label="In PDF gift card" num={cov.giftCard} den={cov.stores} />
          <Meter label="Geocoding verificato" num={cov.verified} den={cov.sites} />
          {last ? (
            <Meter label="Mappati vs dichiarati" num={cov.stores} den={last.reportedCount} />
          ) : null}
        </div>
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
  related,
  flagNotes,
  onPickRelated,
  onClose,
  onOpenHub,
}: {
  site: SiteListItem;
  events: AtlasPayload["events"];
  sources: (AtlasSource & { role: string })[];
  brand: string;
  servedCount: number;
  related: { kind: string; note: string | null; other?: SiteListItem }[];
  flagNotes: { flag: string; note: string | null }[];
  onPickRelated: (id: number) => void;
  onClose: () => void;
  onOpenHub?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const anag = [
    site.phone,
    site.openedOn,
    site.areaSqm,
    site.parkingSpots,
    site.staffCount,
    site.partnerName,
  ];
  const filled = anag.filter((v) => v != null && v !== "").length;

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}#s=${site.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-muted uppercase">
            {site.kindLabel} · {site.ownershipLabel}
          </p>
          <h2 className="mt-1 font-display text-2xl leading-tight">{site.label}</h2>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md border border-border p-2 text-muted hover:text-fg"
            aria-label="Copia collegamento"
          >
            <Link2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border p-2 text-muted hover:text-fg"
            aria-label="Chiudi scheda"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      {copied ? (
        <p className="mt-2 text-[11px] text-muted">Collegamento copiato</p>
      ) : null}

      <p className="mt-3 text-sm text-muted">{formatAddress(site)}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {site.giftCard ? (
          <span className="rounded-full border border-accent px-2 py-0.5 text-[11px]">
            Gift card 2025
          </span>
        ) : (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
            Non in PDF
          </span>
        )}
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
          {site.confidenceLabel}
        </span>
        {site.flags.map((f) => (
          <span
            key={f}
            className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
          >
            {FLAG_LABEL[f] ?? f}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <AerialStill lat={site.lat} lon={site.lon} label={site.label} />
        <StreetStill lat={site.lat} lon={site.lon} label={site.label} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Fact k="Insegna" v={brand} />
        <Fact k="Codice" v={site.code} />
        <Fact k="Telefono" v={missing(site.phone)} />
        <Fact k="Apertura" v={missing(site.openedOn)} />
        <Fact k="Superficie" v={site.areaSqm ? `${site.areaSqm} mq` : "non in fonti"} />
        <Fact k="Personale" v={missing(site.staffCount)} />
        <Fact k="Parcheggi" v={missing(site.parkingSpots)} />
        <Fact k="Confidenza" v={site.confidenceLabel} />
        <Fact k="Cluster" v={site.clusterLabel ?? "non in fonti"} />
        <Fact k="Geocoding" v={site.geocodeMethod} />
        <Fact
          k="Dal Ce.Di."
          v={site.kmFromHub != null ? `${site.kmFromHub} km` : "—"}
        />
        <Fact k="Fonti" v={String(site.sourceCount)} />
      </dl>

      <p className="mt-3 font-mono text-[11px] text-subtle">
        Anagrafica {filled}/6 campi · i vuoti sono assenze documentate
      </p>

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

      {flagNotes.length ? (
        <div className="mt-4 space-y-2">
          {flagNotes
            .filter((f) => f.note)
            .map((f) => (
              <p key={f.flag} className="text-xs leading-relaxed text-muted">
                {FLAG_LABEL[f.flag] ?? f.flag}: {f.note}
              </p>
            ))}
        </div>
      ) : null}

      {related.length ? (
        <div className="mt-6">
          <h3 className="text-xs tracking-wide text-muted uppercase">Schede collegate</h3>
          <ul className="mt-2 space-y-2">
            {related.map((r) =>
              r.other ? (
                <li key={`${r.kind}-${r.other.id}`}>
                  <button
                    type="button"
                    onClick={() => onPickRelated(r.other!.id)}
                    className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-left"
                  >
                    <div className="text-[11px] tracking-wide text-subtle uppercase">
                      {REL_LABEL[r.kind] ?? r.kind}
                    </div>
                    <div className="text-sm font-medium">{r.other.label}</div>
                    {r.note ? <p className="mt-1 text-xs text-muted">{r.note}</p> : null}
                  </button>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      ) : null}

      {events.length ? (
        <div className="mt-6">
          <h3 className="text-xs tracking-wide text-muted uppercase">Cronologia</h3>
          <ol className="mt-2 space-y-3">
            {events.map((e) => (
              <li key={`${e.occurredOn}-${e.title}`} className="border-l border-border pl-3">
                <div className="font-mono text-[11px] text-subtle">
                  {e.occurredOn ?? "data non in fonti"}
                </div>
                <div className="text-sm font-medium">{e.title}</div>
                {e.body ? <p className="text-xs text-muted">{e.body}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-xs tracking-wide text-muted uppercase">Fonti della scheda</h3>
        {sources.length ? (
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
                <span className="ml-2 text-subtle">
                  {ROLE_LABEL[s.role] ?? s.role}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Nessuna fonte per-scheda. Il pin resta in dossier con confidenza {site.confidenceLabel}.
          </p>
        )}
      </div>

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
