-- Cross-check 2026-09: gift-card PDF, corporate CEDI, press openings, address corrections.
-- Do not edit 0002/0003; this file is additive.

create table if not exists logistics_hubs (
  slug              text primary key,
  site_code         text unique,
  label             text not null,
  locality          text not null,
  province          text,
  region            text not null,
  opened_on         date,
  covered_sqm       integer,
  total_sqm         integer,
  claimed_stores    integer,
  catchment         text,
  notes             text,
  lat               double precision,
  lon               double precision,
  geocode_method    text not null default 'unknown',
  on_sicily_map     boolean not null default false,
  status            text not null default 'active',
  sort              integer not null default 0,
  confidence_slug   text not null references confidence_levels(slug)
);

create table if not exists logistics_flows (
  id               serial primary key,
  from_hub         text not null references logistics_hubs(slug) on delete cascade,
  to_hub           text references logistics_hubs(slug) on delete cascade,
  to_region        text,
  to_cluster_slug  text references clusters(slug),
  kind             text not null,
  label            text not null,
  blurb            text,
  sort             integer not null default 0
);

alter table sites add column if not exists served_by_hub text;

insert into municipalities (province_code, name) values
  ('PA', 'Corleone'),
  ('PA', 'Partinico'),
  ('PA', 'Marineo'),
  ('ME', 'Capo d''Orlando'),
  ('ME', 'Milazzo'),
  ('ME', 'Barcellona Pozzo di Gotto'),
  ('ME', 'Torregrotta'),
  ('EN', 'Troina'),
  ('TP', 'Valderice'),
  ('TP', 'Custonaci'),
  ('TP', 'Castellammare del Golfo'),
  ('TP', 'Mazara del Vallo'),
  ('AG', 'Racalmuto'),
  ('CL', 'Niscemi'),
  ('RG', 'Comiso'),
  ('RG', 'Pozzallo')
on conflict (province_code, name) do nothing;

