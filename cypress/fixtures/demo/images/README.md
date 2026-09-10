# Demo print images

These photos are used only to make the home-page marketing screenshots look
real. They belong to the repo owner (3D Print Log user 1, HoffmanEngineering)
and are committed here with permission.

| File              | Source print | Image id |
| ----------------- | ------------ | -------- |
| llamas.jpg        | 1            | 28       |
| gourd.jpg         | 6            | 26       |
| trophy.jpg        | 50           | 8        |
| oculus.jpg        | 177          | 129      |
| cat-headbands.jpg | 2            | 10       |

Fetched via `node scripts/fetch-demo-images.mjs`, which calls
`GET https://api.3dprintlog.com/api/Prints/{id}/image/{imageId}`
with header `allow-anonymous-request: true`.

## Demo printer photos

Photos of the machines `printers-summary.json` names, shown by `app-printer-avatar`
wherever a printer appears. They belong to the repo owner and are committed here with
permission.

| File                         | Printer id | Machine                  |
| ---------------------------- | ---------- | ------------------------ |
| snapmaker_u1.jpg             | 101        | Snapmaker U1             |
| anycubic_kobra_s1.jpg        | 102        | Anycubic Kobra S1        |
| heygears_reflex_rs_turbo.jpg | 103        | HeyGears Reflex RS Turbo |

`fetch-demo-images.mjs` does **not** refetch these - they were placed by hand, downscaled
to the 720px-wide convention the print photos use. `PRINTER_IMAGE_MAP` in
`cypress/fixtures/demo/manifest.ts` maps each printer id to its file, and
`printer-thumbnails.json` points at `/api/Printers/{id}/thumbnail` so the capture harness
serves them from the repo rather than from a real blob host.

The fixture's makes and models were changed to match these photos. A screenshot showing a
Snapmaker beside "(Bambu Lab A1)" is worse than no photo at all.
