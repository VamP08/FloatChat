import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DriftField from "../components/DriftField";
import trackData from "../data/tracks.json";
import { describe, PARAMETER_KEYS } from "../parameters";

const { stats } = trackData;
const count = (value) => value.toLocaleString("en-US");
const year = (iso) => iso.slice(0, 4);

// Floats whose biogeochemical sensors produced nothing that passed quality control.
const UNLIT = trackData.tracks.filter((track) => track.bgc == null);

const ENTRANCES = [
  { href: "/map", title: "The map", body: "Every float where it last surfaced. Follow one to see its path and read its dives." },
  { href: "/list", title: "The floats", body: "All 83, with the project that deployed them and the sensors they carry." },
  { href: "/chat", title: "Ask", body: "A question in plain English, answered with the chart behind the number." },
];

export default function Landing() {
  const [question, setQuestion] = useState("");
  const navigate = useNavigate();

  const ask = (event) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed) navigate(`/chat?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--sea-abyss)] text-[var(--ink)]">
      <section className="relative min-h-screen overflow-hidden">
        <DriftField className="absolute inset-0 h-full w-full" />

        {/* Deepens the left edge only as much as type needs, so the light keeps its
            reach across the rest of the frame. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(96deg, rgba(3,7,12,0.95) 0%, rgba(3,7,12,0.86) 30%, rgba(3,7,12,0.28) 62%, rgba(3,7,12,0) 88%)",
          }}
        />

        <div className="pointer-events-none relative flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-16">
          <header className="pointer-events-auto flex items-center justify-between">
            <span className="display text-xl tracking-tight">FloatChat</span>
            <nav className="flex gap-7 text-sm text-[var(--ink-dim)]">
              <a className="transition-colors hover:text-[var(--ink)]" href="/map">Map</a>
              <a className="transition-colors hover:text-[var(--ink)]" href="/list">Floats</a>
              <a className="transition-colors hover:text-[var(--ink)]" href="/chat">Ask</a>
            </nav>
          </header>

          <div className="pointer-events-auto flex flex-1 items-center">
            <div className="max-w-[36rem] py-12">
              <h1 className="display text-[clamp(2.25rem,4.6vw,4rem)]">
                Eighty-three robots have been measuring this ocean since {year(stats.first)}.
              </h1>
              <p className="mt-7 text-lg leading-relaxed text-[var(--ink-dim)]">
                They sink two kilometres, drift for ten days, then rise and measure the
                water on the way up. Every trail out there is one of them, coloured by
                what it measures best.
              </p>

              <form onSubmit={ask} className="mt-9">
                <label htmlFor="ask" className="micro block">
                  Ask about {count(stats.measurements)} readings
                </label>
                <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                  <input
                    id="ask"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="How salty is the Arabian Sea?"
                    className="w-full rounded-sm border border-[var(--sea-edge)] bg-[rgba(4,10,16,0.82)]
                               px-4 py-3 text-base text-[var(--ink)] outline-none transition-colors
                               focus:border-[var(--action)]"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-sm px-7 py-3 text-base font-semibold
                               text-[#02120d] transition-opacity hover:opacity-90
                               disabled:cursor-not-allowed disabled:opacity-35"
                    style={{ backgroundColor: "var(--action)" }}
                    disabled={!question.trim()}
                  >
                    Ask
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* The legend for the picture behind it, which is also the record's contents. */}
          <div className="pointer-events-auto border-t border-[var(--sea-edge)] pt-4">
            <ul className="flex flex-wrap gap-x-7 gap-y-2.5">
              {PARAMETER_KEYS.map((key) => (
                <li key={key} className="flex items-baseline gap-2">
                  <span
                    className="emit inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: `var(--em-${key})`, color: `var(--em-${key})` }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-[var(--ink)]">{describe(key).name}</span>
                  <span className="tnum text-sm text-[var(--ink-faint)]">
                    {count(stats.parameters[key] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--sea-edge)] px-6 py-28 sm:px-10 lg:px-16">
        <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="display text-[clamp(1.75rem,3.2vw,2.6rem)]">
              The dark stretches are the point.
            </h2>
            <div className="measure mt-6 space-y-5 text-lg leading-relaxed text-[var(--ink-dim)]">
              <p>
                Argo publishes every reading twice, once raw and once after calibration,
                each carrying its own quality flag &mdash; and the two can disagree inside
                a single dive. The pipeline resolves that measurement by measurement and
                keeps only what a scientist would accept.
              </p>
              <p>
                Whatever fails is not smoothed over or filled in. It goes dark, on this
                page and in the database behind it.
              </p>
            </div>

            <div className="mt-10 border-t border-[var(--sea-edge)] pt-5">
              <p className="micro">
                {UNLIT.length} floats carry sensors that never passed quality control
              </p>
              <ul className="mt-4 space-y-3">
                {UNLIT.map((track) => (
                  <li
                    key={track.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1
                               border-b border-[var(--sea-edge)] pb-3 last:border-0"
                  >
                    <span className="tnum text-base text-[var(--ink)]">{track.id}</span>
                    <span className="text-sm text-[var(--ink-dim)]">{track.project}</span>
                    <span className="tnum text-sm text-[var(--ink-faint)]">
                      {count(track.cycles)} dives · {year(track.first)}&ndash;{year(track.last)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-[var(--ink-faint)]">
                Their temperature and salinity are good, so they stay on the map. Only the
                biogeochemistry is missing, and the interface says so rather than offering
                an empty chart.
              </p>
            </div>
          </div>

          <figure className="self-start border-l border-[var(--sea-edge)] pl-8 lg:mt-4">
            <blockquote className="text-xl leading-relaxed text-[var(--ink)]">
              The northern Arabian Sea really does light up. Winter blooms of{" "}
              <i>Noctiluca scintillans</i> turn it green at night, and research ties them
              to oxygen-poor water reaching the surface.
            </blockquote>
            <figcaption className="mt-6 space-y-4 text-base leading-relaxed text-[var(--ink-dim)]">
              <p>
                Oxygen is one of the seven measurements in here, with{" "}
                <span className="tnum text-[var(--ink)]">{count(stats.parameters.doxy)}</span>{" "}
                readings across {stats.floats} floats.
              </p>
              <p>
                So the light on this page is not a theme borrowed from the sea. It is the
                thing that sea does, drawn with the measurements that explain it.
              </p>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-t border-[var(--sea-edge)] px-6 py-28 sm:px-10 lg:px-16">
        <h2 className="display text-[clamp(1.75rem,3.2vw,2.6rem)]">
          Where the answers come from.
        </h2>
        <div className="mt-10 grid gap-x-16 gap-y-10 lg:grid-cols-2">
          <div className="measure space-y-5 text-lg leading-relaxed text-[var(--ink-dim)]">
            <p>
              Your question goes to a language model, but the model never writes the
              query. It picks one of four operations and fills in typed arguments &mdash;
              a region, a date range, a depth band &mdash; and the query itself is built
              from a fixed template with those values bound in.
            </p>
            <p>
              Ask about the Pacific and it will tell you there is no data, rather than
              quietly answering with the wrong ocean. That failure mode is the reason the
              query layer works this way.
            </p>
          </div>
          <dl className="text-base">
            <div className="flex flex-col gap-1 border-b border-[var(--sea-edge)] py-4 sm:flex-row sm:gap-8">
              <dt className="micro w-40 shrink-0 sm:pt-1">Covers</dt>
              <dd className="text-[var(--ink)]">
                The Arabian Sea, the Bay of Bengal, the Laccadive Sea and the equatorial
                Indian Ocean. 10°S to 26°N, 40°E to 100°E.
              </dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-[var(--sea-edge)] py-4 sm:flex-row sm:gap-8">
              <dt className="micro w-40 shrink-0 sm:pt-1">Does not cover</dt>
              <dd className="text-[var(--ink)]">
                Every other ocean. No Pacific, Atlantic, Mediterranean or Southern Ocean
                data is in here at all.
              </dd>
            </div>
            <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
              <dt className="micro w-40 shrink-0 sm:pt-1">Record</dt>
              <dd className="tnum text-[var(--ink)]">
                {count(stats.profiles)} dives by {stats.floats} floats,{" "}
                {year(stats.first)}&ndash;{year(stats.last)}.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="border-t border-[var(--sea-edge)] px-6 py-24 sm:px-10 lg:px-16">
        <ul>
          {ENTRANCES.map((entry) => (
            <li key={entry.href}>
              <a
                href={entry.href}
                className="group flex flex-col gap-3 border-b border-[var(--sea-edge)] py-8
                           transition-colors first:border-t hover:bg-[var(--sea-deep)]
                           sm:flex-row sm:items-baseline sm:gap-12"
              >
                <span className="display w-52 shrink-0 text-[clamp(1.5rem,2.6vw,2.1rem)] text-[var(--ink)] transition-colors group-hover:text-[var(--action)]">
                  {entry.title}
                </span>
                <span className="measure text-lg leading-relaxed text-[var(--ink-dim)]">
                  {entry.body}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="px-6 py-14 text-sm leading-relaxed text-[var(--ink-faint)] sm:px-10 lg:px-16">
        <p className="measure">
          Data collected by the international Argo programme and made freely available by
          the Coriolis Global Data Assembly Centre. Argo is part of the Global Ocean
          Observing System. Profiles here are averaged onto standard pressure levels, so a
          value at a depth is the mean of the readings within that level.
        </p>
      </footer>
    </div>
  );
}
