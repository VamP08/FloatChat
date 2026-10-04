# Changelog

## 1.0.2 — 2026-10-04

- The chat's rate limit counts by the address Cloudflare reports. It used the first
  X-Forwarded-For entry, which Render passes through from the caller, so a client could reset
  its own limit by changing that header. A ceiling across all callers now sits behind it.
- Chat requests are bounded: a question up to 2,000 characters, a history up to 20 messages.
  The panel sends only the question, which is all the API reads. `check_limits.py` checks the
  limit and the bounds in CI.
- New logo: favicon set, app icons, web manifest, the mark in the header, the link-preview
  card and the README.
- The site links to its source, and the float page's map credits Esri as the main map does.
- Removed a chart branch no tool could reach, `backend/run.py` and an unused PostCSS plugin.

## 1.0.1 — 2026-09-30

Fixes found while recording the walkthrough.

- Body text loads Switzer again; Fontshare now serves only the first family of a combined
  request, so every line of body text had fallen back to the system font.
- Answers describe a region with its own bounds. The model had only the dataset's overall box
  and restated it as the Arabian Sea's.
- The aggregate query refuses a statistic it does not compute before building any SQL, and
  treats a null one as an average. A crafted operation could rewrite the statement, and a null
  one crashed it.
- Profile and time-series queries accept every measurement synonym; multi-word ones such as
  "dissolved oxygen" made the statement invalid.
- `check_queries.py` covers all of the above, and runs in CI.

## 1.0.0 — 2026-09-30

The first release.

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
