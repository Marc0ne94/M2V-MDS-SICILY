-- Provenance, coverage flags, missing gift-card stores, source-link correction.
-- Additive: do not edit 0002–0004.

alter table sites add column if not exists gift_card boolean not null default false;

alter table site_sources add column if not exists role text not null default 'supporting';

create table if not exists site_flags (
  site_id  integer not null references sites(id) on delete cascade,
  flag     text not null,
  note     text,
  primary key (site_id, flag)
);

create table if not exists site_relations (
  site_a  integer not null references sites(id) on delete cascade,
  site_b  integer not null references sites(id) on delete cascade,
  kind    text not null,
  note    text,
  primary key (site_a, site_b, kind),
  check (site_a < site_b)
);

create table if not exists eras (
  slug        text primary key,
  label       text not null,
  started_on  date,
  ended_on    date,
  blurb       text,
  sort        integer not null default 0
);

insert into eras (slug, label, started_on, ended_on, blurb, sort) values
  ('all', 'Tutto il dossier', NULL, NULL, 'Tutti i siti mappati, indipendentemente dalla data.', 0),
  ('uno-2019', 'Ex Uno 2019', '2019-06-01', '2019-07-31', 'Riaperture degli ex Uno Discount / Abate (Catania, Enna, Siracusa) più Nicolosi e Caltagirone.', 1),
  ('gift-2025', 'PDF gift card 2025', '2025-07-02', '2025-07-02', 'Sottoinsieme ufficiale: solo i pdv abilitati alle gift card. Assenza ≠ chiusura.', 2),
  ('post-pdf', 'Dopo il PDF', '2025-07-03', NULL, 'Aperture documentate successive al PDF gift card (Bernini, Galati, Sant''Agata).', 3)
on conflict (slug) do nothing;

insert into municipalities (province_code, name) values
  ('EN', 'Regalbuto'),
  ('CT', 'Scordia'),
  ('PA', 'Cefalù')
on conflict (province_code, name) do nothing;

