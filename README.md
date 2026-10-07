# Radicle

An interactive encyclopedia of how a seed becomes a seedling.

Phase 1 is germination through the early root and hypocotyl, for three species: Arabidopsis (the laboratory weed), lettuce, and garden radish. You set temperature and soil water potential. The page recomputes the whole incubation and tells you which model the number came from, when that model was published, and where it is weak.

The science is Python. The page is a local web app. They talk over HTTP and a WebSocket.

```bash
make setup
make dev
```

Open http://127.0.0.1:5173

Read `docs/models.md` for the equations and `docs/limitations.md` for what this phase will not tell you. `docs/runbook.md` is the longer way to run and test it. The curated comparison with a published radish experiment is in `data/validation/`.
