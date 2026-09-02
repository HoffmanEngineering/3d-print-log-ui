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
