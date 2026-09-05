import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";

export type SiteListItem = {
  id: number;
  code: string;
  kindSlug: string;
  kindLabel: string;
  ownershipSlug: string;
  ownershipLabel: string;
  clusterSlug: string | null;
  clusterLabel: string | null;
  label: string;
  street: string | null;
  civic: string | null;
  postalCode: string | null;
  municipality: string;
  provinceCode: string;
  provinceName: string;
  lat: number;
  lon: number;
  geocodeMethod: string;
  phone: string | null;
  phonesExtra: string | null;
  partnerName: string | null;
  openedOn: string | null;
  areaSqm: number | null;
  parkingSpots: number | null;
  staffCount: number | null;
  notes: string | null;
  confidenceSlug: string;
  confidenceLabel: string;
  osmUrl: string | null;
  mapPreviewUrl: string | null;
  status: string;
  servedByHubSlug: string | null;
  servedByHubLabel: string | null;
};

export type AtlasSource = {
  slug: string;
  title: string;
  url: string | null;
  publishedOn: string | null;
  kind: string;
};

export type LogisticsHub = {
  slug: string;
  siteCode: string | null;
  label: string;
  locality: string;
  province: string | null;
  region: string;
  openedOn: string | null;
  coveredSqm: number | null;
  totalSqm: number | null;
  claimedStores: number | null;
  catchment: string | null;
  notes: string | null;
  lat: number | null;
  lon: number | null;
  geocodeMethod: string;
  onSicilyMap: boolean;
  status: string;
  sort: number;
  confidenceSlug: string;
  confidenceLabel: string;
};

export type LogisticsFlow = {
  fromHub: string;
  toHub: string | null;
  toRegion: string | null;
  toClusterSlug: string | null;
  kind: string;
  label: string;
  blurb: string | null;
};

export type AtlasPayload = {
  network: {
    brandName: string;
    legalName: string;
    parentName: string | null;
    hqAddress: string | null;
    hqCity: string | null;
    foundedYear: number | null;
    notes: string | null;
  };
  sites: SiteListItem[];
  provinces: { code: string; name: string; siteCount: number }[];
  clusters: { slug: string; label: string; blurb: string | null; siteCount: number }[];
  notes: { slug: string; title: string; body: string; asOf: string | null }[];
  stats: { asOf: string; reportedCount: number; note: string | null }[];
  org: {
    slug: string;
    label: string;
    kind: string;
    blurb: string | null;
    parentSlug: string | null;
    parentLabel: string | null;
  }[];
  events: { siteId: number; occurredOn: string | null; title: string; body: string | null }[];
  sources: AtlasSource[];
  siteSources: { siteId: number; sourceSlug: string }[];
  hubs: LogisticsHub[];
  flows: LogisticsFlow[];
};

