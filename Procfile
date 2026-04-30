web: (python -m ml_models.training.train_model --mode csv || echo "ML training skipped — model will use fallback") && gunicorn --workers=4 --timeout=120 --chdir backend run:app
