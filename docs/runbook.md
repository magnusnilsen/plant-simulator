# How to run Radicle

Two processes. The Python API does the science. The web page is the instrument.

```bash
make setup
make dev
```

Then open http://127.0.0.1:5173

If `make dev` is awkward in your shell, use two terminals:

```bash
make sim    # http://127.0.0.1:8000  (OpenAPI at /docs)
make web    # http://127.0.0.1:5173
```

Tests:

```bash
make test
```

Literature score, plus an SVG of observed versus predicted germination:

```bash
make validate
```

That writes `data/validation/plots/`. Those files are generated, not source.

The API is also usable without the page:

```bash
curl -s http://127.0.0.1:8000/api/simulate \
  -H 'content-type: application/json' \
  -d '{"species_ids":["lettuce"],"temperature_c":30,"water_potential_mpa":0}'
```

Changing a slider sends the same payload over a WebSocket at `/api/ws`. If the socket is down, the page falls back to the POST.

## The page

The view is a 3D soil block cut open like a textbook figure. Drag to orbit, scroll to zoom, and click a plant to inspect it.

| Key | Does |
| --- | --- |
| Space | Play or pause |
| S / G / W / L / X / M / R | Cut soil, show soil, water flow, labels, x-ray, scale bars, slow orbit |
| 1 / 2 / 3 | Overview, straight-on section, seed close-up |
| ← / → on the timeline | Step an hour (Shift: a day) |

In development the app state is on `window.radicle`, a zustand store. From the browser console, `radicle.getState().setTime(96)` jumps to day four, and `radicle.getState()` shows everything the page is drawing from.

If the 3D view fails, the error is shown in place of the scene, with the stack in the tooltip. The panels keep working.
