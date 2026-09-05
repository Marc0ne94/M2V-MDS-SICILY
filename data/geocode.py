#!/usr/bin/env python3
"""Geocode raw sites via Photon and emit SQL seed + JSON atlas."""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = json.loads((ROOT / "sites.raw.json").read_text())
UA = "M2V-MDS-SICILY/1.0 (research atlas; photon geocode)"

FALLBACK = {
    "Assoro": (37.5646, 14.4625),
    "Palermo": (38.1157, 13.3615),
    "Villabate": (38.078, 13.442),
    "Misilmeri": (38.034, 13.449),
    "Piana degli Albanesi": (37.995, 13.284),
    "Termini Imerese": (37.987, 13.697),
    "Catania": (37.5079, 15.0830),
    "Gravina di Catania": (37.561, 15.063),
    "San Gregorio di Catania": (37.565, 15.112),
    "Aci Sant'Antonio": (37.606, 15.126),
    "Santa Maria di Licodia": (37.615, 14.891),
    "Pedara": (37.621, 15.061),
    "Zafferana Etnea": (37.692, 15.104),
    "Belpasso": (37.589, 14.977),
    "Caltagirone": (37.237, 14.513),
    "Mascalucia": (37.575, 15.050),
    "Mirabella Imbaccari": (37.327, 14.446),
    "Bronte": (37.789, 14.834),
    "Paternò": (37.567, 14.902),
    "Adrano": (37.661, 14.835),
    "Randazzo": (37.877, 14.950),
    "Giarre": (37.727, 15.184),
    "Calatabiano": (37.827, 15.227),
    "Nicolosi": (37.616, 15.024),
    "Piedimonte Etneo": (37.807, 15.179),
    "Messina": (38.1938, 15.5540),
    "Sant'Agata di Militello": (38.069, 14.633),
    "Sant'Alessio Siculo": (37.925, 15.348),
    "Enna": (37.567, 14.279),
    "Leonforte": (37.644, 14.400),
    "Piazza Armerina": (37.385, 14.367),
    "Nicosia": (37.748, 14.400),
    "Agira": (37.655, 14.521),
    "Caltanissetta": (37.490, 14.062),
    "Agrigento": (37.269, 13.585),
    "Favara": (37.318, 13.663),
    "Licata": (37.102, 13.937),
    "Canicattì": (37.358, 13.851),
    "Palma di Montechiaro": (37.193, 13.766),
    "Realmonte": (37.309, 13.466),
    "Siracusa": (37.075, 15.287),
    "Augusta": (37.237, 15.221),
    "Sortino": (37.158, 15.029),
    "Ragusa": (36.780, 14.547),
    "Trapani": (38.017, 12.536),
}


def photon(q: str) -> tuple[float, float] | None:
    url = "https://photon.komoot.io/api/?" + urllib.parse.urlencode(
        {"q": q, "limit": 1, "lat": 37.6, "lon": 14.0}
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read().decode())
    feats = data.get("features") or []
    if not feats:
        return None
    props = feats[0].get("properties") or {}
    # reject if not Sicily
    state = (props.get("state") or "") + (props.get("county") or "")
    coords = feats[0]["geometry"]["coordinates"]  # lon, lat
    lon, lat = float(coords[0]), float(coords[1])
    if not (36.4 < lat < 38.9 and 12.0 < lon < 15.8):
        return None
    if "Sicil" not in state and "Catania" not in state and "Palermo" not in state:
        # still accept if bbox is Sicily
        pass
    return lat, lon


def geocode(site: dict) -> tuple[float, float, str]:
    queries = []
    street = site.get("street") or ""
    mun = site["municipality"]
    civic = site.get("civic") or ""
    if street and civic and not civic.lower().startswith("angolo"):
        queries.append(f"{street} {civic}, {mun}, Sicilia, Italia")
    if street:
        queries.append(f"{street}, {mun}, Sicilia, Italia")
    queries.append(f"{mun}, Sicilia, Italia")
    for q in queries:
        try:
            hit = photon(q)
        except Exception as e:
            print("ERR", q, e)
            hit = None
        time.sleep(0.35)
        if hit:
            how = "geocoded" if q.startswith(street[:8] if street else "xxx") else "municipality"
            if street and street.split(",")[0][:12] in q:
                how = "geocoded"
            else:
                how = "municipality" if mun in q and street and street not in q else "geocoded"
            return hit[0], hit[1], how
    lat, lon = FALLBACK[mun]
    return lat, lon, "fallback"


def esc(s: str | None) -> str:
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def sql_num(v) -> str:
    if v is None:
        return "NULL"
    return str(v)


def main() -> None:
    out = []
    for i, site in enumerate(RAW, 1):
        lat, lon, how = geocode(site)
        rec = {**site, "lat": round(lat, 6), "lon": round(lon, 6), "geocode": how}
        out.append(rec)
        print(f"{i:02d}/{len(RAW)} {site['code']:22} {how:12} {lat:.5f},{lon:.5f}")

    (ROOT / "sites.geocoded.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print("wrote", len(out), "sites")


if __name__ == "__main__":
    main()
