.PHONY: setup sim web dev test validate

setup:
	python3 -m venv .venv
	.venv/bin/pip install -e ".[dev]"
	cd web && npm install

sim:
	.venv/bin/uvicorn plant_sim.api:app --reload --reload-dir sim --reload-dir data --port 8000

web:
	cd web && npm run dev

dev:
	@echo "API on http://127.0.0.1:8000  and  UI on http://127.0.0.1:5173"
	$(MAKE) -j2 sim web

test:
	.venv/bin/pytest
	cd web && npm test

validate:
	.venv/bin/python -m plant_sim.validation.literature
