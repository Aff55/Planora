"use client";

import clsx from "clsx";

/**
 * The evidence register.
 *
 * `patterns.ts` attaches an `evidence` object to every detected pattern —
 * Pearson r, paired-day counts, weekly averages, per-weekday opportunity
 * counts — specifically so a conclusion can be checked by hand. The previous
 * interface rendered a pattern as a title and a percentage and discarded that
 * object entirely, which quietly turned an auditable observation into an
 * assertion the user had to take on trust.
 *
 * This renders the object as-is, in the monospace family, with no rounding,
 * reordering, or editorialising. Claims are set in the text family; the
 * arithmetic behind a claim is set here. Nothing is invented and nothing is
 * hidden.
 */

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** camelCase / snake_case key to a readable label, without losing the key. */
function humanKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="font-evidence text-micro uppercase text-evidence-key">{label}</span>
      <span className="tabular min-w-0 break-words text-right font-evidence text-footnote text-ink">{value}</span>
    </div>
  );
}

/**
 * A list of `{ weeksAgo, average }`-style records renders as a small table
 * rather than a wall of JSON, because that is the shape the trend detector
 * actually produces and it is far easier to check.
 */
function EvidenceTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="whitespace-nowrap border-b border-hairline px-2 py-1.5 font-evidence text-micro uppercase text-evidence-key"
              >
                {humanKey(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={column}
                  className="tabular whitespace-nowrap border-b border-hairline px-2 py-1.5 font-evidence text-footnote text-ink"
                >
                  {formatValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EvidenceBlock({ evidence, className }: { evidence: Record<string, unknown>; className?: string }) {
  const entries = Object.entries(evidence);
  if (entries.length === 0) return null;

  // `note` is the engine's own caveat — e.g. "Association only. This is not
  // evidence of cause." It is pulled out and shown last, in prose, because it
  // is the one part of the object that is a sentence rather than a figure.
  const note = typeof evidence.note === "string" ? evidence.note : null;
  const figures = entries.filter(([key]) => key !== "note");

  return (
    <div className={clsx("rounded-md border border-hairline bg-evidence-bg p-4", className)}>
      <p className="mb-2 font-evidence text-micro uppercase text-evidence-key">Evidence</p>
      <div className="divide-hairline">
        {figures.map(([key, value]) => {
          if (Array.isArray(value) && value.length > 0 && value.every(isPlainObject)) {
            return (
              <div key={key} className="py-2">
                <p className="mb-1.5 font-evidence text-micro uppercase text-evidence-key">{humanKey(key)}</p>
                <EvidenceTable rows={value} />
              </div>
            );
          }

          if (isPlainObject(value)) {
            return (
              <div key={key} className="py-2">
                <p className="mb-1 font-evidence text-micro uppercase text-evidence-key">{humanKey(key)}</p>
                <div className="pl-3">
                  {Object.entries(value).map(([childKey, childValue]) => (
                    <EvidenceRow key={childKey} label={humanKey(childKey)} value={formatValue(childValue)} />
                  ))}
                </div>
              </div>
            );
          }

          return <EvidenceRow key={key} label={humanKey(key)} value={formatValue(value)} />;
        })}
      </div>
      {note && <p className="mt-3 border-t border-hairline pt-3 text-footnote italic text-muted">{note}</p>}
    </div>
  );
}
