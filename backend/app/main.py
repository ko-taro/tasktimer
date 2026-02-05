from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import boards, tasks

app = FastAPI(title="TaskTimer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(boards.router)
app.include_router(tasks.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
