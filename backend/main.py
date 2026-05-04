from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from datetime import datetime
import time
import os
import logging
import threading

from database import engine, SessionLocal, Base
from models import Incident, RCA

import redis
from pymongo import MongoClient

# Rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

# ---------------------- INIT ----------------------

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")

redis_client = redis.Redis(host=REDIS_HOST, port=6379, decode_responses=True)

mongo_client = MongoClient(MONGO_URL)
mongo_db = mongo_client["ims"]
signals_collection = mongo_db["signals"]

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

start_time = time.time()
signal_count = 0

# ---------------------- UTIL ----------------------

def db_commit_with_retry(db, retries=3):
    for attempt in range(retries):
        try:
            db.commit()
            return
        except Exception as e:
            db.rollback()
            logging.warning(f"DB commit failed (attempt {attempt+1}): {e}")
    raise Exception("DB commit failed after retries")


def log_throughput():
    global signal_count
    while True:
        time.sleep(5)
        logging.info(f"🚀 Signals/sec: {signal_count / 5}")
        signal_count = 0


threading.Thread(target=log_throughput, daemon=True).start()


# ---------------------- MODELS ----------------------

class Signal(BaseModel):
    component_id: str
    severity: str
    message: str


# ---------------------- ROUTES ----------------------

@app.get("/")
async def home():
    return {"message": "IMS backend running successfully"}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "uptime_seconds": time.time() - start_time
    }


# ✅ SIGNAL INGESTION (ASYNC)
@app.post("/signals")
@limiter.limit("10/second")
async def receive_signal(request: Request, signal: Signal):

    global signal_count
    signal_count += 1

    logging.info(f"Signal received: {signal.component_id}")

    db = SessionLocal()

    try:
        # Mongo (leave sync)
        try:
            signals_collection.insert_one({
                "component_id": signal.component_id,
                "severity": signal.severity,
                "message": signal.message,
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            logging.warning(f"Mongo insert failed: {e}")

        debounce_key = f"incident:{signal.component_id}"

        # Redis (leave sync)
        try:
            if redis_client.exists(debounce_key):
                return {"status": "Signal linked to existing incident"}

            redis_client.set(debounce_key, "active", ex=10)
        except Exception:
            logging.warning("Redis not available")

        # DB (async wrapped)
        incident = Incident(
            component_id=signal.component_id,
            severity=signal.severity
        )

        await run_in_threadpool(lambda: db.add(incident))
        await run_in_threadpool(lambda: db_commit_with_retry(db))
        await run_in_threadpool(lambda: db.refresh(incident))

        return {
            "status": "New incident created",
            "incident_id": incident.id
        }

    finally:
        db.close()


# ✅ RCA (ASYNC)
@app.post("/incidents/{incident_id}/rca")
async def submit_rca(
    incident_id: int,
    root_cause_category: str,
    fix_applied: str,
    prevention_steps: str
):
    db = SessionLocal()

    try:
        incident = await run_in_threadpool(
            lambda: db.query(Incident).filter(Incident.id == incident_id).first()
        )

        if not incident:
            return {"error": "Incident not found"}

        rca = RCA(
            incident_id=incident_id,
            root_cause_category=root_cause_category,
            fix_applied=fix_applied,
            prevention_steps=prevention_steps
        )

        await run_in_threadpool(lambda: db.add(rca))

        incident.end_time = datetime.utcnow()

        if incident.start_time:
            incident.mttr = (
                incident.end_time - incident.start_time
            ).total_seconds()

        await run_in_threadpool(lambda: db_commit_with_retry(db))

        return {
            "message": "RCA submitted",
            "incident_id": incident_id,
            "mttr_seconds": incident.mttr
        }

    finally:
        db.close()


# ✅ STATUS (ASYNC)
@app.put("/incidents/{incident_id}/status")
async def update_incident_status(incident_id: int, status: str):

    db = SessionLocal()

    try:
        incident = await run_in_threadpool(
            lambda: db.query(Incident).filter(Incident.id == incident_id).first()
        )

        if not incident:
            return {"error": "Incident not found"}

        valid_transitions = {
            "OPEN": ["INVESTIGATING"],
            "INVESTIGATING": ["RESOLVED"],
            "RESOLVED": ["CLOSED"],
        }

        current_status = incident.status

        if status not in valid_transitions.get(current_status, []):
            return {
                "error": f"Invalid transition from {current_status} to {status}"
            }

        if status == "CLOSED":
            rca = await run_in_threadpool(
                lambda: db.query(RCA).filter(RCA.incident_id == incident_id).first()
            )

            if not rca:
                return {"error": "Cannot close incident without RCA"}

        incident.status = status

        await run_in_threadpool(lambda: db_commit_with_retry(db))

        return {
            "message": "Status updated",
            "incident_id": incident.id,
            "new_status": incident.status
        }

    finally:
        db.close()


# ✅ GET INCIDENT (ASYNC)
@app.get("/incidents/{incident_id}")
async def get_incident(incident_id: int):

    db = SessionLocal()

    try:
        incident = await run_in_threadpool(
            lambda: db.query(Incident).filter(Incident.id == incident_id).first()
        )

        if not incident:
            return {"error": "Not found"}

        return {
            "id": incident.id,
            "component_id": incident.component_id,
            "status": incident.status,
            "severity": incident.severity,
            "start_time": incident.start_time,
            "end_time": incident.end_time,
            "mttr_seconds": incident.mttr
        }

    finally:
        db.close()