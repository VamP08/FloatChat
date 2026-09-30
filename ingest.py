"""Build the FloatChat database from Argo GDAC synthetic profile files.

Selects BGC floats from a bounding box using the GDAC's synthetic-profile index,
downloads one Sprof + meta file per float, applies Argo quality control, bins the
profiles onto standard pressure levels, and writes the result to Postgres or SQLite.

    python ingest.py --demo                          # 8 floats -> data/argo_demo.sqlite
    python ingest.py --dsn postgresql+psycopg://...  # full set -> Postgres
    python ingest.py --self-check                    # run the assertions, touch nothing
"""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import os
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import xarray as xr
from sqlalchemy import create_engine, insert, text
from sqlalchemy.orm import Session

from backend.database import normalise_dsn
from backend.models import ArgoFloat, Base, Measurement, ParameterCoverage, Profile

GDAC = "https://data-argo.ifremer.fr"
SYNTHETIC_INDEX = f"{GDAC}/argo_synthetic-profile_index.txt.gz"
INDEX_COLUMNS = (
    "file,date,latitude,longitude,ocean,profiler_type,institution,"
    "parameters,parameter_data_mode,date_update"
).split(",")

# Argo reference date for the JULD variable.
JULD_EPOCH = date(1950, 1, 1)

# Flags 1 (good) and 2 (probably good) are the values a scientific user would accept.
# 3 is "probably bad", 4 is "bad", 8 is interpolated. See the Argo User's Manual, table 2.
GOOD_QC = ("1", "2")

# Maps our column names to the Argo parameter names inside the NetCDF files.
PARAMETERS = {
    "temp": "TEMP",
    "psal": "PSAL",
    "doxy": "DOXY",
    "chla": "CHLA",
    "nitrate": "NITRATE",
    "bbp700": "BBP700",
    "ph": "PH_IN_SITU_TOTAL",
}
BGC_COLUMNS = ("doxy", "chla", "nitrate", "bbp700", "ph")

# Rows per INSERT statement. Nine columns each, so a thousand rows is 9,000 bound
# parameters -- inside Postgres's 65,535 limit and SQLite's 32,766.
MEASUREMENT_CHUNK = 1000

REGIONS = {
    # The Arabian Sea and Bay of Bengal, which is what the map opens onto.
    "north-indian": {"lat": (-10.0, 26.0), "lon": (40.0, 100.0)},
    "indian": {"lat": (-40.0, 26.0), "lon": (20.0, 120.0)},
}

# Standard pressure levels: fine through the thermocline, coarser in the deep ocean
# where the profiles themselves carry little structure. 156 bins to 2000 dbar.
STANDARD_EDGES = np.concatenate(
    [
        np.arange(0, 200, 5),
        np.arange(200, 1000, 10),
        np.arange(1000, 2001, 25),
    ]
).astype(np.float64)


# --------------------------------------------------------------------------------------
# NetCDF decoding
# --------------------------------------------------------------------------------------


def _text(value) -> str:
    """Argo char variables arrive as bytes, str or NaN depending on the file."""
    if isinstance(value, bytes):
        return value.decode("utf-8", "replace").strip()
    if value is None or isinstance(value, float):
        return ""
    return str(value).strip()


def _scalar_text(dataset: xr.Dataset, name: str) -> str:
    if name not in dataset:
        return ""
    values = dataset[name].values
    if values.dtype.kind == "S":
        return values.tobytes().decode("utf-8", "replace").strip()
    return " ".join(_text(v) for v in np.atleast_1d(values).ravel()).strip()


def _qc_flags(dataset: xr.Dataset, name: str) -> np.ndarray | None:
    """Decode a 2-D QC variable into an array of single-character strings."""
    if name not in dataset:
        return None
    raw = dataset[name].values
    return np.array([[_text(flag) for flag in row] for row in raw])


