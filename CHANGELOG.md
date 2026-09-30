# Changelog

## 1.0.0 — 2026-09-30

The first release, and the version on the live site.

### Data
- `ingest.py` builds the database from the Argo GDAC: 83 floats, 13,026 dives and 1,749,899
  measurements from the northern Indian Ocean, March 2014 to September 2026.
- Quality control per parameter: the adjusted value where its flag passes, the raw value where
  its flag passes, nothing otherwise. Coverage is measured per float and stored.
- Profiles averaged onto standard pressure levels. Measurements load as chunked multi-row
  statements, about six minutes for the full set on Postgres.
- An 8-float SQLite database is committed, so a clone runs with no setup.

### Asking questions
- The language model (Groq) chooses one of four declared operations with typed arguments;
  every query comes from a template with the values bound.
- An unsupported region raises instead of dropping the spatial filter.
- Answers render as Markdown with the chart behind them, in the app's palette. Mixed units
  are reported as figures rather than drawn on one axis.
- Rate limited to 20 questions per five minutes per address.

### Interface
- A landing page drawing every float's drift path, coloured by what it measures. The field is
  drawn once and only the wake around the pointer animates: 130 fps at rest and 75 while
  hovering, measured on the live site at 1440×900, up from 7 and 6.
- One screen for the map, the float list, a page per float and the question panel.
- The dive timeline is a single slider control.
- Errors read as sentences; a sleeping API shows a waking message and is retried.

### Deployment and checks
- Vercel for the interface, Render for the API, Neon for Postgres.
- CI runs the linter, the build, an API smoke test on the demo database, the parameter check
  and the QC assertions.
- No known vulnerabilities in the dependencies (`npm audit`, `pip-audit`). MIT licence.

### Since the hackathon version (September 2025)
The natural-language query layer dates from an internal hackathon. Everything else was
rebuilt, and several faults in the original were fixed along the way: questions about the
Pacific were answered from Indian Ocean data, the standard deviation branch never ran, and
depth charts drew a flat line.
