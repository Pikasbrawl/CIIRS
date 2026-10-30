import os
import threading
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database.session import get_db, SessionLocal
from app.database.models import Dataset, ScenarioAnnotation, TrainingRun, ModelVersion
from app.schemas.schemas import TrainingStartRequest
from app.services.trainer import trainer_service
from app.services.ws_manager import ws_manager
import asyncio

router = APIRouter(prefix="/training", tags=["AI Model Training"])

@router.get("/datasets")
def get_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).all()

@router.post("/datasets/upload-annotation")
async def upload_csv_annotation(
    dataset_name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    lines = content.decode("utf-8", errors="ignore").splitlines()
    sample_count = max(0, len(lines) - 1)
    
    ds = Dataset(
        name=dataset_name,
        description=f"User uploaded annotation set ({file.filename})",
        sample_count=sample_count,
        scenario_distribution={"Custom Annotations": sample_count},
        status="READY"
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return {"message": "Dataset annotation registered successfully", "dataset_id": ds.id, "sample_count": sample_count}

@router.get("/runs")
def get_training_runs(db: Session = Depends(get_db)):
    return db.query(TrainingRun).order_by(TrainingRun.started_at.desc()).all()

@router.get("/runs/{run_id}")
def get_training_run_details(run_id: int, db: Session = Depends(get_db)):
    run = db.query(TrainingRun).filter(TrainingRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")
    return run

@router.post("/start-run")
def start_model_training(request: TrainingStartRequest, db: Session = Depends(get_db)):
    """
    Spawns genuine PyTorch model training across configured epochs and dataset.
    Updates DB and broadcasts progress.
    """
    run = TrainingRun(
        model_name=request.model_name,
        architecture=request.architecture,
        epochs_total=request.epochs,
        epochs_completed=0,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        dataset_name=request.dataset_name,
        status="RUNNING"
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Launch actual PyTorch training thread
    training_thread = threading.Thread(
        target=run_training_worker,
        args=(run.id, request.dict()),
        daemon=True
    )
    training_thread.start()

    return {
        "message": "PyTorch training execution initiated",
        "run_id": run.id,
        "model_name": run.model_name,
        "epochs": request.epochs,
        "status": "RUNNING"
    }

def run_training_worker(run_id: int, config: dict):
    """Worker function executing in separate thread."""
    def on_epoch(r_id, epoch_data):
        # We can fire and forget a broadcast if needed
        pass

    trainer_service.execute_training_run(
        run_id=run_id,
        config=config,
        db_session_factory=SessionLocal,
        on_epoch_callback=on_epoch
    )

@router.get("/models")
def get_model_versions(db: Session = Depends(get_db)):
    return db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()

@router.post("/models/{model_id}/deploy")
def deploy_model_version(model_id: int, db: Session = Depends(get_db)):
    models = db.query(ModelVersion).all()
    target = None
    for m in models:
        if m.id == model_id:
            m.is_active = True
            m.deployed_at = datetime.utcnow()
            target = m
        else:
            m.is_active = False
    if not target:
        raise HTTPException(status_code=404, detail="Model version not found")
    db.commit()
    return {"message": f"Model {target.version_tag} is now active in production", "deployed_version": target.version_tag}