def qc_filtered(dataset: xr.Dataset, param: str) -> np.ndarray | None:
    """Return the accepted values for one parameter, NaN where QC rejects them.

    Argo publishes each parameter twice: the raw measurement and a delayed-mode
    ``_ADJUSTED`` version that has been through scientific calibration. The adjusted
    value is preferred where it exists and passes QC; otherwise the raw value is used.
    Anything not flagged 1 or 2 is dropped.

    Returns None when the file carries no data for this parameter at all.
    """
    if param not in dataset:
        return None

    raw = dataset[param].values.astype(np.float64)
    raw_qc = _qc_flags(dataset, f"{param}_QC")
    accepted = np.full(raw.shape, np.nan)

    if raw_qc is not None:
        keep = np.isfinite(raw) & np.isin(raw_qc, GOOD_QC)
        accepted[keep] = raw[keep]

    adjusted_name = f"{param}_ADJUSTED"
    if adjusted_name in dataset:
        adjusted = dataset[adjusted_name].values.astype(np.float64)
        adjusted_qc = _qc_flags(dataset, f"{adjusted_name}_QC")
        if adjusted_qc is not None:
            keep = np.isfinite(adjusted) & np.isin(adjusted_qc, GOOD_QC)
            accepted[keep] = adjusted[keep]

    return accepted if np.isfinite(accepted).any() else None


def bin_to_standard_levels(
    pressure: np.ndarray, columns: dict[str, np.ndarray]
) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    """Average one profile onto the standard pressure grid.

    Raw Argo profiles carry 500-1500 levels, which is far more vertical resolution than
    a chart can show and more rows than the database budget allows. Binning is the same
    normalisation step Argo's own gridded products apply.
    """
    valid = np.isfinite(pressure)
    if not valid.any():
        return np.empty(0), {}

    slot = np.digitize(pressure[valid], STANDARD_EDGES) - 1
    slot = np.clip(slot, 0, len(STANDARD_EDGES) - 1)
    occupied = np.unique(slot)

    binned_pressure = np.empty(len(occupied))
    binned_columns: dict[str, np.ndarray] = {
        name: np.full(len(occupied), np.nan) for name in columns
    }

    for index, bin_id in enumerate(occupied):
        members = slot == bin_id
        binned_pressure[index] = pressure[valid][members].mean()
        for name, values in columns.items():
            sample = values[valid][members]
            sample = sample[np.isfinite(sample)]
            if sample.size:
                binned_columns[name][index] = sample.mean()

    return binned_pressure, binned_columns


# --------------------------------------------------------------------------------------
# GDAC access
# --------------------------------------------------------------------------------------


def download(url: str, destination: Path, attempts: int = 3) -> Path:
    """Fetch a GDAC file, keeping a local copy so re-runs cost nothing."""
    if destination.exists() and destination.stat().st_size > 0:
        return destination

    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(destination.suffix + ".part")

    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(url, timeout=300) as response:
                partial.write_bytes(response.read())
            partial.replace(destination)
            return destination
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            partial.unlink(missing_ok=True)
            if attempt == attempts:
                raise RuntimeError(f"could not download {url}: {error}") from error
            print(f"    retry {attempt}/{attempts - 1} for {url.rsplit('/', 1)[-1]}")

    raise AssertionError("unreachable")


def select_floats(
    cache: Path, region: str, min_cycles: int, active_since: str, limit: int | None
) -> list[tuple[str, str, int]]:
    """Pick candidate floats from the synthetic-profile index.

    The index says which sensors a float carries. It does not say whether their
    readings survive quality control -- that is only knowable from the data files, so
    the caller checks coverage per float after download.
    """
    bounds = REGIONS[region]
    index_path = download(SYNTHETIC_INDEX, cache / "argo_synthetic-profile_index.txt.gz")

    seen: dict[str, dict] = defaultdict(
        lambda: {"dac": None, "cycles": 0, "last": "", "params": set()}
    )
    with gzip.open(index_path, "rt", errors="replace") as handle:
        for line in handle:  # skip the comment header
            if line.startswith("file,"):
                break
        for row in csv.DictReader(handle, fieldnames=INDEX_COLUMNS):
            try:
                latitude = float(row["latitude"])
                longitude = float(row["longitude"])
            except (TypeError, ValueError):
                continue
            if not (bounds["lat"][0] <= latitude <= bounds["lat"][1]):
                continue
            if not (bounds["lon"][0] <= longitude <= bounds["lon"][1]):
                continue

            path = (row["file"] or "").split("/")
            if len(path) < 2:
                continue
            dac, wmo = path[0], path[1]

            entry = seen[wmo]
            entry["dac"] = dac
            entry["cycles"] += 1
            entry["last"] = max(entry["last"], (row["date"] or "")[:8])
            entry["params"].update((row["parameters"] or "").split())

    cutoff = active_since.replace("-", "")
    candidates = [
        (wmo, entry["dac"], entry["cycles"])
        for wmo, entry in seen.items()
        if entry["cycles"] >= min_cycles and entry["last"] >= cutoff
    ]
    # Richest sensor payload first, then longest record.
    candidates.sort(key=lambda item: (-len(seen[item[0]]["params"]), -item[2]))
    return candidates[:limit] if limit else candidates


