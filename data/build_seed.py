#!/usr/bin/env python3
"""Build 0003_seed.sql from geocoded JSON + manual coordinate overrides."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sites = json.loads((ROOT / "sites.geocoded.json").read_text())

# Photon mismatches (wrong city / sea / inland). Street-level fixes.
OVERRIDE = {
    "PA-CAVALLOTTI": (38.11185, 13.36192),
    "PA-MATTEI": (38.17540, 13.34780),
    "PA-TRAMONTANA": (38.03420, 13.44880),
    "CT-ADAMO": (37.49110, 15.07940),
    "ME-FARINA": (38.18890, 15.55120),
    "ME-MANZONI": (38.17340, 15.54380),
    "ME-ITALIA": (38.18560, 15.55210),
    "ME-PISTUNINA": (38.16180, 15.53060),
    "ME-LEONARDI": (38.19250, 15.54820),
    "SR-MELI": (37.07580, 15.27890),
    "SR-SORTINO": (37.15780, 15.02890),
    "TP-FONTANA": (38.01740, 12.53610),
    "AG-UNITA": (37.27420, 13.58410),
    "CEDI-DITTAINO": (37.56080, 14.45090),
}

for s in sites:
    if s["code"] in OVERRIDE:
        lat, lon = OVERRIDE[s["code"]]
        s["lat"], s["lon"] = lat, lon
        s["geocode"] = "corrected"


def esc(v) -> str:
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def num(v) -> str:
    return "NULL" if v is None else str(int(v))


def date(v) -> str:
    return "NULL" if not v else esc(v)


provinces = [
    ("AG", "Agrigento", "084"),
    ("CL", "Caltanissetta", "085"),
    ("CT", "Catania", "087"),
    ("EN", "Enna", "086"),
    ("ME", "Messina", "083"),
    ("PA", "Palermo", "082"),
    ("RG", "Ragusa", "088"),
    ("SR", "Siracusa", "089"),
    ("TP", "Trapani", "081"),
]

munis = sorted({(s["province"], s["municipality"]) for s in sites})

lines: list[str] = []
w = lines.append

w("-- Seed: territorial atlas. Business facts live here, not in UI code.")
w("insert into networks (slug, brand_name, legal_name, parent_name, hq_address, hq_city, founded_year, notes) values (")
w("  'md', 'MD', 'MD S.p.A.', 'Lillo S.p.A.',")
w("  'Zona ASI Capannone N. 18', 'Gricignano di Aversa (CE)', 1994,")
w("  'Secondo operatore italiano del canale discount. Direzione e controllo di Lillo S.p.A. (famiglia Podini). Sede operativa a Gricignano di Aversa.'")
w(") on conflict (slug) do nothing;")
w("")
w("insert into site_kinds (slug, label, sort) values")
w("  ('store', 'Punto vendita', 1),")
w("  ('warehouse', 'Centro distributivo', 0)")
w("on conflict (slug) do nothing;")
w("")
w("insert into ownership_kinds (slug, label) values")
w("  ('direct', 'Diretto'),")
w("  ('affiliated', 'Affiliato'),")
w("  ('unknown', 'Non dichiarato')")
w("on conflict (slug) do nothing;")
w("")
w("insert into confidence_levels (slug, label, sort) values")
w("  ('verified', 'Verificato su fonte primaria', 0),")
w("  ('probable', 'Directory / stampa secondaria', 1),")
w("  ('approximate', 'Posizione approssimata', 2)")
w("on conflict (slug) do nothing;")
w("")
w("insert into clusters (slug, label, blurb) values")
w("  ('hub', 'Hub logistico', 'Polo Ce.Di. sull''A19, baricentro dell''isola.'),")
w("  ('etna', 'Est / Etna', 'Catania, hinterland etneo, parte di Enna e Siracusa nord.'),")
w("  ('ne', 'Nord-est', 'Messina città e provincia tirrenica/ionica.'),")
w("  ('nw', 'Nord-ovest', 'Palermo città e hinterland.'),")
w("  ('west', 'Ovest', 'Trapani e Agrigento.'),")
w("  ('se', 'Sud-est', 'Siracusa e Ragusa.'),")
w("  ('center', 'Centro', 'Enna e Caltanissetta, pdv di pianura.')")
w("on conflict (slug) do nothing;")
w("")
w("insert into provinces (code, name, istat) values")
for i, p in enumerate(provinces):
    comma = "," if i < len(provinces) - 1 else ";"
    w(f"  ({esc(p[0])}, {esc(p[1])}, {esc(p[2])}){comma}")
w("")
w("insert into municipalities (province_code, name) values")
for i, (pr, name) in enumerate(munis):
    comma = "," if i < len(munis) - 1 else ";"
    w(f"  ({esc(pr)}, {esc(name)}){comma}")
w("")

w("insert into sites (network_id, code, kind_slug, ownership_slug, municipality_id, cluster_slug, label, street, civic, postal_code, lat, lon, geocode_method, phone, phones_extra, partner_name, opened_on, area_sqm, parking_spots, staff_count, notes, confidence_slug, osm_url, map_preview_url) values")
rows = []
for s in sites:
    extra = ",".join(s.get("phones_extra") or []) or None
    osm = f"https://www.openstreetmap.org/?mlat={s['lat']}&mlon={s['lon']}#map=17/{s['lat']}/{s['lon']}"
    preview = f"https://www.openstreetmap.org/export/embed.html?bbox={s['lon']-0.01}%2C{s['lat']-0.007}%2C{s['lon']+0.01}%2C{s['lat']+0.007}&layer=mapnik&marker={s['lat']}%2C{s['lon']}"
    rows.append(
        "  ((select id from networks where slug = 'md'), "
        + ", ".join(
            [
                esc(s["code"]),
                esc(s["kind"]),
                esc(s["ownership"]),
                f"(select id from municipalities where province_code = {esc(s['province'])} and name = {esc(s['municipality'])})",
                esc(s.get("cluster")),
                esc(s["label"]),
                esc(s.get("street")),
                esc(s.get("civic")),
                esc(s.get("postal_code")),
                str(s["lat"]),
                str(s["lon"]),
                esc(s.get("geocode")),
                esc(s.get("phone")),
                esc(extra),
                esc(s.get("partner")),
                date(s.get("opened_on")),
                num(s.get("area_sqm")),
                num(s.get("parking_spots")),
                num(s.get("staff_count")),
                esc(s.get("notes")),
                esc(s.get("confidence")),
                esc(osm),
                esc(preview),
            ]
        )
        + ")"
    )
w(",\n".join(rows) + ";")
w("")

w("insert into sources (slug, title, url, published_on, kind) values")
sources = [
    ("md-storia", "MD — La nostra storia", "https://www.mdspa.it/la-nostra-storia/", "2021-11-03", "corporate"),
    ("md-chi", "MD — Chi siamo", "https://www.mdspa.it/chi-siamo/", None, "corporate"),
    ("md-negozi", "MD — Store locator", "https://www.mdspa.it/negozi/", None, "corporate"),
    ("md-gift-2025", "MD — Elenco punti vendita Gift Card 2025", "https://www.mdspa.it/wp-content/uploads/Punti_vendita_Gift_card_2025.pdf", "2025-07-02", "corporate"),
    ("gdo-abate-2019", "HorecaNews — Riapertura ex store Abate in Sicilia", "https://horecanews.it/riaperti-in-tempi-record-da-md-gli-ex-store-abate-in-sicilia", "2019-07-02", "press"),
    ("gdo-palermo-2025", "GDO News — 12° punto vendita a Palermo", "https://www.gdonews.it/2025/11/05/md-apre-a-palermo-e-punta-sui-giovani-inaugurato-il-12-punto-vendita/", "2025-11-05", "press"),
    ("gdo-galati-2026", "GDO News — Apertura Galati", "https://www.gdonews.it/2026/03/25/md-apre-a-galati-e-rafforza-la-presenza-in-sicilia/", "2026-03-25", "press"),
    ("gdoweek-2021", "GDO Week — Rafforzamento presenza regionale", "https://www.gdoweek.it/md-rafforza-la-presenza-in-piu-regioni/", "2021-09-23", "press"),
    ("wiki-md", "Wikipedia — MD (azienda)", "https://it.wikipedia.org/wiki/MD_(azienda)", None, "reference"),
    ("pagine-dittaino", "Pagine Bianche — MD S.p.A. Contrada Dittaino", "https://www.paginebianche.it/assoro/lillo-sicilia.10204503", None, "directory"),
]
for i, s in enumerate(sources):
    comma = "," if i < len(sources) - 1 else ";"
    w(f"  ({esc(s[0])}, {esc(s[1])}, {esc(s[2])}, {date(s[3])}, {esc(s[4])}){comma}")
w("")

# timeline
ev_rows = []
for s in sites:
    for ev in s.get("events") or []:
        ev_rows.append(
            f"  ((select id from sites where code = {esc(s['code'])}), {date(ev.get('occurred_on'))}, {esc(ev['title'])}, {esc(ev.get('body'))})"
        )
w("insert into timeline_events (site_id, occurred_on, title, body) values")
w(",\n".join(ev_rows) + ";")
w("")

w("insert into org_nodes (parent_id, slug, label, kind, blurb, sort) values")
w("  (NULL, 'holding', 'Lillo S.p.A.', 'holding', 'Holding della famiglia Podini. Controlla MD S.p.A. e Dedagroup.', 0);")
w("insert into org_nodes (parent_id, slug, label, kind, blurb, sort) values")
w("  ((select id from org_nodes where slug = 'holding'), 'company', 'MD S.p.A.', 'company', 'Operatore discount. Sede Gricignano di Aversa (CE).', 1),")
w("  ((select id from org_nodes where slug = 'holding'), 'area-sicilia', 'Area Sicilia', 'area', 'Rete mista diretti + affiliati, un solo Ce.Di. regionale.', 2);")
w("insert into org_nodes (parent_id, slug, label, kind, blurb, sort) values")
w("  ((select id from org_nodes where slug = 'company'), 'cedi-dittaino', 'Ce.Di. Dittaino', 'cedi', 'Deposito regionale. Serve Sicilia e parte della Calabria.', 3),")
w("  ((select id from org_nodes where slug = 'area-sicilia'), 'cluster-etna', 'Cluster Est / Etna', 'cluster', NULL, 4),")
w("  ((select id from org_nodes where slug = 'area-sicilia'), 'cluster-ne', 'Cluster Nord-est', 'cluster', NULL, 5),")
w("  ((select id from org_nodes where slug = 'area-sicilia'), 'cluster-nw', 'Cluster Nord-ovest', 'cluster', NULL, 6),")
w("  ((select id from org_nodes where slug = 'area-sicilia'), 'cluster-west', 'Cluster Ovest', 'cluster', NULL, 7),")
w("  ((select id from org_nodes where slug = 'area-sicilia'), 'cluster-se', 'Cluster Sud-est', 'cluster', NULL, 8),")
w("  ((select id from org_nodes where slug = 'area-sicilia'), 'cluster-center', 'Cluster Centro', 'cluster', NULL, 9);")
w("")
w("insert into org_site_links (org_id, site_id)")
w("  select (select id from org_nodes where slug = 'cedi-dittaino'), id from sites where code = 'CEDI-DITTAINO';")
w("")

w("insert into snapshot_stats (as_of, reported_count, source_slug, note) values")
w("  ('2019-04-01', 67, 'gdo-abate-2019', '35 diretti + 32 affiliati prima dell''acquisizione Uno Discount.'),")
w("  ('2019-07-01', 88, 'gdo-abate-2019', 'Dopo 21 ex Abate/Uno (Catania, Enna, Siracusa) più Caltagirone e Nicolosi.'),")
w("  ('2025-11-05', 88, 'gdo-palermo-2025', 'Comunicato apertura Palermo Bernini: 88 pdv sull''isola, 12 in città di cui 4 diretti.'),")
w("  ('2026-03-25', 89, 'gdo-galati-2026', 'Apertura Galati. 9 pdv a Messina città, 5 in provincia.'),")
w("  ('2026-08-01', 90, 'md-chi', 'Comunicato Sant''Agata di Militello: rete regionale oltre i 90 pdv.');")
w("")

w("insert into research_notes (slug, title, body, as_of, sort) values")
w("""  ('coverage', 'Copertura del dossier', 'Questo atlante storicizza i siti documentati da comunicati MD, PDF gift card 2025, stampa di settore e directory. Non è l''elenco esaustivo ufficiale (lo store locator interattivo di MD non pubblica un dump statico). I ~76 siti qui mappati sono quelli con indirizzo o località verificabile. La rete dichiarata oscilla tra 88 e 113 a seconda della fonte e della data.', '2026-09-05', 1),
  ('logistics', 'Logistica isolana', 'Un solo centro distributivo in Sicilia: Dittaino (Assoro/Enna), sull''A19 Palermo–Catania. Fonti societarie 2009–2022 lo danno a 20.000 mq coperti (comunicati 2019: oltre 30.000 mq). Un testo LinkedIn e una guida centrali 2021 parlano di due depositi a Dittaino — due capannoni nello stesso agglomerato, non due province. Serve tutti i pdv siciliani e parte della Calabria. Gli altri Ce.Di. nazionali: Gricignano di Aversa, Bitonto, Mantova, Macomer, Cortenuova.', '2026-09-05', 2),
  ('model', 'Modello di rete', 'Misto: punti vendita diretti (personale MD) e affiliati (imprenditori locali, stesso marchio e volantino, merce dal Ce.Di.). Partner documentati in Sicilia: Gruppo Manna (Galati), Rosso S.r.l. (Sant''Agata di Militello). Su alcuni pdv compare Lillo Sicilia S.r.l. come ragione sociale locale, non come magazzino.', '2026-09-05', 3),
  ('org', 'Organizzazione regionale', 'Non esiste una società-regione autonoma pubblicata. L''isola è un''area della rete nazionale, con hub logistico a Dittaino, area manager / supervisori di zona, e cluster operativi (Est-Etna, Nord-est, Nord-ovest, Ovest, Sud-est, Centro). Direzione a Gricignano. Ruoli ricercati in Sicilia includono logistica spedizioni/ricevimento — conferma di struttura Ce.Di. attiva.', '2026-09-05', 4),
  ('method', 'Metodo', 'Indirizzi da fonti pubbliche. Coordinate: Photon/OSM, corrette a mano quando il geocoder scambiava omonimi. Ogni pin ha un livello di confidenza. I riquadri mappa usano OpenStreetMap (ODbL). Nessun dato personale. Aggiornamento di dossier: settembre 2026.', '2026-09-05', 5);
""")
w("")
w("insert into site_sources (site_id, source_id)")
w("  select s.id, src.id from sites s cross join sources src")
w("  where src.slug in ('md-negozi', 'md-gift-2025');")

sql = "\n".join(lines) + "\n"
out = Path("/workspace/migrations/0003_seed.sql")
out.write_text(sql)
print("seed bytes", len(sql), "sites", len(sites))


if __name__ == "__main__":
    pass
