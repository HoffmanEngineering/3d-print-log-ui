# Next video: filament tracking ("How much is left?")

Brainstorm for the second Apple-style spot, built on the same engine as Spool Labels.
Status: proposal. Nothing here is built yet.

## What the app can honestly show today

Remaining material is never typed in. The API works it out as nominal weight, minus every
print's usage (actual if logged, otherwise the estimate), plus adjustments
(`PrintLogApi/Profiles/FilamentProfile.cs`). So any usage row linked to a spool lowers it,
however that row got there. The demoable moments, in order of how good they look on screen:

| Moment                                                                                                                                                 | Where                                  | Why it films well                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | -------------------------------------------------------------------- |
| **"975 g of 1,000 g left"** progress bar, with Length / Volume / Used / Prints                                                                         | Material page, Remaining card (1.47.0) | One big number, one bar. Also "X g → Y g after saving" live preview. |
| **"Running low"**: "Silk Gold, 470 g left, about 12 days at 38.5 g/day"                                                                                | Analytics → Materials (1.45.0)         | Prediction. The app "sees it coming".                                |
| **Usage logged with no typing**: printlog-bridge (Klipper, per tool, RFID/NFC spool tags), OctoPrint, slicer uploaders, G-code parsers for six slicers | Integrations                           | "It counts itself." Per-slot usage shipped in 1.52.0.                |
| **Adjust from Measured Weight**: Tracked → ± → Measured                                                                                                | Spool weight calculator (1.43.0)       | A real spool on a real scale meets the software.                     |
| **"Do I have blue PLA for a 300 g model?"**                                                                                                            | MCP (Claude / ChatGPT)                 | Conversational and current. One chat bubble is enough.               |
| Top spools, filament by color/brand/type (in real spool colors), cost consumed                                                                         | Analytics → Materials                  | Colorful charts that work as a quick montage.                        |

**Gaps to know before writing a promise.** There is no low-stock alert or notification. There is
no "this print needs more than the spool has" warning on the print form, and no low-stock badge
in the materials list (only Analytics' "Running low"). The monthly recap email mentions filament
used.

## The hook

The fear every maker has: **a 14-hour print, 92% done, and the spool runs dry.** It is
universal, visual, and has a built-in ticking clock. Three ways to cash it in, from boldest to
safest:

### A. "Will it finish?" (recommended, and it needs one small feature)

> **92% done.** · **6 g of filament left.** · _(beat)_ · **Know before you print.**

The payoff is a pre-print check: pick a spool on the print form, and if the slicer estimate
exceeds what's left, say so ("Needs 212 g, spool has 148 g"). It's a few lines on top of data
the form already has (`(g) remaining` is already shown beside the chosen spool), and it makes the
hook literally true. **Feature and video ship together**, which is the "finish a feature, cut
an announcement" loop this project exists for.

### B. "How much is left on this spool?" (works today)

> A spool on a kitchen scale reads **1,187 g**. _Minus the spool? Was it 250 g or 210?_ > **Stop doing spool math.**

The payoff is "975 g of 1,000 g left", always current, plus the calculator for the day you do
weigh one. It's honest today, if a little smaller.

### C. "It counts itself." (works today, the most Apple)

No problem statement, pure delight: a counter rolls **1,000 g → 962 g** as a print finishes,
with the spool's winding visibly shrinking in sync. Then the same thing over and over, faster,
across a week of prints. Apple's "it just works" register. It's strong visually, though the
hook is weaker than A.

**Recommendation:** script A, and build the shortfall check first. If that can't land this
cycle, ship B. Its shot list below shares 80% of A's.

## Shot list for A (30 s, 900 frames)

| #   | ~s      | Shot                                                                                                                                                                                                                                         | Type on screen                             |
| --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | 0–3     | **Macro, nozzle printing** (reuse v2 hotend). Slow push.                                                                                                                                                                                     | "92% done."                                |
| 2   | 3–5     | **Spool on the printer, almost bare**: three wraps left, the core showing, turning.                                                                                                                                                          | "6 g left."                                |
| 3   | 5–6     | Hard cut to black. Silence. Then a single soft tick.                                                                                                                                                                                         | "Not this time."                           |
| 4   | 6–7.5   | **Title card**, icon tile with a gauge glyph.                                                                                                                                                                                                | "Filament Tracking"                        |
| 5   | 7.5–12  | **It counts itself.** 3D spool, winding radius animating down, with a big gradient spec numeral rolling **1,000 g → 962 g** beside it. Small caption: "Logged by Klipper", then "by Cura", then "by OctoPrint" (text, no third-party logos). | "Every gram. Counted."                     |
| 6   | 12–16   | **UI: the Remaining card**, real capture. Push into "962 g of 1,000 g left", the bar easing to its value.                                                                                                                                    | "Always know what's left."                 |
| 7   | 16–20   | **UI: the shortfall check** on the print form. A 212 g job against a 148 g spool turns the row amber with "Needs 64 g more". Cursor swaps to a fuller spool and the row clears.                                                              | "Know before you print."                   |
| 8   | 20–23   | **Analytics, Running low**: "Silk Gold, about 12 days left". A slow pan of the real-color bar charts behind it.                                                                                                                              | "See it coming."                           |
| 9   | 23–26.5 | **Trust, but verify.** 3D: the spool set on a minimal kitchen scale, the display ticking to its weight. Cut to the "Adjust from Measured Weight" dialog, Tracked → Measured.                                                                 | "Weigh it once. Done."                     |
| 10  | 26.5–30 | **End card.**                                                                                                                                                                                                                                | "3D Print Log. Every gram, accounted for." |

The 16:9 cut comes free: type beside the subject, as in Spool Labels.

## What it needs to build

**Reused as-is:** Headline, BrowserWindow, Phone, Cursor, Studio, CameraRig with lens shift,
Printer v2 and the hotend macro, Spool, sound kit, master.sh, stills.mjs.

**New, small:**

- `Spool` prop `windingRadius` (or `fill: 0..1`), so the filament visibly runs down. The core
  and a little end-of-filament tail show at low fill.
- `SpecNumber`: Apple's gradient spec numeral that rolls with tabular figures (the apple-motion
  measurements describe it: vertical gradient, huge, small label).
- `Scale`: a minimal kitchen scale (rounded slab, glass top, segment display), deliberately
  unbranded like the printer.
- An icon tile glyph for the title (a gauge, or a spool with a meter arc).

**New captures** (fixtures go in `video/fixtures`, wired through `routes.json`):

- The material page's Remaining card for the hero spool. The detail endpoint is already stubbed.
- An Analytics → Materials tab fixture (runway and top spools). There is none in
  `cypress/fixtures/demo` yet.
- The spool weight calculator dialog, opened from "Adjust from measured weight".
- The print form with a spool chosen, showing "(g) remaining". With the shortfall check, the
  amber state too.

**Sound:** a soft mechanical counter tick for the number roll, a scale "settle" beep, and the
same hit for the end card.

## Other directions worth a spot later

- **printlog-bridge + RFID/NFC tags**: "Tap the spool. That's it." A 15 s companion to Spool
  Labels for Klipper users.
- **Ask your print log** (MCP): a chat-led spot. "Do I have blue PLA for a 300 g model?" →
  "Yes: Overture Blue, 640 g." Very current, and it plays to a technical audience.
- **Cost of a print**: "That benchy cost $0.31." Filament cost per print and per month.
- **Year in prints**: an achievements and monthly recap spot, for the end of the year.
