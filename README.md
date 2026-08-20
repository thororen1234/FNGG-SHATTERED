# Shattered

A Next.js site that tracks FNGG puzzle events. some
puzzle events like Shattered or Override and OG. It shows,
per event and per puzzle day, which codes/pieces are known, a visual board of
found pieces, and a raw text endpoint for pulling codes programmatically.

## Structure

```text
scripts/          One-off scripts for pulling piece data/images from fortnite.gg
web/               The Next.js app
  app/
    [mode]/[...slug]/   Public event page (e.g. /br/7/4, /og/1/9)
    api/                Read-only endpoints for mappings, images, maps, and raw code dumps
    lib/data.js         Reads/writes event data under uploaded/mappings
    actions.js          Server actions (late-found code submission)
  uploaded/
    mappings/<mode>/<chapter>/<season>/index.json   Event metadata + per-day codes
    mappings/<mode>/day>.json                  Per-day piece/code mapping
    images/<mode>/<day>/<code>.webp             Piece images
    maps/<mode>/<day>.png                        Full map image, if available
```

Event data (`uploaded/`) is plain JSON/webp/png on disk, not a database.

## Development

```bash
cd web
pnpm install
pnpm dev
```

Runs at `http://localhost:3000`. Routes are dynamic (`force-dynamic`), so
editing files under `uploaded/` is picked up on the next request without a
restart.

## Build & deploy

```bash
cd web
pnpm build
pnpm start
```

A `Dockerfile` is provided (multi-stage, standalone Next.js output) and built
via `.github/workflows/docker.yml` on pushes to `main` and on tags, publishing
to `ghcr.io`.

## License

MIT