export const loadAtlas = createServerFn({ method: "GET" }).handler(
  async (): Promise<AtlasPayload> => {
    const sql = await getSql();

    const networks = await sql<{
      brand_name: string;
      legal_name: string;
      parent_name: string | null;
      hq_address: string | null;
      hq_city: string | null;
      founded_year: number | null;
      notes: string | null;
    }>`select brand_name, legal_name, parent_name, hq_address, hq_city, founded_year, notes from networks limit 1`;

    const sites = await sql<{
      id: number;
      code: string;
      kind_slug: string;
      kind_label: string;
      ownership_slug: string;
      ownership_label: string;
      cluster_slug: string | null;
      cluster_label: string | null;
      label: string;
      street: string | null;
      civic: string | null;
      postal_code: string | null;
      municipality: string;
      province_code: string;
      province_name: string;
      lat: number;
      lon: number;
      geocode_method: string;
      phone: string | null;
      phones_extra: string | null;
      partner_name: string | null;
      opened_on: string | null;
      area_sqm: number | null;
      parking_spots: number | null;
      staff_count: number | null;
      notes: string | null;
      confidence_slug: string;
      confidence_label: string;
      osm_url: string | null;
      map_preview_url: string | null;
      status: string;
      served_by_hub: string | null;
      served_by_hub_label: string | null;
    }>`
      select
        s.id, s.code, s.kind_slug, k.label as kind_label,
        s.ownership_slug, o.label as ownership_label,
        s.cluster_slug, c.label as cluster_label,
        s.label, s.street, s.civic, s.postal_code,
        m.name as municipality, p.code as province_code, p.name as province_name,
        s.lat, s.lon, s.geocode_method, s.phone, s.phones_extra, s.partner_name,
        s.opened_on::text as opened_on, s.area_sqm, s.parking_spots, s.staff_count,
        s.notes, s.confidence_slug, conf.label as confidence_label,
        s.osm_url, s.map_preview_url, s.status,
        s.served_by_hub, h.label as served_by_hub_label
      from sites s
      join site_kinds k on k.slug = s.kind_slug
      join ownership_kinds o on o.slug = s.ownership_slug
      join confidence_levels conf on conf.slug = s.confidence_slug
      join municipalities m on m.id = s.municipality_id
      join provinces p on p.code = m.province_code
      left join clusters c on c.slug = s.cluster_slug
      left join logistics_hubs h on h.slug = s.served_by_hub
      order by p.name, m.name, s.label
    `;

    const provinces = await sql<{ code: string; name: string; site_count: number }>`
      select p.code, p.name, count(s.id)::int as site_count
      from provinces p
      left join municipalities m on m.province_code = p.code
      left join sites s on s.municipality_id = m.id
      group by p.code, p.name
      order by p.name
    `;

    const clusters = await sql<{
      slug: string;
      label: string;
      blurb: string | null;
      site_count: number;
    }>`
      select c.slug, c.label, c.blurb, count(s.id)::int as site_count
      from clusters c
      left join sites s on s.cluster_slug = c.slug
      group by c.slug, c.label, c.blurb
      order by c.slug
    `;

    const notes = await sql<{ slug: string; title: string; body: string; as_of: string | null }>`
      select slug, title, body, as_of::text as as_of from research_notes order by sort
    `;

    const stats = await sql<{ as_of: string; reported_count: number; note: string | null }>`
      select as_of::text as as_of, reported_count, note from snapshot_stats order by as_of
    `;

    const org = await sql<{
      slug: string;
      label: string;
      kind: string;
      blurb: string | null;
      parent_slug: string | null;
      parent_label: string | null;
    }>`
      select n.slug, n.label, n.kind, n.blurb, p.slug as parent_slug, p.label as parent_label
      from org_nodes n
      left join org_nodes p on p.id = n.parent_id
      order by n.sort
    `;

    const events = await sql<{
      site_id: number;
      occurred_on: string | null;
      title: string;
      body: string | null;
    }>`
      select site_id, occurred_on::text as occurred_on, title, body
      from timeline_events
      order by occurred_on nulls last
    `;

    const sources = await sql<{
      slug: string;
      title: string;
      url: string | null;
      published_on: string | null;
      kind: string;
    }>`
      select slug, title, url, published_on::text as published_on, kind
      from sources
      order by published_on nulls last, title
    `;

    const siteSources = await sql<{ site_id: number; source_slug: string }>`
      select ss.site_id, src.slug as source_slug
      from site_sources ss
      join sources src on src.id = ss.source_id
    `;

    const hubs = await sql<{
      slug: string;
      site_code: string | null;
      label: string;
      locality: string;
      province: string | null;
      region: string;
      opened_on: string | null;
      covered_sqm: number | null;
      total_sqm: number | null;
      claimed_stores: number | null;
      catchment: string | null;
      notes: string | null;
      lat: number | null;
      lon: number | null;
      geocode_method: string;
      on_sicily_map: boolean;
      status: string;
      sort: number;
      confidence_slug: string;
      confidence_label: string;
    }>`
      select
        h.slug, h.site_code, h.label, h.locality, h.province, h.region,
        h.opened_on::text as opened_on, h.covered_sqm, h.total_sqm, h.claimed_stores,
        h.catchment, h.notes, h.lat, h.lon, h.geocode_method, h.on_sicily_map,
        h.status, h.sort, h.confidence_slug, conf.label as confidence_label
      from logistics_hubs h
      join confidence_levels conf on conf.slug = h.confidence_slug
      order by h.sort
    `;

    const flows = await sql<{
      from_hub: string;
      to_hub: string | null;
      to_region: string | null;
      to_cluster_slug: string | null;
      kind: string;
      label: string;
      blurb: string | null;
    }>`
      select from_hub, to_hub, to_region, to_cluster_slug, kind, label, blurb
      from logistics_flows
      order by sort
    `;

    const n = networks[0];
    if (!n) throw new Error("Network row missing — seed did not apply.");

    return {
      network: {
        brandName: n.brand_name,
        legalName: n.legal_name,
        parentName: n.parent_name,
        hqAddress: n.hq_address,
        hqCity: n.hq_city,
        foundedYear: n.founded_year,
        notes: n.notes,
      },
      sites: sites.map((s) => ({
        id: s.id,
        code: s.code,
        kindSlug: s.kind_slug,
        kindLabel: s.kind_label,
        ownershipSlug: s.ownership_slug,
        ownershipLabel: s.ownership_label,
        clusterSlug: s.cluster_slug,
        clusterLabel: s.cluster_label,
        label: s.label,
        street: s.street,
        civic: s.civic,
        postalCode: s.postal_code,
        municipality: s.municipality,
        provinceCode: s.province_code,
        provinceName: s.province_name,
        lat: Number(s.lat),
        lon: Number(s.lon),
        geocodeMethod: s.geocode_method,
        phone: s.phone,
        phonesExtra: s.phones_extra,
        partnerName: s.partner_name,
        openedOn: s.opened_on,
        areaSqm: s.area_sqm,
        parkingSpots: s.parking_spots,
        staffCount: s.staff_count,
        notes: s.notes,
        confidenceSlug: s.confidence_slug,
        confidenceLabel: s.confidence_label,
        osmUrl: s.osm_url,
        mapPreviewUrl: s.map_preview_url,
        status: s.status,
        servedByHubSlug: s.served_by_hub,
        servedByHubLabel: s.served_by_hub_label,
      })),
      provinces: provinces.map((p) => ({
        code: p.code,
        name: p.name,
        siteCount: p.site_count,
      })),
      clusters: clusters.map((c) => ({
        slug: c.slug,
        label: c.label,
        blurb: c.blurb,
        siteCount: c.site_count,
      })),
      notes: notes.map((x) => ({
        slug: x.slug,
        title: x.title,
        body: x.body,
        asOf: x.as_of,
      })),
      stats: stats.map((x) => ({
        asOf: x.as_of,
        reportedCount: x.reported_count,
        note: x.note,
      })),
      org: org.map((x) => ({
        slug: x.slug,
        label: x.label,
        kind: x.kind,
        blurb: x.blurb,
        parentSlug: x.parent_slug,
        parentLabel: x.parent_label,
      })),
      events: events.map((e) => ({
        siteId: e.site_id,
        occurredOn: e.occurred_on,
        title: e.title,
        body: e.body,
      })),
      sources: sources.map((s) => ({
        slug: s.slug,
        title: s.title,
        url: s.url,
        publishedOn: s.published_on,
        kind: s.kind,
      })),
      siteSources: siteSources.map((s) => ({
        siteId: s.site_id,
        sourceSlug: s.source_slug,
      })),
      hubs: hubs.map((h) => ({
        slug: h.slug,
        siteCode: h.site_code,
        label: h.label,
        locality: h.locality,
        province: h.province,
        region: h.region,
        openedOn: h.opened_on,
        coveredSqm: h.covered_sqm,
        totalSqm: h.total_sqm,
        claimedStores: h.claimed_stores,
        catchment: h.catchment,
        notes: h.notes,
        lat: h.lat == null ? null : Number(h.lat),
        lon: h.lon == null ? null : Number(h.lon),
        geocodeMethod: h.geocode_method,
        onSicilyMap: Boolean(h.on_sicily_map),
        status: h.status,
        sort: h.sort,
        confidenceSlug: h.confidence_slug,
        confidenceLabel: h.confidence_label,
      })),
      flows: flows.map((f) => ({
        fromHub: f.from_hub,
        toHub: f.to_hub,
        toRegion: f.to_region,
        toClusterSlug: f.to_cluster_slug,
        kind: f.kind,
        label: f.label,
        blurb: f.blurb,
      })),
    };
  },
);

export const loadSiteEvents = createServerFn({ method: "GET" })
  .validator(z.object({ siteId: z.number() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    return sql<{ occurred_on: string | null; title: string; body: string | null }>`
      select occurred_on::text as occurred_on, title, body
      from timeline_events
      where site_id = ${data.siteId}
      order by occurred_on
    `;
  });