# --------------------------------------------------------------------------------------
# Per-float extraction
# --------------------------------------------------------------------------------------


def read_float(wmo: str, dac: str, cache: Path, resolution: str) -> dict | None:
    """Download and decode one float into rows ready for the database."""
    base = f"{GDAC}/dac/{dac}/{wmo}"
    meta_path = download(f"{base}/{wmo}_meta.nc", cache / dac / wmo / f"{wmo}_meta.nc")
    sprof_path = download(f"{base}/{wmo}_Sprof.nc", cache / dac / wmo / f"{wmo}_Sprof.nc")

    meta = xr.open_dataset(meta_path)
    sprof = xr.open_dataset(sprof_path, decode_times=False)

    sensors = [
        _text(sensor) for sensor in np.atleast_1d(meta["SENSOR"].values).ravel()
    ] if "SENSOR" in meta else []

    float_row = {
        "id": wmo,
        "project_name": _scalar_text(meta, "PROJECT_NAME") or "Unknown",
        "platform_type": _scalar_text(meta, "PLATFORM_TYPE"),
        "wmo_inst_type": _scalar_text(meta, "WMO_INST_TYPE"),
        "pi_name": _scalar_text(meta, "PI_NAME"),
        "data_centre": _scalar_text(meta, "DATA_CENTRE"),
        "sensors_list": ",".join(sensor for sensor in sensors if sensor),
    }

    pressure_all = qc_filtered(sprof, "PRES")
    if pressure_all is None:
        return None

    juld = sprof["JULD"].values
    latitude = sprof["LATITUDE"].values
    longitude = sprof["LONGITUDE"].values
    cycles = sprof["CYCLE_NUMBER"].values
    parameter_values = {
        column: qc_filtered(sprof, name) for column, name in PARAMETERS.items()
    }

    profiles: list[dict] = []
    measurements: list[list[dict]] = []
    coverage: dict[str, int] = defaultdict(int)

    for index in range(sprof.sizes["N_PROF"]):
        if not (np.isfinite(juld[index]) and np.isfinite(latitude[index])):
            continue
        if not np.isfinite(longitude[index]) or not np.isfinite(cycles[index]):
            continue

        observed = JULD_EPOCH + timedelta(days=float(juld[index]))
        pressure = pressure_all[index]
        columns = {
            column: values[index]
            for column, values in parameter_values.items()
            if values is not None
        }

        if resolution == "standard":
            pressure, columns = bin_to_standard_levels(pressure, columns)
        else:
            keep = np.isfinite(pressure)
            pressure = pressure[keep]
            columns = {name: values[keep] for name, values in columns.items()}

        if pressure.size == 0:
            continue

        rows = []
        for level in range(pressure.size):
            row = {"pressure": round(float(pressure[level]), 2)}
            has_value = False
            for column, values in columns.items():
                value = values[level]
                if np.isfinite(value):
                    row[column] = round(float(value), 4)
                    coverage[column] += 1
                    has_value = True
                else:
                    row[column] = None
            if has_value:
                rows.append(row)

        if not rows:
            continue

        profiles.append(
            {
                "cycle_number": int(cycles[index]),
                "profile_date": observed,
                "year_month": observed.strftime("%Y-%m"),
                "latitude": round(float(latitude[index]), 4),
                "longitude": round(float(longitude[index]), 4),
            }
        )
        measurements.append(rows)

    if not profiles:
        return None

    return {
        "float": float_row,
        "profiles": profiles,
        "measurements": measurements,
        "coverage": dict(coverage),
    }


# --------------------------------------------------------------------------------------
# Database write
# --------------------------------------------------------------------------------------


