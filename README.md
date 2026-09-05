# M2V MDS Sicily

Atlante territoriale della rete discount MD in Sicilia: una **mappa**, non una tesina.

I fatti di business (insegna, sedi, magazzini, organigramma, cronologia, fonti) vivono nel database (`migrations/0002_schema.sql` + `migrations/0003_seed.sql`). L’interfaccia non hardcoda nomi, indirizzi o numeri: li legge dal backend.

## Cosa contiene

- **76 siti mappati** (75 punti vendita + 1 centro distributivo) con coordinate OSM/Photon
- **Ce.Di. Dittaino** (Assoro/EN) come unico magazzino regionale
- Dossier: coperture dichiarate nel tempo (67 → 90), modello diretto/affiliato, metodo
- Fonti citate per ogni scheda (comunicati, PDF gift card, stampa GDO)
- Viste aeree Esri/Maxar e estratti cartografici OpenStreetMap (ODbL)

La rete dichiarata dalle fonti oscilla tra ~88 e 113 punti vendita a seconda della data. Questo dossier storicizza i siti con indirizzo verificabile.

## Schema (normalizzato)

`networks` → `sites` → `municipalities` / `provinces` / `clusters`  
`site_kinds`, `ownership_kinds`, `confidence_levels`  
`sources` + `site_sources`  
`timeline_events`, `org_nodes`, `org_site_links`  
`research_notes`, `snapshot_stats`

Nessun nome commerciale è scritto nei componenti UI.

## Dati grezzi

- `data/sites.raw.json` — anagrafica raccolta
- `data/sites.geocoded.json` — dopo Photon + correzioni manuali
- `data/geocode.py` / `data/build_seed.py` — pipeline verso `0003_seed.sql`

Repo: https://github.com/Marc0ne94/M2V-MDS-SICILY