insert into sites (network_id, code, kind_slug, ownership_slug, municipality_id, cluster_slug, label, street, civic, postal_code, lat, lon, geocode_method, phone, phones_extra, partner_name, opened_on, area_sqm, parking_spots, staff_count, notes, confidence_slug, osm_url, map_preview_url, status) values
  ((select id from networks where slug = 'md'), 'PA-CORLEONE', 'store', 'unknown', (select id from municipalities where province_code = 'PA' and name = 'Corleone'), 'nw', 'Corleone Verdi', 'Via Giuseppe Verdi', '20', '90034', 37.82048, 13.29538, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Presente nel PDF gift card ufficiale 2025.', 'verified', 'https://www.openstreetmap.org/?mlat=37.82048&mlon=13.29538#map=17/37.82048/13.29538', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'PA-PARTINICO-KENNEDY', 'store', 'affiliated', (select id from municipalities where province_code = 'PA' and name = 'Partinico'), 'nw', 'Partinico Kennedy', 'Via John Fitzgerald Kennedy', '13', '90047', 38.04363, 13.12193, 'geocoded', '091 9763506', NULL, 'Royal S.r.l.', '2020-11-26', 1000, NULL, 7, 'Affiliato Royal S.r.l. Comunicato 26/11/2020: secondo MD del partner, ~1.000 mq. Elenco gift card 2025.', 'verified', 'https://www.openstreetmap.org/?mlat=38.04363&mlon=13.12193#map=17/38.04363/13.12193', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'CT-PATERNO-ARTI', 'store', 'unknown', (select id from municipalities where province_code = 'CT' and name = 'Paternò'), 'etna', 'Paternò Arti e Mestieri', 'Via delle Arti e dei Mestieri', 'angolo Via dei Pioppi', '95047', 37.57899, 14.9003, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Terzo/quarto pdv a Paternò nel PDF gift card 2025.', 'verified', 'https://www.openstreetmap.org/?mlat=37.57899&mlon=14.9003#map=17/37.57899/14.9003', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'ME-CAPO-ORLANDO', 'store', 'unknown', (select id from municipalities where province_code = 'ME' and name = 'Capo d''Orlando'), 'ne', 'Capo d''Orlando Muscale', 'Via Muscale', '54', '98071', 38.1614, 14.74727, 'municipality', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card: S.S. 114 km 4,700, Via Muscale 54. Geocoder ha centrato il comune, non il civico.', 'approximate', 'https://www.openstreetmap.org/?mlat=38.1614&mlon=14.74727#map=17/38.1614/14.74727', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'CT-PATERNO-PLATANI', 'store', 'unknown', (select id from municipalities where province_code = 'CT' and name = 'Paternò'), 'etna', 'Paternò Platani', 'Viale dei Platani', '40/60', '95047', 37.57608, 14.90923, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025.', 'verified', 'https://www.openstreetmap.org/?mlat=37.57608&mlon=14.90923#map=17/37.57608/14.90923', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'EN-TROINA', 'store', 'unknown', (select id from municipalities where province_code = 'EN' and name = 'Troina'), 'center', 'Troina Castile Camatrone', 'Contrada Castile Camatrone', NULL, '94018', 37.78522, 14.60045, 'municipality', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025. Posizione di comune, contrada non geocodata al civico.', 'approximate', 'https://www.openstreetmap.org/?mlat=37.78522&mlon=14.60045#map=17/37.78522/14.60045', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'ME-MILAZZO', 'store', 'unknown', (select id from municipalities where province_code = 'ME' and name = 'Milazzo'), 'ne', 'Milazzo Acqueviole', 'Via Acqueviole', NULL, '98057', 38.21003, 15.25005, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025.', 'verified', 'https://www.openstreetmap.org/?mlat=38.21003&mlon=15.25005#map=17/38.21003/15.25005', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'PA-MARINEO', 'store', 'unknown', (select id from municipalities where province_code = 'PA' and name = 'Marineo'), 'nw', 'Marineo Roccabianca', 'Contrada Roccabianca', 'S.S. 118', '90040', 37.93051, 13.45531, 'approximate', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025. Photon ha agganciato una contrada vicina, non il civico.', 'approximate', 'https://www.openstreetmap.org/?mlat=37.93051&mlon=13.45531#map=17/37.93051/13.45531', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'ME-BARCELLONA', 'store', 'unknown', (select id from municipalities where province_code = 'ME' and name = 'Barcellona Pozzo di Gotto'), 'ne', 'Barcellona Pozzo di Gotto Vetrine', 'Via Industriale Comprensoriale Vetrine', NULL, '98051', 38.15547, 15.21054, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025.', 'verified', 'https://www.openstreetmap.org/?mlat=38.15547&mlon=15.21054#map=17/38.15547/15.21054', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'ME-TORREGROTTA', 'store', 'unknown', (select id from municipalities where province_code = 'ME' and name = 'Torregrotta'), 'ne', 'Torregrotta XXI Ottobre', 'Via XXI Ottobre', '3/B', '98030', 38.20467, 15.34968, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025, Contrada Carrubba.', 'verified', 'https://www.openstreetmap.org/?mlat=38.20467&mlon=15.34968#map=17/38.20467/15.34968', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'TP-VALDERICE', 'store', 'unknown', (select id from municipalities where province_code = 'TP' and name = 'Valderice'), 'west', 'Valderice Bonagia', 'Contrada Bonagia', 'Via Nicasio Triolo', '91019', 38.06418, 12.59492, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025. Frazione costiera Bonagia.', 'verified', 'https://www.openstreetmap.org/?mlat=38.06418&mlon=12.59492#map=17/38.06418/12.59492', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'AG-RACALMUTO', 'store', 'unknown', (select id from municipalities where province_code = 'AG' and name = 'Racalmuto'), 'west', 'Racalmuto Spalanca', 'Via Edoardo Spalanca', '23', '92020', 37.40359, 13.70587, 'approximate', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025. Geocoder impreciso sul civico.', 'approximate', 'https://www.openstreetmap.org/?mlat=37.40359&mlon=13.70587#map=17/37.40359/13.70587', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'TP-CUSTONACI', 'store', 'unknown', (select id from municipalities where province_code = 'TP' and name = 'Custonaci'), 'west', 'Custonaci Firenze', 'Via Firenze', '22', '91015', 38.07676, 12.68499, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025.', 'verified', 'https://www.openstreetmap.org/?mlat=38.07676&mlon=12.68499#map=17/38.07676/12.68499', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'CL-NISCEMI-EUROPA', 'store', 'unknown', (select id from municipalities where province_code = 'CL' and name = 'Niscemi'), 'center', 'Niscemi Europa', 'Via Europa', NULL, '93015', 37.15182, 14.38538, 'geocoded', '320 4590505', NULL, NULL, NULL, NULL, NULL, NULL, 'Secondo pdv a Niscemi, PDF gift card 2025. Distinto da Via Crescimone 126.', 'verified', 'https://www.openstreetmap.org/?mlat=37.15182&mlon=14.38538#map=17/37.15182/14.38538', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'TP-CASTELLAMMARE', 'store', 'unknown', (select id from municipalities where province_code = 'TP' and name = 'Castellammare del Golfo'), 'west', 'Castellammare Gemma d''Oro', 'Via Gemma d''Oro', '4', '91014', 38.01609, 12.89189, 'geocoded', '320 4587516', NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025. Photon ha trovato il pin MD sul civico.', 'verified', 'https://www.openstreetmap.org/?mlat=38.01609&mlon=12.89189#map=17/38.01609/12.89189', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'RG-COMISO', 'store', 'unknown', (select id from municipalities where province_code = 'RG' and name = 'Comiso'), 'se', 'Comiso Dalla Chiesa', 'Via Carlo Alberto Dalla Chiesa', NULL, '97013', 36.95377, 14.61303, 'geocoded', '320 4576802', NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025.', 'verified', 'https://www.openstreetmap.org/?mlat=36.95377&mlon=14.61303#map=17/36.95377/14.61303', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'CT-CALTAGIRONE-EU', 'store', 'unknown', (select id from municipalities where province_code = 'CT' and name = 'Caltagirone'), 'etna', 'Caltagirone Europa', 'Viale Europa', NULL, '95041', 37.21738, 14.52058, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Indirizzo del PDF gift card 2025. Distinto da Via Madonna della Via 176 (riapertura 2019). Possibile trasloco o secondo pdv.', 'verified', 'https://www.openstreetmap.org/?mlat=37.21738&mlon=14.52058#map=17/37.21738/14.52058', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'CL-NISCEMI-CRESCI', 'store', 'direct', (select id from municipalities where province_code = 'CL' and name = 'Niscemi'), 'center', 'Niscemi Crescimone', 'Via Vincenzo Crescimone', '126', '93015', 37.14718, 14.38777, 'geocoded', '0933 954253', NULL, NULL, '2020-06-11', 900, 40, 19, 'Apertura diretta 11/06/2020, all''epoca 68° pdv siciliano (59 diretti + 9 affiliati). 5 corsie, 5 casse, parcheggio sotterraneo ~40 posti. Comunicato MD / GDO Week.', 'verified', 'https://www.openstreetmap.org/?mlat=37.14718&mlon=14.38777#map=17/37.14718/14.38777', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'RG-POZZALLO', 'store', 'unknown', (select id from municipalities where province_code = 'RG' and name = 'Pozzallo'), 'se', 'Pozzallo Stadio', 'Via dello Stadio', NULL, '97016', 36.7338, 14.83286, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025.', 'verified', 'https://www.openstreetmap.org/?mlat=36.7338&mlon=14.83286#map=17/36.7338/14.83286', NULL, 'open'),
  ((select id from networks where slug = 'md'), 'TP-MAZARA', 'store', 'unknown', (select id from municipalities where province_code = 'TP' and name = 'Mazara del Vallo'), 'west', 'Mazara del Vallo Castelvetrano', 'Via Castelvetrano', '68-68/1', '91026', 37.64626, 12.60996, 'geocoded', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PDF gift card 2025.', 'verified', 'https://www.openstreetmap.org/?mlat=37.64626&mlon=12.60996#map=17/37.64626/12.60996', NULL, 'open')
on conflict (code) do nothing;

insert into logistics_hubs (
  slug, site_code, label, locality, province, region, opened_on,
  covered_sqm, total_sqm, claimed_stores, catchment, notes,
  lat, lon, geocode_method, on_sicily_map, status, sort, confidence_slug
) values
  (
    'cedi-gricignano', NULL, 'Ce.Di. Gricignano di Aversa',
    'Gricignano di Aversa', 'CE', 'Campania', '1995-01-01',
    64000, NULL, NULL,
    'Polo principale del Sud Italia. Sede operativa e direzione.',
    'Pagina societaria «La nostra storia»: apertura 1995 con 55.000 mq coperti. Pagina «Logistica»: 64.000 mq coperti, impianto fotovoltaico da 9.720 pannelli. Stesso agglomerato: polo food e, dal 2015, magazzino Non Food. Non è in Sicilia e non rifornisce i pdv siciliani (competenza di Dittaino).',
    41.00767, 14.24911, 'geocoded', false, 'active', 0, 'verified'
  ),
  (
    'cedi-dittaino', 'CEDI-DITTAINO', 'Ce.Di. Dittaino',
    'Dittaino / Assoro', 'EN', 'Sicilia', '2009-01-01',
    20000, NULL, NULL,
    'Tutti i punti vendita della Sicilia e parte della Calabria.',
    'Unico Ce.Di. sull''isola, area industriale di Dittaino sull''A19. Fonte societaria 2009: oltre 20.000 mq coperti. Comunicati successivi parlano di oltre 30.000 mq. Il comunicato Cortenuova 2022 cita «due di Dittaino»: due capannoni nello stesso agglomerato, non due province. Pagina «Chi siamo»: uno dei 6 depositi nazionali.',
    37.5608, 14.4509, 'corrected', true, 'active', 1, 'verified'
  ),
  (
    'cedi-bitonto', NULL, 'Ce.Di. Bitonto',
    'Bitonto', 'BA', 'Puglia', '2013-01-01',
    34000, NULL, NULL,
    'Terzo polo logistico nazionale (Puglia / Sud-est continentale).',
    'Inaugurato nel 2013, 34.000 mq secondo «La nostra storia». Coordinate di comune: il civico del deposito non è pubblicato. Non rifornisce la Sicilia.',
    41.10800, 16.69100, 'municipality', false, 'active', 2, 'probable'
  ),
  (
    'cedi-mantova', NULL, 'Ce.Di. Mantova',
    'Mantova', 'MN', 'Lombardia', NULL,
    NULL, NULL, NULL,
    'Piattaforma storica del Nord, citata anche per l''ortofrutta insieme a Gricignano e Macomer.',
    'Elencato tra i 6 depositi in «Chi siamo». Anno di apertura e mq coperti non pubblicati sulle pagine corporate consultate. Posizione di zona industriale (Strada Ghisiolo), civico non verificato. Non rifornisce la Sicilia.',
    45.16388, 10.81867, 'approximate', false, 'active', 3, 'probable'
  ),
  (
    'cedi-macomer', NULL, 'Ce.Di. Macomer Tossilo',
    'Tossilo di Macomer', 'NU', 'Sardegna', '2017-04-01',
    47200, 204000, 200,
    'Isola di Sardegna. Capacità dichiarata fino a 200 punti vendita.',
    'Apertura 2017, località Tossilo. 47.200 mq coperti (6.400 celle frigo, 36.250 deposito, 1.800 uffici, 2.750 officine) su 204.000 mq di area. Investimento dichiarato 15 milioni. Non rifornisce la Sicilia.',
    40.23974, 8.78981, 'geocoded', false, 'active', 4, 'verified'
  ),
  (
    'cedi-cortenuova', NULL, 'Ce.Di. Cortenuova',
    'Cortenuova', 'BG', 'Lombardia', '2022-04-28',
    112000, 182000, 250,
    'Nord-Ovest e Lombardia: 250 negozi all''inaugurazione.',
    'Inaugurato il 28 aprile 2022. Superficie netta 182.000 mq di cui 112.000 coperti. Magazzino automatizzato 8.000 mq × 32 m, oltre 40.000 pallet. Investimento circa 100 milioni. 2,5 rifornimenti di generi vari e 5 di fresco a settimana per negozio. Comunicato: «settimo centro» contando i due capannoni di Dittaino; «Chi siamo» e «Logistica» restano su 6 depositi.',
    45.52953, 9.82515, 'geocoded', false, 'active', 5, 'verified'
  ),
  (
    'cedi-imola', NULL, 'Polo Imola (in progetto)',
    'Imola', 'BO', 'Emilia-Romagna', NULL,
    60000, 163000, NULL,
    'Progetto 2025 presso il casello A14. Non operativo.',
    'Giugno 2025: commissioni consiliari di Imola approvano l''accordo di programma per un polo di circa 60.000 mq su 163.000 mq di area, investimento oltre 50 milioni. Non figura nell''elenco ufficiale dei 6 depositi. Incluso come scheda di progetto, non come Ce.Di. attivo.',
    44.35300, 11.71400, 'municipality', false, 'planned', 6, 'probable'
  )
on conflict (slug) do nothing;

alter table sites
  add constraint sites_served_by_hub_fkey
  foreign key (served_by_hub) references logistics_hubs(slug);

update sites set served_by_hub = 'cedi-dittaino'
where kind_slug = 'store' and served_by_hub is null;

insert into logistics_flows (from_hub, to_hub, to_region, to_cluster_slug, kind, label, blurb, sort) values
  ('cedi-dittaino', NULL, 'Sicilia', NULL, 'replenish', 'Rifornimento rete siciliana', 'Fonte societaria: il Ce.Di. di Dittaino garantisce i rifornimenti a tutti i pdv della Sicilia.', 0),
  ('cedi-dittaino', NULL, 'Calabria', NULL, 'replenish', 'Quota Calabria', 'Stessa fonte: «parte della Calabria». I pdv calabresi non sono in questo atlante.', 1),
  ('cedi-dittaino', NULL, 'Sicilia', 'etna', 'cluster', 'Cluster Est / Etna', 'Flusso operativo ricostruito: pdv etnei e catanesi serviti da Dittaino.', 2),
  ('cedi-dittaino', NULL, 'Sicilia', 'ne', 'cluster', 'Cluster Nord-est', 'Messina città e provincia tirrenica/ionica.', 3),
  ('cedi-dittaino', NULL, 'Sicilia', 'nw', 'cluster', 'Cluster Nord-ovest', 'Palermo e hinterland.', 4),
  ('cedi-dittaino', NULL, 'Sicilia', 'west', 'cluster', 'Cluster Ovest', 'Trapani e Agrigento.', 5),
  ('cedi-dittaino', NULL, 'Sicilia', 'se', 'cluster', 'Cluster Sud-est', 'Siracusa e Ragusa.', 6),
  ('cedi-dittaino', NULL, 'Sicilia', 'center', 'cluster', 'Cluster Centro', 'Enna e Caltanissetta.', 7),
  ('cedi-gricignano', NULL, 'Sud continentale', NULL, 'catchment', 'Polo Sud', 'Sede e deposito più importante del Sud. Non alimenta i pdv siciliani.', 10),
  ('cedi-bitonto', NULL, 'Puglia', NULL, 'catchment', 'Polo pugliese', 'Terzo polo 2013. Bacino fine non pubblicato punto per punto.', 11),
  ('cedi-mantova', NULL, 'Nord', NULL, 'catchment', 'Piattaforma Nord / ortofrutta', 'Citata come piattaforma ortofrutta con Gricignano e Macomer. Bacino puntuale non pubblicato.', 12),
  ('cedi-macomer', NULL, 'Sardegna', NULL, 'catchment', 'Rete sarda', 'Capacità dichiarata fino a 200 pdv. Isola autonoma sul piano logistico.', 13),
  ('cedi-cortenuova', NULL, 'Nord-Ovest', NULL, 'catchment', 'Lombardia e Nord-Ovest', 'Comunicato 2022: 250 negozi, percorrenza media andata/ritorno sotto i 200 km.', 14),
  ('cedi-imola', NULL, 'Emilia-Romagna', NULL, 'planned', 'Polo A14 (progetto)', 'Accordo di programma 2025. Non operativo.', 15)
;

-- Address and identity corrections from gift-card × press cross-check.
update sites set
  street = 'Via Carlo Alberto',
  lat = 37.36281,
  lon = 13.85954,
  geocode_method = 'geocoded',
  osm_url = 'https://www.openstreetmap.org/?mlat=37.36281&mlon=13.85954#map=17/37.36281/13.85954',
  notes = 'Bacino dichiarato ~35.000 abitanti (Naro, Delia, Serradifalco, Caltanissetta). Indirizzo corretto dal PDF gift card 2025: Via Carlo Alberto (prima solo il comune).'
where code = 'AG-CANICATTI';

update sites set
  street = 'Via Marina di Ponente angolo Via Adua',
  civic = '4',
  notes = 'Ex Uno Discount. PDF gift card 2025: «Marina di Ponente ang. Via Adua n.4». Via Adua 4 geocoda ~300 m a sud: possibile stesso complesso, tenuto distinto in attesa di conferma visiva.'
where code = 'SR-AUGUSTA-MARINA';

update sites set
  notes = coalesce(notes, '') || ' Cross-check 2026: il PDF gift card elenca una sola riga «Marina di Ponente ang. Via Adua n.4». Non classificato come chiuso: assenza dal PDF (sottoinsieme gift-card) non è prova di chiusura; possibile duplicato della scheda Marina.',
  confidence_slug = 'probable'
where code = 'SR-AUGUSTA-ADUA';

update sites set
  notes = coalesce(notes, '') || ' Presente nella riapertura ex Uno 2019. Assente dal PDF gift card 2025, che elenca solo i pdv che accettano gift card: non è prova di chiusura.'
where code = 'CT-BELPASSO-TIMPA';

update sites set
  notes = coalesce(notes, '') || ' Gift card 2025 elenca Viale Europa a Caltagirone; questa scheda è la riapertura 2019 in Via Madonna della Via 176. Possibile trasloco o secondo pdv.'
where code = 'CT-CALTAGIRONE';

insert into sources (slug, title, url, published_on, kind) values
  ('md-logistica', 'MD — Logistica', 'https://www.mdspa.it/logistica/', '2021-11-04', 'corporate'),
  ('md-cortenuova-pdf', 'MD — Il polo logistico di Cortenuova', 'https://www.mdspa.it/wp-content/uploads/1.IL-POLO-LOGISTICO-MD-DI-CORTENUOVA.pdf', '2022-04-28', 'corporate'),
  ('gdo-niscemi-2020', 'GDO News — Apertura Niscemi, 68° pdv siciliano', 'https://www.gdonews.it/2020/06/15/con-lapertura-di-niscemi-riparte-il-piano-di-sviluppo-md/', '2020-06-15', 'press'),
  ('gdo-week-niscemi-2020', 'GDO Week — MD si consolida in Sicilia (Niscemi)', 'https://www.gdoweek.it/md-si-consolida-in-sicilia/', '2020-06-15', 'press'),
  ('palermo-today-partinico', 'PalermoToday — Partinico Kennedy, affiliato Royal', 'https://www.palermotoday.it/economia/partinico-apre-nuovo-store-md-26-novembre-2020.html', '2020-11-25', 'press'),
  ('foodweb-franchising-2020', 'Foodweb — Tre affiliati (Partinico, Dossobuono, Settimo)', 'https://www.foodweb.it/2020/12/md-cresce-anche-in-franchising/', '2020-12-01', 'press'),
  ('myfruit-imola-2025', 'MyFruit — Polo logistico Imola in progetto', 'https://www.myfruit.it/news/md-presto-un-nuovo-polo-logistico-a-imola', '2025-06-11', 'press')
on conflict (slug) do nothing;

insert into snapshot_stats (as_of, reported_count, source_slug, note) values
  ('2020-06-11', 68, 'gdo-niscemi-2020', 'Apertura Niscemi Crescimone: 59 diretti + 9 affiliati. 68° pdv siciliano dichiarato.');

insert into timeline_events (site_id, occurred_on, title, body) values
  (
    (select id from sites where code = 'CL-NISCEMI-CRESCI'),
    '2020-06-11',
    'Apertura Niscemi Crescimone',
    'Punto vendita diretto, 900 mq, 5 corsie, 5 casse, parcheggio sotterraneo ~40 posti, 19 addetti. Dichiarato 68° pdv siciliano (59 diretti + 9 affiliati).'
  ),
  (
    (select id from sites where code = 'PA-PARTINICO-KENNEDY'),
    '2020-11-26',
    'Apertura Partinico Kennedy',
    'Secondo store affiliato Royal S.r.l. in provincia di Palermo. Circa 1.000 mq, 7 assunzioni. Il comunicato parla di un primo store Royal (18 settembre 2020) non localizzato nel PDF gift card.'
  );

insert into org_nodes (parent_id, slug, label, kind, blurb, sort) values
  ((select id from org_nodes where slug = 'company'), 'cedi-gricignano', 'Ce.Di. Gricignano', 'cedi', 'Sede e polo Sud. 55–64.000 mq. Non serve la Sicilia.', 10),
  ((select id from org_nodes where slug = 'company'), 'cedi-bitonto', 'Ce.Di. Bitonto', 'cedi', 'Polo 2013, 34.000 mq. Puglia.', 11),
  ((select id from org_nodes where slug = 'company'), 'cedi-mantova', 'Ce.Di. Mantova', 'cedi', 'Deposito Nord / piattaforma ortofrutta.', 12),
  ((select id from org_nodes where slug = 'company'), 'cedi-macomer', 'Ce.Di. Macomer Tossilo', 'cedi', 'Polo Sardegna, 47.200 mq coperti (2017).', 13),
  ((select id from org_nodes where slug = 'company'), 'cedi-cortenuova', 'Ce.Di. Cortenuova', 'cedi', 'Polo automatizzato 2022, 112.000 mq coperti, 250 pdv Nord-Ovest.', 14)
on conflict (slug) do nothing;

insert into org_site_links (org_id, site_id)
  select (select id from org_nodes where slug = 'cluster-' || s.cluster_slug), s.id
  from sites s
  where s.cluster_slug is not null
    and exists (select 1 from org_nodes n where n.slug = 'cluster-' || s.cluster_slug)
on conflict do nothing;

insert into site_sources (site_id, source_id)
select s.id, src.id
from sites s
cross join sources src
where s.code in (
  'PA-CORLEONE','PA-PARTINICO-KENNEDY','CT-PATERNO-ARTI','ME-CAPO-ORLANDO',
  'CT-PATERNO-PLATANI','EN-TROINA','ME-MILAZZO','PA-MARINEO','ME-BARCELLONA',
  'ME-TORREGROTTA','TP-VALDERICE','AG-RACALMUTO','TP-CUSTONACI','CL-NISCEMI-EUROPA',
  'TP-CASTELLAMMARE','RG-COMISO','CT-CALTAGIRONE-EU','CL-NISCEMI-CRESCI',
  'RG-POZZALLO','TP-MAZARA'
)
and src.slug in ('md-gift-2025', 'md-negozi')
on conflict do nothing;

insert into site_sources (site_id, source_id)
select s.id, src.id
from sites s
cross join sources src
where (s.code = 'CL-NISCEMI-CRESCI' and src.slug in ('gdo-niscemi-2020','gdo-week-niscemi-2020'))
   or (s.code = 'PA-PARTINICO-KENNEDY' and src.slug in ('palermo-today-partinico','foodweb-franchising-2020'))
   or (s.code = 'CEDI-DITTAINO' and src.slug in ('md-logistica','md-cortenuova-pdf','md-chi','md-storia'))
on conflict do nothing;

update research_notes set
  body = 'Questo atlante storicizza i siti documentati da comunicati MD, PDF gift card 2025, stampa di settore e directory. Non è l''elenco esaustivo ufficiale: lo store locator interattivo non pubblica un dump statico. Il PDF gift card è ufficiale ma è un sottoinsieme (solo pdv che accettano gift card): assenza ≠ chiusura. I siti mappati dopo il cross-check 2026 superano i 90 dichiarati a Sant''Agata perché gift card, stampa e directory si sovrappongono in modo diverso e restano in dossier eventuali duplicati (Augusta Adua / Marina; Caltagirone Europa / Madonna della Via). La rete dichiarata oscilla tra 67 (pre-Uno 2019), 68 (Niscemi 2020), 88–90 (comunicati 2025–2026) e 113 (directory terze).',
  as_of = '2026-09-05'
where slug = 'coverage';

update research_notes set
  body = 'Sei depositi nazionali secondo «Chi siamo» e «Logistica»: Gricignano di Aversa (CE), Dittaino (EN), Bitonto (BA), Mantova, Macomer (NU), Cortenuova (BG). Unico in Sicilia: Dittaino, sull''A19, rifornisce tutti i pdv siciliani e parte della Calabria (20.000 mq coperti al 2009; testi successivi 30.000 mq; comunicato Cortenuova: «due di Dittaino» = due capannoni). Gli altri cinque non hanno flussi verso l''isola. Cortenuova 2022 è il polo automatizzato del Nord-Ovest (112.000 mq coperti, 250 pdv). Imola è un progetto 2025, non un settimo deposito attivo. I conteggi «6» vs «7» dipendono da come si contano i due capannoni di Dittaino.',
  as_of = '2026-09-05'
where slug = 'logistics';

insert into research_notes (slug, title, body, as_of, sort) values
  (
    'crosscheck-2026',
    'Cross-check fonti 2026',
    'Confronto PDF gift card 2025 × comunicati GDO × seed precedente. Aggiunti 20 pdv presenti nel PDF e assenti dalla prima mappa (Corleone, Partinico Kennedy, Paternò Arti/Platani, Capo d''Orlando, Troina, Milazzo, Marineo, Barcellona, Torregrotta, Valderice, Racalmuto, Custonaci, Niscemi Europa/Crescimone, Castellammare, Comiso, Caltagirone Europa, Pozzallo, Mazara). Corretto Canicattì da toponimo generico a Via Carlo Alberto. Nessuna chiusura siciliana documentata: Belpasso Timpa Magna manca nel PDF gift card ma risulta tra gli ex Uno 2019 — tenuto aperto. Partinico Via Mulini (primo Royal, settembre 2020) non compare nel PDF: non inserito. Caltagirone e Augusta restano coppie da verificare sul campo.',
    '2026-09-05',
    6
  ),
  (
    'closures',
    'Chiusure',
    'Nessuna chiusura di punto vendita siciliano risulta da comunicati MD, stampa GDO 2019–2026 o dal PDF gift card. L''assenza dal PDF non è una chiusura: il file elenca solo i pdv abilitati alle gift card, e gli affiliati possono esserne esclusi. I siti restano in stato aperto finché non esiste una fonte primaria di cessazione.',
    '2026-09-05',
    7
  )
on conflict (slug) do nothing;
