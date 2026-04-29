import logging

from fastapi import FastAPI

from .database import engine, Base
from .routes import router


def create_app() -> FastAPI:
    """Application factory so the instance can be configured for tests.

    Database tables are created when the factory is first called.
    """
    app = FastAPI(
        title="LeadSense AI",
        description="AI-Based Intelligent Lead Generation System",
        version="1.0.0",
    )

    # ensure tables exist before the first request
    Base.metadata.create_all(bind=engine)

    @app.get("/")
    def root():
        return {"status": "success", "message": "LeadSense AI is running 🚀"}

    app.include_router(router)
    return app


# create a global application object for uvicorn to use
app = create_app()

# very basic logging setup; in real deployments you'd wire this through
logging.basicConfig(level=logging.INFO)