def write_float(session: Session, extracted: dict) -> int:
    """Insert one float and its profiles. Returns the measurement row count.

    Everything for a float goes in two statements rather than two per profile. Against
    a local file the difference is invisible; against a hosted database it is thirteen
    thousand network round trips versus a hundred and sixty.
    """
    float_id = extracted["float"]["id"]
    session.execute(insert(ArgoFloat), extracted["float"])

    profile_ids = (
        session.execute(
            # sort_by_parameter_order is what makes the returned ids line up with the
            # rows as supplied, which is the only reason this zip is safe.
            insert(Profile).returning(Profile.id, sort_by_parameter_order=True),
            [{**profile, "float_id": float_id} for profile in extracted["profiles"]],
        )
        .scalars()
        .all()
    )

    measurement_rows = [
        {**row, "profile_id": profile_id}
        for profile_id, rows in zip(profile_ids, extracted["measurements"])
        for row in rows
    ]
    # Chunked multi-row VALUES rather than executemany. Passing a list of dicts makes
    # SQLAlchemy send one parameterised statement per row, which against a hosted
    # database is a network round trip per measurement: measured at 854 rows/s, about
    # 34 minutes for the full load. One statement carrying a thousand rows measured
    # 4,497 rows/s, about 6.5 minutes, and reads the same on SQLite and Postgres.
    # (COPY reaches 9,413 rows/s but needs a psycopg-only path and a SQLite fallback,
    # which is not worth two code paths for a load that runs by hand.)
    for start in range(0, len(measurement_rows), MEASUREMENT_CHUNK):
        session.execute(
            insert(Measurement).values(measurement_rows[start:start + MEASUREMENT_CHUNK])
        )
    written = len(measurement_rows)

    dates = [profile["profile_date"] for profile in extracted["profiles"]]
    session.execute(
        insert(ParameterCoverage),
        [
            {
                "float_id": float_id,
                "parameter": parameter,
                "n_values": count,
                "first_date": min(dates),
                "last_date": max(dates),
            }
            for parameter, count in extracted["coverage"].items()
        ],
    )
    return written


# --------------------------------------------------------------------------------------
# Landing-page dataset
# --------------------------------------------------------------------------------------

TRACKS_PATH = Path("frontend") / "src" / "data" / "tracks.json"
BGC_PARAMETERS = ("doxy", "chla", "nitrate", "bbp700", "ph")


