# Lead Scoring API

This service contains the Python-based lead scoring API and its supporting ML assets.

## Layout

```text
lead-scoring-api/
|- app/           # FastAPI application package
|- data/          # Local database files such as SQLite
|- models/        # Serialized model files
|- scripts/       # Training and utility scripts
\- requirements.txt
```

## Common paths

- App entrypoint: `app.main:app`
- Default database: `data/leadsense.db`
- Default model: `models/xgb_model.pkl`
- Training script: `scripts/train_model.py`