insert into sites (network_id, code, kind_slug, ownership_slug, municipality_id, cluster_slug, label, street, civic, postal_code, lat, lon, geocode_method, phone, phones_extra, partner_name, opened_on, area_sqm, parking_spots, staff_count, notes, confidence_slug, osm_url, map_preview_url, status, gift_card) values
  ((select id from networks where slug = 'md'), 'EN-REGALBUTO', 'store', 'unknown', (select id from municipalities where province_code = 'EN' and name = 'Regalbuto'), 'center', 'Regalbuto Regione', 'Largo della Regione', NULL, '94017', 37.65342, 14.63695, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025. Assente dalla prima e dalla seconda ondata di mappa.', 'verified', 'https://www.openstreetmap.org/?mlat=37.65342&mlon=14.63695#map=17/37.65342/14.63695', NULL, 'open', true),
  ((select id from networks where slug = 'md'), 'CT-SCORDIA', 'store', 'unknown', (select id from municipalities where province_code = 'CT' and name = 'Scordia'), 'etna', 'Scordia Rasoli', 'Contrada Rasoli', 'zona industriale', '95048', 37.29192, 14.85405, 'approximate', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025: Contrada Rasoli, zona industriale. Geocoder sulla zona, non sul civico.', 'approximate', 'https://www.openstreetmap.org/?mlat=37.29192&mlon=14.85405#map=17/37.29192/14.85405', NULL, 'open', true),
  ((select id from networks where slug = 'md'), 'PA-CEFALU', 'store', 'unknown', (select id from municipalities where province_code = 'PA' and name = 'Cefalù'), 'nw', 'Cefalù Santa Lucia', 'Contrada Santa Lucia', 'S.S. 113', '90015', 38.03074, 14.00013, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025. Photon ha un pin «Santa Lucia - MD» sulla SS 113.', 'verified', 'https://www.openstreetmap.org/?mlat=38.03074&mlon=14.00013#map=17/38.03074/14.00013', NULL, 'open', true),
  ((select id from networks where slug = 'md'), 'CT-STELLA-CANTAG', 'store', 'unknown', (select id from municipalities where province_code = 'CT' and name = 'Aci Sant''Antonio'), 'etna', 'Santa Maria la Stella Cantagallo', 'Contrada Cantagallo', '29', '95025', 37.62920, 15.13158, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card: S.Maria la Stella, Contrada Cantagallo n.29. Distinto dall''ex Uno di Santa Maria di Licodia (versante ovest dell''Etna, ~20 km). Frazione di Aci Sant''Antonio.', 'verified', 'https://www.openstreetmap.org/?mlat=37.62920&mlon=15.13158#map=17/37.62920/15.13158', NULL, 'open', true)
on conflict (code) do nothing;

update sites set
  street = 'Via Mantineo',
  civic = '2',
  lat = 37.93057,
  lon = 15.35403,
  geocode_method = 'geocoded',
  osm_url = 'https://www.openstreetmap.org/?mlat=37.93057&mlon=15.35403#map=17/37.93057/15.35403',
  notes = coalesce(notes, '') || ' Indirizzo del PDF gift card 2025: Via Mantineo 2.',
  confidence_slug = 'verified'
where code = 'ME-SANTALESSIO';

update sites set
  notes = coalesce(notes, '') || ' PDF gift card 2025 lo elenca come Siculiana, Contrada Centro Salme, SS 115 km 170,485. La contrada è sul confine Realmonte/Siculiana: un solo pin, toponimo discordante.'
where code = 'AG-REALMONTE';

update sites set gift_card = true
where code in (
  'PA-CORLEONE',
  'PA-PARTINICO-KENNEDY',
  'CT-PATERNO-ARTI',
  'ME-CAPO-ORLANDO',
  'CT-BELPASSO-DANTE',
  'CT-PATERNO-PLATANI',
  'EN-NICOSIA',
  'EN-TROINA',
  'EN-REGALBUTO',
  'AG-REALMONTE',
  'CT-SCORDIA',
  'CT-MIRABELLA',
  'CT-BELPASSO-BELLINI',
  'ME-FARINA',
  'ME-MILAZZO',
  'PA-MARINEO',
  'PA-TRAMONTANA',
  'ME-POMPEA',
  'ME-LEONARDI',
  'ME-CURCURUTO',
  'ME-MANZONI',
  'ME-CRISAFULLI',
  'ME-ITALIA',
  'ME-BARCELLONA',
  'ME-TORREGROTTA',
  'CL-LEONE',
  'AG-FAVARA',
  'TP-VALDERICE',
  'PA-TERMINI',
  'PA-CAVALLOTTI',
  'RG-ONDINE',
  'PA-NATTA',
  'CT-MASCALUCIA',
  'SR-SORTINO',
  'CT-PIEDIMONTE',
  'AG-RACALMUTO',
  'TP-CUSTONACI',
  'CL-NISCEMI-EUROPA',
  'TP-CASTELLAMMARE',
  'CT-ZAFFERANA',
  'AG-UNITA',
  'TP-FONTANA',
  'AG-MOSE',
  'AG-PALMA',
  'CT-SGROPPILLO',
  'CT-PEDARA-ETNEA',
  'PA-LANZA',
  'PA-CEFALU',
  'RG-COMISO',
  'AG-LICATA',
  'CT-NICOLOSI',
  'SR-ROMANO',
  'PA-MATTEI',
  'PA-VILLABATE',
  'CT-CALTAGIRONE-EU',
  'CL-NISCEMI-CRESCI',
  'CT-INDIPENDENZA',
  'AG-CANICATTI',
  'CT-CALATABIANO',
  'CT-EUROPA',
  'CT-PEDARA-VERGA',
  'CT-ADRANO',
  'CT-PATERNO-BAL',
  'CT-RANDAZZO',
  'EN-LEONFORTE',
  'EN-PIAZZA',
  'CT-BELPASSO-VALC',
  'CT-GIARRE-PROV',
  'CT-LIBRINO',
  'CT-GIARRE-RUG',
  'SR-AUGUSTA-TAURO',
  'CT-BRONTE',
  'CT-PATERNO-SAR',
  'CT-GRAVINA',
  'CT-ULISSE',
  'CT-VENETO',
  'SR-AUGUSTA-MARINA',
  'ME-PISTUNINA',
  'CT-ACQUICELLA',
  'RG-POZZALLO',
  'TP-MAZARA',
  'PA-PONTE-ROSSO',
  'CT-MARCHESANA',
  'CT-STELLA-CANTAG',
  'ME-SANTALESSIO'
);

-- The 0003 seed linked EVERY site to the gift-card PDF and the store locator.
-- That over-attributed: the locator is not a per-site dump, and the PDF is a subset.
delete from site_sources
where source_id in (select id from sources where slug in ('md-gift-2025', 'md-negozi'));

insert into site_sources (site_id, source_id, role)
select s.id, src.id, 'gift_card'
from sites s
cross join sources src
where src.slug = 'md-gift-2025'
  and s.gift_card = true
on conflict (site_id, source_id) do update set role = excluded.role;

insert into site_sources (site_id, source_id, role)
select s.id, src.id, 'press'
from sites s
cross join sources src
where src.slug = 'gdo-abate-2019'
  and s.code in (
  'CT-ACQUICELLA',
  'CT-VENETO',
  'CT-LIBRINO',
  'CT-ULISSE',
  'CT-GRAVINA',
  'CT-CANTAGALLO',
  'CT-PEDARA-VERGA',
  'CT-BELPASSO-VALC',
  'CT-BELPASSO-TIMPA',
  'CT-BRONTE',
  'CT-PATERNO-SAR',
  'CT-PATERNO-BAL',
  'CT-ADRANO',
  'CT-RANDAZZO',
  'CT-GIARRE-PROV',
  'CT-GIARRE-RUG',
  'CT-CALATABIANO',
  'EN-LEONFORTE',
  'EN-PIAZZA',
  'SR-AUGUSTA-TAURO',
  'SR-AUGUSTA-MARINA'
  )
on conflict (site_id, source_id) do update set role = excluded.role;

insert into site_flags (site_id, flag, note)
select id, 'uno_ex', 'Riapertura ex Uno Discount / Abate, estate 2019.'
from sites
where code in (
  'CT-ACQUICELLA',
  'CT-VENETO',
  'CT-LIBRINO',
  'CT-ULISSE',
  'CT-GRAVINA',
  'CT-CANTAGALLO',
  'CT-PEDARA-VERGA',
  'CT-BELPASSO-VALC',
  'CT-BELPASSO-TIMPA',
  'CT-BRONTE',
  'CT-PATERNO-SAR',
  'CT-PATERNO-BAL',
  'CT-ADRANO',
  'CT-RANDAZZO',
  'CT-GIARRE-PROV',
  'CT-GIARRE-RUG',
  'CT-CALATABIANO',
  'EN-LEONFORTE',
  'EN-PIAZZA',
  'SR-AUGUSTA-TAURO',
  'SR-AUGUSTA-MARINA'
)
on conflict do nothing;

insert into site_flags (site_id, flag, note)
select id, 'post_giftcard', 'Apertura documentata dopo la data del PDF gift card (2025-07-02).'
from sites
where code in ('PA-BERNINI', 'ME-GALATI', 'ME-SANTAGATA')
on conflict do nothing;

insert into site_flags (site_id, flag, note)
select id, 'toponym_conflict', 'Gift card: Siculiana Centro Salme SS115. Pin tenuto a Realmonte (contrada di confine).'
from sites where code = 'AG-REALMONTE'
on conflict do nothing;

insert into site_flags (site_id, flag, note)
select id, 'possible_duplicate', 'Possibile stesso complesso di Augusta Marina (gift card: Marina di Ponente ang. Via Adua n.4).'
from sites where code = 'SR-AUGUSTA-ADUA'
on conflict do nothing;

insert into site_flags (site_id, flag, note)
select id, 'possible_relocation', 'Gift card 2025 elenca Viale Europa; questa scheda è Via Madonna della Via 176 (2019).'
from sites where code = 'CT-CALTAGIRONE'
on conflict do nothing;

insert into site_flags (site_id, flag, note)
select id, 'wave_2019', 'Apertura/riapertura nella finestra giugno–luglio 2019.'
from sites
where opened_on between '2019-06-01' and '2019-08-01'
on conflict do nothing;

insert into site_relations (site_a, site_b, kind, note)
select least(a.id, b.id), greatest(a.id, b.id), 'possible_same',
  'Il PDF gift card 2025 ha una sola riga «Marina di Ponente ang. Via Adua n.4». Due schede a ~300 m: possibile stesso complesso.'
from sites a, sites b
where a.code = 'SR-AUGUSTA-ADUA' and b.code = 'SR-AUGUSTA-MARINA'
on conflict do nothing;

insert into site_relations (site_a, site_b, kind, note)
select least(a.id, b.id), greatest(a.id, b.id), 'possible_relocation',
  'Due indirizzi a Caltagirone: Madonna della Via 176 (riapertura 2019) e Viale Europa (gift card 2025).'
from sites a, sites b
where a.code = 'CT-CALTAGIRONE' and b.code = 'CT-CALTAGIRONE-EU'
on conflict do nothing;

insert into site_relations (site_a, site_b, kind, note)
select least(a.id, b.id), greatest(a.id, b.id), 'distinct_homonym',
  'Omonimia Cantagallo: ex Uno a Santa Maria di Licodia (ovest Etna) vs gift card a Santa Maria la Stella / Aci Sant''Antonio (est). Distanza ~20 km, tenuti distinti.'
from sites a, sites b
where a.code = 'CT-CANTAGALLO' and b.code = 'CT-STELLA-CANTAG'
on conflict do nothing;

insert into site_sources (site_id, source_id, role)
select s.id, src.id, 'gift_card'
from sites s
cross join sources src
where src.slug = 'md-gift-2025'
  and s.code in ('EN-REGALBUTO','CT-SCORDIA','PA-CEFALU','CT-STELLA-CANTAG','ME-SANTALESSIO')
on conflict (site_id, source_id) do update set role = excluded.role;

update sites set served_by_hub = 'cedi-dittaino'
where kind_slug = 'store' and served_by_hub is null;

insert into research_notes (slug, title, body, as_of, sort) values
  (
    'provenance',
    'Provenienza dei dati',
    'Ogni pin ha fonti in tabella site_sources, con un ruolo (gift_card, press, corporate, directory). Il PDF gift card 2025 è l''unica anagrafica ufficiale per indirizzo, ma è un sottoinsieme. I comunicati GDO coprono aperture nominate, non la rete intera. Lo store locator societario non è un dump: non viene più agganciato a ogni scheda. I campi vuoti (telefono, data, mq) sono assenze documentate, non zeri inventati. Le coppie Augusta e Caltagirone e l''omonimia Cantagallo sono relazioni esplicite, non fusioni silenziose.',
    '2026-09-06',
    0
  ),
  (
    'gaps',
    'Cosa manca ancora',
    'Non è un elenco ufficiale completo. Restano pdv dichiarati (~90) senza indirizzo pubblico sufficiente, affiliati esclusi dal PDF, e schede con geocoding di comune. Aggiunti in questa ondata: Regalbuto, Scordia, Cefalù Santa Lucia, Santa Maria la Stella Cantagallo. Corretto Sant''Alessio (Via Mantineo 2). Realmonte/Siculiana è un solo pin con toponimo discordante. Chiusure: nessuna fonte primaria.',
    '2026-09-06',
    8
  )
on conflict (slug) do nothing;

update research_notes set
  body = 'Questo atlante storicizza i siti documentati da comunicati MD, PDF gift card 2025, stampa di settore e directory. Non è l''elenco esaustivo ufficiale. Il PDF gift card è ufficiale ma sottoinsieme. Dopo il terzo cross-check (settembre 2026) i pin gift-card sono agganciati uno a uno, non più in blocco. La rete dichiarata resta 67 → 90; i siti mappati superano quel numero perché gift card + stampa + directory si sovrappongono in modo diverso e restano coppie da verificare.',
  as_of = '2026-09-06'
where slug = 'coverage';