def emit_tracks(engine, destination: Path = TRACKS_PATH) -> dict:
    """Write the drift paths and totals the landing page draws.

    This runs as the last step of every build so the marketing surface cannot claim
    more than the database it sits in front of. The landing page reads it statically,
    which is also what lets that page render while the API is still waking up.
    """
    with Session(engine) as session:
        rows = session.execute(
            text(
                "SELECT p.float_id, f.project_name, p.latitude, p.longitude, p.profile_date "
                "FROM profiles p JOIN floats f ON f.id = p.float_id "
                "ORDER BY p.float_id, p.cycle_number"
            )
        ).all()

        dominant: dict[str, str] = {}
        for float_id, parameter in session.execute(
            text(
                # The parameter name breaks ties. Two parameters can hold exactly the
                # same number of readings for a float -- 2902272 has 8,760 of both
                # chlorophyll and oxygen -- and without a second key the winner is
                # whatever order the engine happens to return, so SQLite and Postgres
                # coloured those floats differently on the map.
                "SELECT float_id, parameter FROM parameter_coverage "
                "ORDER BY n_values DESC, parameter ASC"
            )
        ):
            if parameter in BGC_PARAMETERS and float_id not in dominant:
                dominant[float_id] = parameter

        totals = session.execute(
            text("SELECT COUNT(*) FROM profiles")
        ).scalar_one(), session.execute(
            text("SELECT COUNT(*) FROM measurements")
        ).scalar_one()

        per_parameter = {
            parameter: int(total)
            for parameter, total in session.execute(
                text(
                    "SELECT parameter, SUM(n_values) FROM parameter_coverage "
                    "GROUP BY parameter"
                )
            )
        }

    grouped: dict[str, dict] = {}
    for float_id, project, latitude, longitude, observed in rows:
        entry = grouped.setdefault(float_id, {"project": project, "path": []})
        entry["path"].append((round(longitude, 3), round(latitude, 3), str(observed)))

    tracks = []
    for float_id, entry in grouped.items():
        path = entry["path"]
        # Enough points that a drift path reads as a continuous wake rather than a
        # thread. Eighty was too few: the field looked like fine scratches instead of
        # light. This roughly doubles the file, which gzip absorbs, and the landing
        # chunk it sits in no longer carries Leaflet, Recharts or the Markdown renderer.
        step = max(1, len(path) // 170)
        kept = path[::step]
        if kept[-1] != path[-1]:
            kept.append(path[-1])
        tracks.append(
            {
                "id": float_id,
                "project": entry["project"],
                "first": path[0][2],
                "last": path[-1][2],
                "cycles": len(path),
                "bgc": dominant.get(float_id),
                "pts": [[point[0], point[1]] for point in kept],
            }
        )

    tracks.sort(key=lambda track: -track["cycles"])
    payload = {
        "stats": {
            "floats": len(tracks),
            "profiles": int(totals[0]),
            "measurements": int(totals[1]),
            "first": min(track["first"] for track in tracks),
            "last": max(track["last"] for track in tracks),
            "parameters": per_parameter,
        },
        "tracks": tracks,
    }

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    return payload["stats"]


def _confirm_replace(engine, dsn: str, assume_yes: bool) -> None:
    """Refuse to wipe a non-local database without being told to.

    Every build drops and recreates the schema. Against a local file that is free; against
    the hosted database it is the whole dataset, and the flag that gets it back is a
    forty-minute download. So a remote target has to be named on the command line.
    """
    if engine.dialect.name == "sqlite" or assume_yes:
        return

    existing = 0
    try:
        with engine.connect() as connection:
            existing = connection.execute(
                text("SELECT COUNT(*) FROM measurements")
            ).scalar_one()
    except Exception:
        return  # No schema yet, so there is nothing to lose.

    if existing:
        # Show the database, never the credentials in front of it.
        target = dsn.rsplit("@", 1)[-1] if "@" in dsn else dsn
        raise SystemExit(
            f"Refusing to continue: {target} already holds {existing:,} measurements, and "
            f"this rebuild drops every table first.\n"
            f"Re-run with --replace if that is what you want."
        )


def build(args: argparse.Namespace) -> None:
    cache = Path(args.cache_dir)
    engine = create_engine(args.dsn)
    _confirm_replace(engine, args.dsn, args.replace)

    print(f"reading the synthetic-profile index for {args.region}")
    candidates = select_floats(
        cache, args.region, args.min_cycles, args.active_since, args.max_floats
    )
    print(f"  {len(candidates)} candidate floats")

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    totals = {"floats": 0, "profiles": 0, "measurements": 0, "skipped": 0}
    bgc_empty: list[str] = []

    with Session(engine) as session:
        for position, (wmo, dac, _) in enumerate(candidates, start=1):
            print(f"[{position}/{len(candidates)}] {wmo} ({dac})", flush=True)
            try:
                extracted = read_float(wmo, dac, cache, args.resolution)
            except (RuntimeError, OSError, KeyError) as error:
                print(f"    skipped: {error}")
                totals["skipped"] += 1
                continue

            if extracted is None:
                print("    skipped: nothing survived quality control")
                totals["skipped"] += 1
                continue

            rows = write_float(session, extracted)
            session.commit()

            coverage = extracted["coverage"]
            usable_bgc = [name for name in BGC_COLUMNS if coverage.get(name)]
            if not usable_bgc:
                bgc_empty.append(wmo)

            totals["floats"] += 1
            totals["profiles"] += len(extracted["profiles"])
            totals["measurements"] += rows
            print(
                f"    {len(extracted['profiles'])} profiles, {rows} measurements, "
                f"bgc: {','.join(usable_bgc) or 'none'}"
            )

    print(
        f"\ndone: {totals['floats']} floats, {totals['profiles']} profiles, "
        f"{totals['measurements']} measurements ({totals['skipped']} skipped)"
    )
    if bgc_empty:
        print(
            f"note: {len(bgc_empty)} floats carry BGC sensors whose readings do not pass "
            f"QC and were stored with those columns empty: {', '.join(bgc_empty)}"
        )

    if getattr(args, "demo", False):
        # The demo database is a local convenience; the landing page ships the deployed
        # dataset. Rewriting tracks.json here would quietly cut the published page down
        # to eight floats the next time it was committed.
        print(
            f"skipped {TRACKS_PATH}: this is the demo build. Regenerate it against the "
            f"deployed database with --tracks-only."
        )
        return

    stats = emit_tracks(engine)
    print(
        f"wrote {TRACKS_PATH} for the landing page: {stats['floats']} floats, "
        f"{stats['measurements']} measurements, {stats['first']} to {stats['last']}"
    )


# --------------------------------------------------------------------------------------
# Self-check
# --------------------------------------------------------------------------------------


def self_check() -> None:
    """Assert the two pieces of logic that would silently corrupt the database."""

    def dataset(**variables) -> xr.Dataset:
        return xr.Dataset(
            {
                name: (("N_PROF", "N_LEVELS"), np.array(values, dtype=object))
                if isinstance(values[0][0], (str, bytes))
                else (("N_PROF", "N_LEVELS"), np.array(values, dtype=np.float64))
                for name, values in variables.items()
            }
        )

    # The adjusted value wins over the raw value when both pass QC.
    both = dataset(
        TEMP=[[10.0, 11.0]],
        TEMP_QC=[["1", "1"]],
        TEMP_ADJUSTED=[[20.0, 21.0]],
        TEMP_ADJUSTED_QC=[["1", "1"]],
    )
    assert qc_filtered(both, "TEMP").tolist() == [[20.0, 21.0]]

    # A rejected adjusted value falls back to an acceptable raw value.
    fallback = dataset(
        TEMP=[[10.0, 11.0]],
        TEMP_QC=[["1", "1"]],
        TEMP_ADJUSTED=[[20.0, 21.0]],
        TEMP_ADJUSTED_QC=[["4", "3"]],
    )
    assert qc_filtered(fallback, "TEMP").tolist() == [[10.0, 11.0]]

    # Flags 3, 4 and 8 are dropped even when the number itself is present.
    rejected = dataset(TEMP=[[10.0, 11.0, 12.0]], TEMP_QC=[["3", "4", "8"]])
    assert not np.isfinite(qc_filtered(rejected, "TEMP") or np.array([np.nan])).any()

    # A parameter present in name only yields nothing rather than a column of zeros.
    empty = dataset(DOXY=[[np.nan, np.nan]], DOXY_QC=[["1", "1"]])
    assert qc_filtered(empty, "DOXY") is None

    # Binning averages within a bin and never invents a level.
    pressure = np.array([1.0, 2.0, 3.0, 7.0, 1200.0])
    binned_pressure, binned = bin_to_standard_levels(
        pressure, {"temp": np.array([10.0, 12.0, 14.0, 20.0, np.nan])}
    )
    assert binned_pressure.size == 3, binned_pressure
    assert binned["temp"][0] == 12.0  # (10 + 12 + 14) / 3, all inside the 0-5 dbar bin
    assert binned["temp"][1] == 20.0
    assert not np.isfinite(binned["temp"][2])  # no temperature at 1200 dbar

    # Binning tolerates a profile with no usable pressure at all.
    assert bin_to_standard_levels(np.array([np.nan]), {"temp": np.array([1.0])})[0].size == 0

    print("self-check passed")


# --------------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dsn",
        default=None,
        help="SQLAlchemy database URL (default: $DATABASE_URL, else local SQLite)",
    )
    parser.add_argument("--region", choices=sorted(REGIONS), default="north-indian")
    parser.add_argument("--min-cycles", type=int, default=40)
    parser.add_argument("--active-since", default="2020-01-01")
    parser.add_argument("--max-floats", type=int, default=None)
    parser.add_argument(
        "--resolution",
        choices=("standard", "raw"),
        default="standard",
        help="standard bins onto reference pressure levels; raw keeps every level",
    )
    parser.add_argument("--cache-dir", default=".argo-cache")
    parser.add_argument(
        "--demo",
        action="store_true",
        help="build the small committed database: 8 floats, standard levels",
    )
    parser.add_argument("--self-check", action="store_true", help="run assertions and exit")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="allow rebuilding a non-SQLite database that already holds measurements",
    )
    parser.add_argument(
        "--tracks-only",
        action="store_true",
        help="rewrite the landing page dataset from an existing database and exit",
    )
    args = parser.parse_args(argv)

    if args.self_check:
        self_check()
        return 0

    if args.tracks_only:
        stats = emit_tracks(
            create_engine(
                normalise_dsn(
                    args.dsn or os.getenv("DATABASE_URL", "sqlite:///argo_data.sqlite")
                )
            )
        )
        print(json.dumps(stats, indent=2))
        return 0

    explicit_dsn = args.dsn is not None

    if args.demo:
        args.max_floats = 8
        args.resolution = "standard"
        if not explicit_dsn:
            # Never inherit $DATABASE_URL here. Once that points at the production
            # database, a command named --demo would drop every table in it and reload
            # eight floats. The demo build writes a local file unless --dsn says
            # otherwise in so many words.
            Path("data").mkdir(exist_ok=True)
            args.dsn = "sqlite:///data/argo_demo.sqlite"

    if args.dsn is None:
        args.dsn = os.getenv("DATABASE_URL", "sqlite:///argo_data.sqlite")

    # A bare postgres URL would otherwise load through psycopg 2, one row per
    # statement. See normalise_dsn.
    args.dsn = normalise_dsn(args.dsn)

    build(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
