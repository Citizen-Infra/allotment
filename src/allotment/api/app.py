from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from allotment.api.routes import router
from allotment.db.session import create_all


def create_app() -> FastAPI:
    create_all()
    app = FastAPI(title="Allotment")
    app.include_router(router)
    static_dir = Path(__file__).resolve().parent.parent / "static"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="ui")
    return app
