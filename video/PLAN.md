# Apple-style announcement videos for 3D Print Log

This folder holds a [Remotion](https://www.remotion.dev) project that renders short, Apple-style
feature ads for 3D Print Log. The first is **"Spool Labels"**, a 30-second vertical (9:16) spot
for the QR spool label flow. The same scenes also render as a horizontal 16:9 cut.

It is a standalone npm package. The Angular app does not build, lint or test it, and it has
its own `node_modules`.

## 1. What makes a video read as "Apple"

Two kinds of source fed into this. The first is the craft notes everyone repeats about Apple
launch films. The second, more useful, is
[apple-motion](https://github.com/IskakovDamir/apple-motion) (MIT): a Claude skill whose author ran
six Apple recap videos (1,107 s, 33,187 frames) through OCR, spring fitting, optical-flow and
loudness measurements. Its numbers are used directly in `src/theme.ts`.

| Trait                                    | What Apple does (measured where a number is given)                                                                                                               | How this project does it                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **One idea per shot**                    | Median shot is 1.9 s (56 frames). Most shots run 1 to 7 beats, plus a few long holds on product or UI.                                                           | 10 shots in 30 s, 2 to 4.5 s each.                                                                                |
| **The cut is the transition**            | 92% hard cuts, 5% whips, about 1% each for dissolve and scale-through.                                                                                           | Hard cuts throughout. One scale-through (UI → 3D label) and one whip into the end card.                           |
| **Type is punctuation**                  | 1 to 4 words, one line (84%), Semibold, tight tracking (−0.015 em). Flat white on black or near-black (#1d1d1f) on white/#f5f5f7. No outlines, shadows or boxes. | `Headline` component: Inter 600 (SF Pro is not licensable for this), at most two short lines.                     |
| **Fast, calm entries**                   | Type is visibly in within ~8 frames. Spring damping 15.3, stiffness 115: about 2% overshoot, no visible bounce. Most type simply cuts on with its shot.          | `SPRING_TEXT`. Every headline cuts on or fades/rises in about 8 frames.                                           |
| **Something always moves**               | 62% of shots carry a camera move. Push/pull runs about 4.5% scale per second, pans about 2.6% of the frame per second.                                           | Every UI shot has a slow push (`PUSH_PER_FRAME`). Every 3D shot has a slow orbit or dolly.                        |
| **Product as hero, on a seamless stage** | Pure black or #f5f5f7 sweep. Soft key light, hard rim light drawing the silhouette. Color lives in the product.                                                  | Black stage for the 3D shots, #f5f5f7 for the UI. The orange spool is the only saturated color.                   |
| **Real UI, framed**                      | UI shots are real screens in a device, pushed into the element being talked about, often zooming into a control and cutting on the zoom.                         | Real screenshots of the app (see §3) in a browser window or phone, with a cursor/tap and a push into the control. |
| **Sparse sound**                         | Whooshes on whips, soft clicks on taps, one hit on the logo. About −17 LUFS, −2 dBTP peak.                                                                       | Synthesized SFX only (`scripts/synth-sfx.mjs`), mastered to −17 LUFS. Add a licensed music bed later if wanted.   |
| **End on the name**                      | Logo or wordmark on white or black, held about 3 s.                                                                                                              | Brand mark, "3D Print Log", one-line tagline and URL, held 3 s.                                                   |

The Reddit thread you linked couldn't be fetched from this environment, because Reddit blocks it.
The workflow it describes (Claude writing Remotion plus three.js code, rendered to video) is the
same one used here, and the same one as in Sergei Chyrkov's "Claude Opus Motion with Remotion +
Three.js" write-up.

## 2. Spool Labels: the spot

**Hook.** Every maker has stood in front of a shelf of near-identical spools and guessed. The ad
opens on that guess, with no product, logo or explanation first. Apple's measured openers start on
something that moves, not on a title, so the first frame is already a slow push across unlabeled
spools.

> **"Which one is the PETG?"** → **"Never guess again."**

**The promise.** Four short verbs, one per step, so the whole flow reads as effortless:
_Add it. Print it. Stick it. Scan it._

### Shot list (30 fps, 900 frames)

| #   | Frames  | Shot                                                                                                                                                                                                                                                                              | On screen                             | Sound            |
| --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------- |
| 1   | 0–74    | **Hook.** Black stage. Five unlabeled spools in a row in low light, very similar colors. Slow lateral dolly.                                                                                                                                                                      | "Which one is / the PETG?" (cut on)   | low room tone    |
| 2   | 75–134  | **Reveal.** The other spools fall into darkness. The orange spool rises forward into the key light and turns to show a clean, empty flange.                                                                                                                                       | "Never guess / again."                | soft whoosh up   |
| 3   | 135–179 | **Title card.** #f5f5f7. QR glyph in an indigo app-icon tile.                                                                                                                                                                                                                     | "Spool Labels" + small "3D Print Log" | tick             |
| 4   | 180–299 | **Add it.** Floating browser window, real Materials list. Cursor glides to _Add New Material_ and clicks. Cut to the filled form ("Sunset Orange", PETG) with a slow push.                                                                                                        | "Add it."                             | click            |
| 5   | 300–419 | **Print it.** Real material page. Cursor clicks _Print QR Label_. The real QR dialog springs up, then a push into the label preview that scale-throughs into…                                                                                                                     | "Print it."                           | click, whoosh    |
| 6   | 420–484 | **The label.** 3D: the label card (the app's real QR code) floats in, turns to camera, light glint sweeps across.                                                                                                                                                                 | —                                     | paper flick      |
| 7   | 485–564 | **Stick it.** 3D close-up: the label drops onto the spool flange and presses flat.                                                                                                                                                                                                | "Stick it on."                        | soft press       |
| 8   | 565–644 | **Load it.** 3D: generic CoreXY printer (deliberately unbranded), mid-print. The spool slides onto the side holder, rolls and settles label-up.                                                                                                                                   | "Load it up."                         | slide, clunk     |
| 9   | 645–764 | **Scan it.** Phone, real printer page: a tap on _Load_ beside the empty T2 slot, then the real Select Filament scanner. The viewfinder shows the live 3D label and the brackets lock. Back on the printer page, T2 turns from _Empty_ to _Sunset Orange_ as the camera pushes in. | "Scan it." → "Done."                  | tap, chime, tick |
| 10  | 765–824 | **Printing.** Macro on the hotend: fan spinning, brass nozzle with a hot tip laying the next orange layer on a ribbed vase. _(v2)_                                                                                                                                                | "Right filament. / Every time."       | printer whir     |
| 11  | 825–899 | **End card.** White. Brand mark, **3D Print Log**, "Every spool, accounted for.", 3dprintlog.com.                                                                                                                                                                                 | —                                     | final hit        |

**v2** (this version) added the printer detail: a toolhead with a spinning fan, ducts,
heatsink, a wired heater block and a brass nozzle; a linear rail, belts, motors and lead screws;
a print in progress; a PTFE tube carrying the filament. It also added shot 10, the hotend macro,
and trimmed shots 6 to 9 and 11 to stay at 30 s.

**16:9.** The landscape cut uses the same edit. Headlines move to the left (`Headline x`), with
the window, phone or object on the right. The 3D shots use a lens shift (`CameraRig shift`), so
the subject moves over without the perspective changing.

### Why the scan shot is genuine

`scripts/capture-ui.mjs` gives Chromium a fake camera that plays the QR code the app itself
generated. The app's real scanner (html5-qrcode) decodes it, looks up the spool and loads it into
slot T2. The final screenshot is the actual result of that scan, including the toast, not a mock-up.

## 3. How it is built

```
video/
  PLAN.md                 this file
  scripts/capture-ui.mjs  drives the real app (dev server) with API fixtures → public/ui/*.png
  scripts/capture-shots.mjs  the individual screens and the click targets (.json beside each)
  scripts/synth-sfx.mjs   generates every sound effect as WAV, from code
  fixtures/               hero spool, printer and the endpoints cypress/fixtures/demo lacks
  public/ui/              captured screens, qr.svg (the real code), click-target coordinates
  src/theme.ts            measured style tokens (springs, colors, push rate, type)
  src/three/              procedural 3D: Spool, Label, Printer, Studio lighting
  src/components/         Headline, BrowserWindow, Phone, Cursor, AppIconTile
  src/scenes/             one file per shot
  src/SpoolLabelsAd.tsx   the edit: shot order and timing (one table)
  src/Root.tsx            compositions: QrSpoolVertical (1080×1920), QrSpoolHorizontal (1920×1080)
```

- **Remotion** owns the timeline: every frame is a pure function of `useCurrentFrame()`, so
  renders are deterministic and any frame can be re-rendered on its own.
- **three.js** (through `@remotion/three` and react-three-fiber) draws the physical shots. All
  geometry is procedural: lathe/extrude spool, box-frame printer. Lighting is a
  `RoomEnvironment` PMREM plus key and rim lights, so nothing is downloaded at render time.
- **The UI is the real app**, captured from the Angular dev server with every API call answered
  from fixtures (the same approach as `cypress/support/capture.ts`). No API or database is needed.
- **Aspect ratio is a prop.** Layout reads `useVideoConfig()` and places type and devices for
  portrait or landscape. 16:9 is a second `<Composition>` over the same scenes.

### Gotchas already hit

- **Apply renderer/scene settings in a layout effect** (`Studio`). With a plain `useEffect`
  the first frame a canvas draws has no environment lighting and every later frame does. A
  `remotion still` is always a first frame, so the look-dev and the render disagreed: the MP4
  came out greyed and peach until this was fixed. Check the MP4, not just stills.
- **ThreeCanvas needs integer sizes.** Round anything computed.
- **Up-facing dark surfaces mirror the studio ceiling as white** under the `RoomEnvironment`.
  Use Lambert for matte plates and floors.
- **The fake camera decodes instantly.** The capture gives it 4 s of blank lead-in so the
  scanner screen can be captured before the code is in view.
- **Don't spring anything onto a surface it nearly touches.** The label sits 1 mm off the
  flange, so the landing spring's overshoot sank it into the flange and it blinked out for a
  few frames. A clamped ease-out lands exactly once.
- **`colorHex` in fixtures has no `#`.** That is the API's format, and the QR label dialog
  prepends one, so `#ff6a13` became `##ff6a13` and the label's swatch rendered white.
- **Restart `ng serve` after `npm install` in the repo root.** A dev server that outlives a
  dependency change serves stale prebundled chunks, so a lazy `import()` fails. Here that
  showed up as the QR dialog's "Something went wrong generating the QR codes".
- **Mastering:** loudnorm alone undershoots a sparse SFX track, so `master.sh` adds a measured
  gain trim.

## 4. Commands

```bash
cd video
npm install

# 1. Re-capture the UI (needs `npm start` running in the repo root)
npm run capture

# 2. Regenerate sound effects
npm run sfx

# 3. Preview and scrub in the browser
npm run studio

# 4. Render. On a machine without a GPU, add REMOTION_GL=swangle (software WebGL, slower).
npm run render:vertical      # out/qr-spool-vertical.mp4
npm run render:horizontal    # out/qr-spool-horizontal.mp4
```

In a container without Remotion's downloadable headless shell, point it at a local one with
`REMOTION_BROWSER=/path/to/headless_shell`.

## 5. Making the next one

The engine is the parts list above. A new feature video is mostly a new `SpoolLabelsAd.tsx`-style
edit table and a few new shots:

1. Write the hook as a problem the viewer already has, in under six words.
2. Cut the feature into 3 to 5 verbs, one shot each, each 2 to 4 s.
3. Capture the real screens with a new entry in `capture-shots.mjs`.
4. Reuse `Headline`, `BrowserWindow`, `Phone` and `Cursor`. Add 3D only where the physical
   world is the point.
5. End on the mark and a one-line promise.

### Ideas worth exploring next

- **A licensed music bed** at about 118 BPM, Apple's measured median. Snap the big moments (title
  card, end card) to downbeats.
- **A voice-over** at about 3 words per second, with type landing about 2 frames before the
  spoken word.
- **Real footage** of the label going onto a real spool, swapped into shot 7 (`<OffthreadVideo>`).
  This is the most convincing upgrade.
- **Render farm.** `@remotion/lambda` renders a 30 s spot in well under a minute, versus tens of
  minutes on a CPU-only box.
