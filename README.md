# M2V MDS Sicily

Atlante territoriale della rete discount MD in Sicilia: una **mappa**, non una tesina.

I fatti di business (insegna, sedi, magazzini, organigramma, cronologia, fonti, Ce.Di. nazionali, flussi) vivono nel database (`migrations/0002_schema.sql` + `0003_seed.sql` + `0004_crosscheck.sql`). L’interfaccia non hardcoda nomi, indirizzi o numeri: li legge dal backend.

## Cosa contiene

- Punti vendita siciliani geocodati (Photon/OSM) più il **Ce.Di. Dittaino**
- **Sei depositi nazionali** da «Chi siamo» / «Logistica»: Gricignano, Dittaino, Bitonto, Mantova, Macomer, Cortenuova — solo Dittaino è un pin sull’isola
- Flussi logistici (Dittaino → Sicilia + quota Calabria; gli altri poli restano schede nazionali)
- Dossier storicizzato: 67 → 68 → 88 → 89 → 90, con nota sul PDF gift card (ufficiale ma sottoinsieme)
- Cross-check 2026: aperture da gift card, correzioni di indirizzo, nessuna chiusura documentata
- Viste aeree Esri/Maxar e estratti cartografici OpenStreetMap (ODbL)

Questo **non è un dump ufficiale** della rete. È una ricostruzione da pagine societarie, PDF gift card 2025, stampa GDO e directory, con un livello di confidenza su ogni pin. Assenza dal PDF gift card ≠ chiusura.

## Schema (normalizzato)

`networks` → `sites` → `municipalities` / `provinces` / `clusters`  
`site_kinds`, `ownership_kinds`, `confidence_levels`  
`sources` + `site_sources`  
`timeline_events`, `org_nodes`, `org_site_links`  
`research_notes`, `snapshot_stats`  
`logistics_hubs`, `logistics_flows` — `sites.served_by_hub`

Nessun nome commerciale è scritto nei componenti UI.

## Dati grezzi

- `data/sites.raw.json` — anagrafica raccolta (prima ondata)
- `data/sites.geocoded.json` — dopo Photon + correzioni manuali
- `data/geocode.py` / `data/build_seed.py` — pipeline verso `0003_seed.sql`
- integrazioni successive in `migrations/0004_crosscheck.sql`

Repo: https://github.com/Marc0ne94/M2V-MDS-SICILY
