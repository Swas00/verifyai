from fastapi import FastAPI

from routers import screen

app = FastAPI(title="VerifyAI ML Service")
app.include_router(screen.router)


@app.get("/health")
def health():
    return {"status": "ok"}
