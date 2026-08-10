# Planora web — design direction

Written before any UI code, per the build brief. Everything below is a decision I build to,
not a suggestion.

---

## 1. The feeling: a well-kept notebook

Not a dashboard. A dashboard is a surface you *monitor*; this is a surface you *keep*. Planora
is opened every day for years, it never resets, and the data in it is mundane on purpose — "ate
rice and chicken", "hit chest", "called an old friend". The product's whole argument is that
accumulation does not require surveillance.

So the interface should read like a record you maintain, not a service performing intelligence
at you. Concretely that means:

- **Warm paper ground, ink text.** Not white, not the blue-grey of every analytics tool.
- **Quiet by default, loud only for action.** One accent, reserved for things you can do and for
  identity. Never decoration.
- **Density that matches the task.** A dashboard scanned in five seconds and a task list worked
  for an hour are different problems and get different spacing.
- **The working is the product.** `patterns.ts` computes associations with arithmetic a user
  could check by hand, and deliberately refuses to claim cause. The current UI renders that as a
  row with a percentage chip, which throws away the best thing in the codebase. This direction
  gives evidence its own typographic register — see §3.

**The mark stays.** The three-segment day arc is already the favicon, the iOS/Android app icons
(`com.planora.app`, which I cannot modify) and the showcase film. Replacing it would fracture the
brand across surfaces I am not allowed to touch. It is also simply a good mark: a day cycle,
segmented, incomplete — which is what the product is about.

## 2. Palette, with measured contrast

Every ratio below is computed from WCAG relative luminance, not estimated. AA for normal text is
4.5:1; AA for large text and UI boundaries is 3.0:1.

### Light

| Token | Hex | Role |
|---|---|---|
| `ground` | `#F7F4EF` | page |
| `surface` | `#FFFFFF` | cards, grouped lists |
| `sunken` | `#EFEAE2` | inset tracks, segmented control bed |
| `ink` | `#141C2B` | primary text |
| `muted` | `#57616F` | secondary text |
| `line` | `rgba(20,28,43,0.12)` | borders |
| `hairline` | `rgba(20,28,43,0.10)` | row separators |

| Pair | Ratio | Verdict |
|---|---|---|
| ink on ground | **15.55:1** | AAA |
| ink on surface | **17.06:1** | AAA |
| muted on ground | **5.72:1** | AA |
| muted on surface | **6.28:1** | AA |

### Dark

| Token | Hex | Role |
|---|---|---|
| `ground` | `#0F1520` | page |
| `surface` | `#161E2B` | cards |
| `sunken` | `#0A0F18` | inset tracks |
| `ink` | `#F2F5F8` | primary text |
| `muted` | `#9AA6B6` | secondary text |

| Pair | Ratio | Verdict |
|---|---|---|
| ink on ground | **16.71:1** | AAA |
| ink on surface | **15.29:1** | AAA |
| muted on ground | **7.41:1** | AAA |
| muted on surface | **6.78:1** | AA |

### Accent

The existing `#EA580C` is kept as an identity and fill colour but **cannot be used for text or as
a button fill**, because:

- `#EA580C` on white = **3.56:1** — fails AA for normal text.
- white on `#EA580C` = **3.56:1** — fails AA, so the current primary button does not meet AA either.

