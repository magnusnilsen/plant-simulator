"""HTTP and WebSocket boundary. The mathematics stays in the models."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

from plant_sim.encyclopedia import MODEL_CARDS, PHASES, WATER_SCALE
from plant_sim.environment import Environment
from plant_sim.models.simulate import Trajectory, simulate
from plant_sim.narrative import compare_runs, describe_run
from plant_sim.species import get_species, load_species


class SimulateBody(BaseModel):
    species_ids: list[str] = Field(min_length=1, max_length=6)
    temperature_c: float = Field(ge=-5, le=60)
    water_potential_mpa: float = Field(ge=-3, le=0.1)
    duration_h: float = Field(default=168, gt=0, le=1000)
    n_points: int = Field(default=121, ge=2, le=400)
    request_id: str | None = None


def create_app() -> FastAPI:
    app = FastAPI(
        title="Radicle",
        version="0.1.0",
        summary="Germination to early seedling, with the model named beside the result.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/species")
    def species_index() -> list[dict]:
        return [_species_summary(item) for item in load_species().values()]

    @app.get("/api/species/{species_id}")
    def species_detail(species_id: str) -> dict:
        return _require_species(species_id).model_dump()

    @app.get("/api/encyclopedia")
    def encyclopedia() -> dict:
        return {"models": MODEL_CARDS, "phases": PHASES, "water_scale": WATER_SCALE}

    @app.post("/api/simulate")
    def simulate_route(body: SimulateBody) -> dict:
        return _run(body)

    @app.websocket("/api/ws")
    async def live(websocket: WebSocket) -> None:
        await websocket.accept()
        try:
            while True:
                payload = await websocket.receive_json()
                request_id = payload.get("request_id") if isinstance(payload, dict) else None
                if not isinstance(payload, dict) or payload.get("type") != "simulate":
                    await websocket.send_json(
                        {
                            "type": "error",
                            "request_id": request_id,
                            "message": "Send type 'simulate' with species_ids, temperature_c, and water_potential_mpa.",
                        }
                    )
                    continue
                try:
                    body = SimulateBody.model_validate(payload)
                    result = _run(body)
                except (ValidationError, HTTPException, ValueError, KeyError) as exc:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "request_id": request_id,
                            "message": _error_message(exc),
                        }
                    )
                    continue
                await websocket.send_json({"type": "result", "request_id": body.request_id, **result})
        except WebSocketDisconnect:
            return

    return app


def _run(body: SimulateBody) -> dict:
    environment = Environment(body.temperature_c, body.water_potential_mpa)
    catalogue = load_species()
    trajectories: list[Trajectory] = []
    runs: list[dict] = []
    for species_id in body.species_ids:
        species = _require_species(species_id)
        trajectory = simulate(
            species,
            environment,
            duration_h=body.duration_h,
            n_points=body.n_points,
        )
        trajectories.append(trajectory)
        runs.append(
            {
                "species_id": species.id,
                "common_name": species.common_name,
                "scientific_name": species.scientific_name,
                "t50_h": trajectory.t50_h,
                "final_fraction": trajectory.final_fraction,
                "narrative": describe_run(species, environment, trajectory),
                "display": species.display.model_dump(),
                "samples": [_sample(sample) for sample in trajectory.samples],
            }
        )
    return {
        "temperature_c": body.temperature_c,
        "water_potential_mpa": body.water_potential_mpa,
        "duration_h": body.duration_h,
        "comparison": compare_runs(catalogue, trajectories),
        "runs": runs,
    }


def _sample(sample) -> dict:
    return {
        "time_h": round(sample.time_h, 4),
        "germination_fraction": sample.germination_fraction,
        "median_progress": sample.median_progress,
        "moisture": sample.moisture,
        "phase": sample.phase,
        "root_mm": sample.root_mm,
        "hypocotyl_mm": sample.hypocotyl_mm,
        "respiration_index": sample.respiration_index,
    }


def _species_summary(species) -> dict:
    return {
        "id": species.id,
        "common_name": species.common_name,
        "scientific_name": species.scientific_name,
        "family": species.family,
        "summary": species.summary,
        "display": species.display.model_dump(),
    }


def _require_species(species_id: str):
    try:
        return get_species(species_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def _error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException):
        detail = exc.detail
        return detail if isinstance(detail, str) else str(detail)
    if isinstance(exc, ValidationError):
        first = exc.errors()[0]
        loc = ".".join(str(part) for part in first["loc"])
        return f"{loc}: {first['msg']}"
    return str(exc)


app = create_app()
