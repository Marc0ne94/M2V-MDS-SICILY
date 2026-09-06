# M2V MDS Sicily

Atlante territoriale della rete discount MD in Sicilia: una **mappa**, non una tesina.

I fatti di business (insegna, sedi, magazzini, organigramma, cronologia, fonti, Ce.Di. nazionali, flussi, provenienza) vivono nel database (`migrations/0002`–`0006`). L’interfaccia non hardcoda nomi, indirizzi o numeri: li legge dal backend.

## Cosa contiene

- Punti vendita siciliani geocodati (Photon/OSM) più il **Ce.Di. Dittaino**
- **Sei depositi nazionali** da «Chi siamo» / «Logistica»: Gricignano, Dittaino, Bitonto, Mantova, Macomer, Cortenuova — solo Dittaino è un pin sull’isola
- Flussi logistici (Dittaino → Sicilia + quota Calabria) e **raggi 50 / 100 / 150 km** dal Ce.Di.
- Dossier storicizzato: 67 → 68 → 88 → 89 → 90, con coperture gift card / verificati / campi vuoti
- Provenienza per scheda: `sites.gift_card`, `site_sources.role`, `site_flags`, `site_relations`, `eras`
- Tab FONTI: clicca una fonte e la mappa mostra solo i pin agganciati
- Pin pieni = in PDF gift card 2025; anelli = ricostruiti da stampa/directory
- Viste aeree Esri/Maxar e estratti cartografici OpenStreetMap (ODbL)
- Collegamento condivisibile `#s=CODICE` e export GeoJSON dei pin visibili

Questo **non è un dump ufficiale** della rete. È una ricostruzione da pagine societarie, PDF gift card 2025, stampa GDO e directory. Siamo certi delle fonti collegate a ogni pin, **non** della completezza. Assenza dal PDF gift card ≠ chiusura. I campi vuoti restano vuoti.

## Schema (normalizzato)

`networks` → `sites` → `municipalities` / `provinces` / `clusters`  
`site_kinds`, `ownership_kinds`, `confidence_levels`  
`sources` + `site_sources` (con `role`)  
`timeline_events`, `org_nodes`, `org_site_links`  
`research_notes`, `snapshot_stats`  
`logistics_hubs`, `logistics_flows` — `sites.served_by_hub`  
`site_flags`, `site_relations`, `eras` — `sites.gift_card`

Nessun nome commerciale è scritto nei componenti UI.

## Dati grezzi

- `data/sites.raw.json` — anagrafica raccolta (prima ondata)
- `data/sites.geocoded.json` — dopo Photon + correzioni manuali
- `data/geocode.py` / `data/build_seed.py` — pipeline verso `0003_seed.sql`
- integrazioni in `migrations/0004_crosscheck.sql`, `0005_provenance.sql`, `0006_certainty.sql`

Repo: https://github.com/Marc0ne94/M2V-MDS-SICILY
