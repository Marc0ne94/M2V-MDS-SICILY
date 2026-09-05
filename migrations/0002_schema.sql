-- M2V MDS Sicily — normalized territorial atlas (unowned, world-readable)

create table if not exists networks (
  id            serial primary key,
  slug          text not null unique,
  brand_name    text not null,
  legal_name    text not null,
  parent_name   text,
  hq_address    text,
  hq_city       text,
  founded_year  integer,
  notes         text
);

create table if not exists site_kinds (
  slug   text primary key,
  label  text not null,
  sort   integer not null default 0
);

create table if not exists ownership_kinds (
  slug   text primary key,
  label  text not null
);

create table if not exists confidence_levels (
  slug   text primary key,
  label  text not null,
  sort   integer not null default 0
);

create table if not exists clusters (
  slug   text primary key,
  label  text not null,
  blurb  text
);

create table if not exists provinces (
  code   text primary key,
  name   text not null,
  istat  text
);

create table if not exists municipalities (
  id             serial primary key,
  province_code  text not null references provinces(code),
  name           text not null,
  unique (province_code, name)
);

create table if not exists sites (
  id               serial primary key,
  network_id       integer not null references networks(id),
  code             text not null unique,
  kind_slug        text not null references site_kinds(slug),
  ownership_slug   text not null references ownership_kinds(slug),
  municipality_id  integer not null references municipalities(id),
  cluster_slug     text references clusters(slug),
  label            text not null,
  street           text,
  civic            text,
  postal_code      text,
  lat              double precision not null,
  lon              double precision not null,
  geocode_method   text not null default 'unknown',
  phone            text,
  phones_extra     text,
  partner_name     text,
  opened_on        date,
  area_sqm         integer,
  parking_spots    integer,
  staff_count      integer,
  notes            text,
  confidence_slug  text not null references confidence_levels(slug),
  osm_url          text,
  map_preview_url  text,
  status           text not null default 'open'
);

create index if not exists sites_kind_idx on sites (kind_slug);
create index if not exists sites_province_idx on sites (municipality_id);
create index if not exists sites_cluster_idx on sites (cluster_slug);

create table if not exists sources (
  id            serial primary key,
  slug          text not null unique,
  title         text not null,
  url           text,
  published_on  date,
  kind          text not null default 'web'
);

create table if not exists site_sources (
  site_id    integer not null references sites(id) on delete cascade,
  source_id  integer not null references sources(id) on delete cascade,
  primary key (site_id, source_id)
);

create table if not exists timeline_events (
  id           serial primary key,
  site_id      integer references sites(id) on delete cascade,
  occurred_on  date,
  title        text not null,
  body         text
);

create table if not exists org_nodes (
  id         serial primary key,
  parent_id  integer references org_nodes(id),
  slug       text not null unique,
  label      text not null,
  kind       text not null,
  blurb      text,
  sort       integer not null default 0
);

create table if not exists org_site_links (
  org_id   integer not null references org_nodes(id) on delete cascade,
  site_id  integer not null references sites(id) on delete cascade,
  primary key (org_id, site_id)
);

create table if not exists research_notes (
  id     serial primary key,
  slug   text not null unique,
  title  text not null,
  body   text not null,
  as_of  date,
  sort   integer not null default 0
);

create table if not exists snapshot_stats (
  id              serial primary key,
  as_of           date not null,
  reported_count  integer,
  source_slug     text,
  note            text
);