This is a real accessibility defect in the current UI (small `text-sunset-600` links like "All
tasks", "View", "Details" at 14px, and every primary button). The new scale fixes it:

| Token | Hex | Use | Ratio |
|---|---|---|---|
| `accent` | `#EA580C` | large graphics, mark, active indicators (non-text) | 3.56:1 on white — AA for graphics only |
| `accent-strong` | `#BF4A06` | primary button fill | white on it = **5.00:1** AA |
| `accent-text` | `#B24406` | accent text on light | **5.64:1** on white, **5.14:1** on ground |
| `accent-on-dark` | `#FB923C` | accent text/fill on dark | **7.39:1** on dark surface |

### Semantic

| Token | Light | Dark use | Ratio (light, on surface) |
|---|---|---|---|
| `positive` | `#116B45` | `#4ADE80` | **6.54:1** AA |
| `critical` | `#B3261E` | `#FCA5A5` | **6.54:1** AA |
| `caution` | `#8A5A00` | `#FBBF24` | AA |

`positive` and `critical` are tuned to the same luminance so completion and risk carry equal
visual weight rather than one shouting over the other.

## 3. Type

Two families, both **OS-provided**, so there is zero network cost and no font CDN — which the
privacy constraint forbids anyway.

- **Text:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, Roboto, sans-serif`
- **Evidence:** `ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono", Consolas, monospace`

The monospace family is not decoration. It is the **evidence register**: raw evidence objects,
Pearson r, paired-day counts, weekly averages, quotas, and any figure the user might want to
check. Claims are set in the text family; the arithmetic behind a claim is set in the evidence
family. That typographic split is how the interface honours what `patterns.ts` already does
carefully in prose.

Root 17px. Tabular numerals (`font-variant-numeric: tabular-nums`) on every metric so digits
don't jitter when they update.

| Step | Size | Line | Tracking | Use |
|---|---|---|---|---|
| `display` | 2.75rem | 1.08 | -0.022em | public hero only |
| `title-1` | 2rem | 1.15 | -0.02em | page titles |
| `title-2` | 1.4375rem | 1.25 | -0.018em | section headings |
| `title-3` | 1.1875rem | 1.35 | -0.012em | card headings |
| `body` | 1rem | 1.55 | -0.006em | prose, rows |
| `callout` | 0.9375rem | 1.45 | -0.004em | dense rows, controls |
| `footnote` | 0.8125rem | 1.4 | 0 | metadata |
| `micro` | 0.75rem | 1.3 | +0.06em | uppercase section labels, evidence keys |

## 4. Spacing and radius

**Spacing** — 4px base, restricted to: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`. Nothing
in between; if a gap needs 14px the layout is wrong.

**Radius** — four steps, each with one job:

| Token | Value | Job |
|---|---|---|
| `sm` | 0.5rem | chips, evidence keys, inline tags |
| `md` | 0.75rem | buttons, inputs, controls |
| `lg` | 1.125rem | cards, grouped list containers |
| `xl` | 1.5rem | sheets, dialogs, command palette |

## 5. Elevation — shadow means "temporary"

The paper concept makes shadow meaningful rather than ambient. Four levels:

| Level | Treatment | What it means |
|---|---|---|
| 0 — ground | page, no border, no shadow | the desk |
| 1 — surface | 1px hairline border, **no shadow** | a page resting on the desk |
| 2 — raised | border warms to accent + 3px translate, pointer only | you are about to act on this |
| 3 — floating | border + real shadow | **temporarily above your work and will go away** |

Level 3 is the *only* place a shadow appears: menus, dialogs, the command palette, the companion
sheet, toasts. Cards never have shadows. This is the main visual departure from the current
build, where shadows are applied decoratively to resting content.

## 6. Motion — four permitted jobs

Motion must do one of these or it does not ship:

1. **Feedback** — press (scale 0.97, 120ms), toggle travel, optimistic tick.
2. **Continuity** — route change, sheet open, and expanding evidence *grows from the row it
   belongs to* rather than appearing elsewhere.
3. **Hierarchy** — list entry staggered 24ms, capped at 6 rows so long lists never feel slow.
4. **Perceived speed** — skeletons that match the final layout box-for-box, so arriving content
   never reflows.

Durations: 120ms press · 180ms state · 260ms route and sheet.
Easing: `cubic-bezier(0.32, 0.72, 0, 1)` for entrances; `cubic-bezier(0.34, 1.4, 0.64, 1)` for
press feedback only.

**Banned:** looping ambient animation, decorative parallax, scroll-triggered motion for its own
sake, floating shapes, and spinners anywhere a skeleton is possible.

`prefers-reduced-motion: reduce` removes every transform and collapses durations to 0.01ms;
where a state change must still register it falls back to opacity alone.

## 7. Two architectural findings that shape the build

**(a) The session cookie is invisible to the Next server.** It is set `HttpOnly; SameSite=Lax;
Path=/api` by the API on port 4000. Next.js middleware and Server Components on port 3000
therefore **cannot** read it — wrong path, and a different origin in the default configuration.

Consequence: the `/app/*` auth gate must be a client-side boundary that probes `GET /auth/me`.
It must render a layout-matching skeleton while probing, never a flash of the sign-in page for an
already-signed-in user. Public routes stay pure Server Components because they need no session.

**(b) "No request leaves the origin" needs precise wording.** The web app on `:3000` calls the
API on `:4000` — cross-origin by design, and the reason `credentials: "include"` plus the
`WEB_ORIGIN` check exist. The constraint I am actually holding is stricter and more useful:
**no request leaves the machine.** Every asset self-hosted, no CDN, no font service, no
analytics, no error reporting, no embeds. I verify by auditing that every request goes to
`localhost:3000` or the configured API origin, and nothing else.

## 8. What this direction explicitly refuses

Generic SaaS chrome. Gradients as texture. Glassmorphism. A giant hero with nothing under it.
Decorative floating shapes. Ambient looping animation. Fake data to make a screen look busy —
which, in a product whose thesis is that it never fabricates a record, would be the worst
possible thing to put on its marketing site.
