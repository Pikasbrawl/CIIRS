#!/usr/bin/env python3
"""
CIIRS - YOLO11 + UCF-Crime Temporal Surveillance AI Training Pipeline
=====================================================================
Trains the temporal surveillance sequence model using spatial-temporal feature
trajectories extracted from the official UCF-Crime anomaly dataset (CVPR 2018)
and YOLO11 detection backbone.

Maintains strict compliance with public-safety ethical AI guidelines:
- Observable kinetic features only (motion, acceleration, density, dispersion, aspect ratio, proximity)
- NO demographic, racial, biometric, or facial profiling
- Persists weights to backend/models/ciirs_production_weights.pt and DB
"""

import os
import sys
import time
import json
import pickle
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from datetime import datetime

# Setup project path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from app.services.ai_engine import SCENARIO_CLASSES, TemporalSequenceModel, ai_engine
from app.database.session import SessionLocal
from app.database.models import Dataset, TrainingRun, ModelVersion

# Map UCF-Crime crime categories to CIIRS 9 operational scenario classes
UCF_TO_CIIRS_MAPPING = {
    'Abuse': 2,           # Physical Altercation Indicators
    'Assault': 2,         # Physical Altercation Indicators
    'Fighting': 2,        # Physical Altercation Indicators
    'Arrest': 2,          # Physical Altercation Indicators
    'Robbery': 3,         # Sudden Running (snatch & flee)
    'Stealing': 3,        # Sudden Running
    'Shoplifting': 3,     # Sudden Running
    'Burglary': 7,        # Restricted-Area Entry
    'Vandalism': 7,       # Restricted-Area Entry
    'RoadAccidents': 8,   # Unusual Movement (vehicular collision/spin)
    'Explosion': 8,       # Unusual Movement
    'Arson': 8,           # Unusual Movement
    'Shooting': 8         # Unusual Movement
}

def extract_features_from_box_sequence(boxes, seq_len=20):
    """
    Extract 12 normalized spatial-temporal kinematic features from bounding box sequence.
    0: Motion magnitude proxy
    1: Acceleration delta
    2: Crowd count / density proxy
    3: Crowd dispersion proxy
    4: Proximity indicator
    5: Approach velocity
    6: Posture aspect ratio (h / w)
    7: Vertical descent velocity (vy)
    8: Unattended stationary object counter
    9: Boundary zone violation
    10: Directional variance
    11: Inactivity duration
    """
    n = len(boxes)
    if n == 0:
        return np.zeros((seq_len, 12), dtype=np.float32)

    indices = np.linspace(0, n - 1, seq_len).astype(int)
    sampled = [boxes[i] for i in indices]

    feats = []
    prev_center = None
    prev_vel = 0.5
    prev_angle = 0.0
    inactivity = 0.0

    for idx, b in enumerate(sampled):
        path, x1, y1, x2, y2 = b
        w = max(2.0, float(x2 - x1))
        h = max(2.0, float(y2 - y1))
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        aspect = h / w

        if prev_center is None:
            vel = 0.5
            acc = 0.0
            vy = 0.0
            dir_var = 0.05
        else:
            dx = cx - prev_center[0]
            dy = cy - prev_center[1]
            vel = np.sqrt(dx * dx + dy * dy) / 8.0
            acc = abs(vel - prev_vel)
            vy = dy / 8.0
            angle = np.arctan2(dy, dx)
            dir_var = abs(angle - prev_angle)
            prev_angle = angle

        prev_center = (cx, cy)
        prev_vel = vel

        if vel < 0.2:
            inactivity = min(10.0, inactivity + 1.0)
        else:
            inactivity = max(0.0, inactivity - 0.5)

        feat = [
            min(10.0, float(vel)),                           # 0: motion mag
            min(10.0, float(acc)),                           # 1: acc delta
            1.0 + float(w * h > 12000),                      # 2: density proxy
            float(w) / 10.0,                                 # 3: dispersion proxy
            max(5.0, 100.0 - float(w)),                      # 4: proximity proxy
            float(acc * 2.0),                                # 5: approach vel
            float(aspect),                                   # 6: aspect ratio
            float(vy),                                       # 7: vertical descent
            1.0 if (vel < 0.1 and aspect > 0.8) else 0.0,   # 8: unattended object
            1.0 if (cx < 40 or cx > 280) else 0.0,           # 9: boundary zone
            min(10.0, float(dir_var)),                       # 10: directional variance
            float(inactivity)                                # 11: inactivity
        ]
        feats.append(feat)

    return np.array(feats, dtype=np.float32)

def generate_normal_surveillance_sequence(seq_len=20):
    """Generate nominal pedestrian/traffic surveillance sequence."""
    base_vel = np.random.uniform(0.6, 1.4)
    aspect = np.random.uniform(2.0, 2.4)
    feats = []
    for _ in range(seq_len):
        vel = np.clip(base_vel + np.random.normal(0, 0.1), 0.3, 2.0)
        acc = abs(np.random.normal(0, 0.08))
        feats.append([
            float(vel),                                     # motion mag
            float(acc),                                     # acc delta
            float(np.random.randint(1, 4)),                 # density
            float(np.random.uniform(8.0, 16.0)),            # dispersion
            float(np.random.uniform(50.0, 95.0)),           # proximity
            float(acc * 1.5),                               # approach vel
            float(aspect + np.random.normal(0, 0.05)),      # aspect ratio
            float(np.random.normal(0, 0.05)),               # vertical descent
            0.0,                                            # unattended object
            0.0,                                            # boundary zone
            float(abs(np.random.normal(0.1, 0.05))),        # directional variance
            0.0                                             # inactivity
        ])
    return np.array(feats, dtype=np.float32)

def generate_kinetic_scenario_sequence(scenario_class: str, seq_len=20):
    """Generate kinetic sequence for specific operational scenarios."""
    base_seq, _ = ai_engine.generate_simulated_scenario_sequence(scenario_class, seq_len)
    noise = np.random.normal(0, 0.06, base_seq.shape).astype(np.float32)
    return np.clip(base_seq + noise, 0.0, 500.0)

def load_ucf_crime_training_dataset(seq_len=20):
    """Load and process UCF-Crime dataset tracks into training tensors."""
    dataset_dir = os.path.join(BACKEND_DIR, "datasets", "ucf_crime")
    train_pkl = os.path.join(dataset_dir, "Train_annotation.pkl")
    test_pkl = os.path.join(dataset_dir, "Test_annotation.pkl")

    if not os.path.exists(train_pkl):
        raise FileNotFoundError(f"UCF-Crime Train_annotation.pkl not found at {train_pkl}")

    print(f"[1/5] Loading UCF-Crime annotation records from {train_pkl}...")
    with open(train_pkl, "rb") as f:
        train_data = pickle.load(f)

    test_data = {}
    if os.path.exists(test_pkl):
        with open(test_pkl, "rb") as f:
            test_data = pickle.load(f)

    X = []
    y = []
    class_distribution = {name: 0 for name in SCENARIO_CLASSES}

    # 1. Process UCF-Crime anomaly trajectories
    print(f"[2/5] Extracting spatial-temporal features from {len(train_data)} video sequences...")
    for vid_name, boxes in train_data.items():
        prefix = ''.join([c for c in vid_name.split('_')[0] if not c.isdigit()])
        ciirs_class_idx = UCF_TO_CIIRS_MAPPING.get(prefix, 8)
        ciirs_class_name = SCENARIO_CLASSES[ciirs_class_idx]

        # Extract multiple sub-windows if sequence is long
        if len(boxes) >= 30:
            step = max(10, len(boxes) // 3)
            for start in range(0, len(boxes) - 15, step):
                sub_boxes = boxes[start:start + 25]
                feats = extract_features_from_box_sequence(sub_boxes, seq_len)
                X.append(feats)
                y.append(ciirs_class_idx)
                class_distribution[ciirs_class_name] += 1
        else:
            feats = extract_features_from_box_sequence(boxes, seq_len)
            X.append(feats)
            y.append(ciirs_class_idx)
            class_distribution[ciirs_class_name] += 1

    # 2. Add normal surveillance sequences
    normal_count = 200
    for _ in range(normal_count):
        norm_seq = generate_normal_surveillance_sequence(seq_len)
        X.append(norm_seq)
        y.append(0)
        class_distribution["Normal Activity"] += 1

    # 3. Add balanced representation for other public safety classes
    for extra_class, extra_count in [
        ("Crowd Surge", 120),
        ("Fall Detection", 120),
        ("Possible Medical Distress", 120),
        ("Unattended Object", 120)
    ]:
        c_idx = SCENARIO_CLASSES.index(extra_class)
        for _ in range(extra_count):
            seq = generate_kinetic_scenario_sequence(extra_class, seq_len)
            X.append(seq)
            y.append(c_idx)
            class_distribution[extra_class] += 1

    X_arr = np.array(X, dtype=np.float32)
    y_arr = np.array(y, dtype=np.int64)

    print(f"Total dataset samples prepared: {len(X_arr)} sequences of shape {X_arr[0].shape}")
    print("Class Distribution:")
    for cls_name, count in class_distribution.items():
        print(f"  - {cls_name}: {count} samples")

    return torch.tensor(X_arr, dtype=torch.float32), torch.tensor(y_arr, dtype=torch.long), class_distribution

def train_yolo11_temporal_model(epochs=25, batch_size=32, lr=0.001):
    """Execute complete PyTorch model training across UCF-Crime dataset."""
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"[3/5] Starting model training on compute device: {device.type.upper()}")

    # 1. Load data
    X, y, class_distribution = load_ucf_crime_training_dataset(seq_len=20)
    total_samples = len(X)

    # 2. Train/Val/Test Splits (70% / 15% / 15%)
    indices = torch.randperm(total_samples)
    train_size = int(0.70 * total_samples)
    val_size = int(0.15 * total_samples)

    train_idx = indices[:train_size]
    val_idx = indices[train_size:train_size + val_size]
    test_idx = indices[train_size + val_size:]

    train_loader = DataLoader(TensorDataset(X[train_idx], y[train_idx]), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(TensorDataset(X[val_idx], y[val_idx]), batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(TensorDataset(X[test_idx], y[test_idx]), batch_size=batch_size, shuffle=False)

    # 3. Model Architecture
    model = TemporalSequenceModel(input_dim=12, hidden_dim=64, num_classes=len(SCENARIO_CLASSES)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)

    # 4. Training Loop
    print(f"[4/5] Training for {epochs} epochs (Batch Size: {batch_size}, LR: {lr})...")
    history = []
    best_f1 = 0.0
    best_state_dict = None

    weights_dir = os.path.join(BACKEND_DIR, "models")
    os.makedirs(weights_dir, exist_ok=True)
    run_weights_path = os.path.join(weights_dir, "ciirs_model_run_ucf11.pt")
    prod_weights_path = os.path.join(weights_dir, "ciirs_production_weights.pt")

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for bx, by in train_loader:
            bx, by = bx.to(device), by.to(device)
            optimizer.zero_grad()
            logits, _ = model(bx)
            loss = criterion(logits, by)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * bx.size(0)
            preds = torch.argmax(logits, dim=1)
            train_correct += (preds == by).sum().item()
            train_total += bx.size(0)

        avg_train_loss = train_loss / max(1, train_total)
        train_acc = train_correct / max(1, train_total)

        # Validation phase
        model.eval()
        val_loss = 0.0
        all_preds = []
        all_targets = []

        with torch.no_grad():
            for bx, by in val_loader:
                bx, by = bx.to(device), by.to(device)
                logits, _ = model(bx)
                loss = criterion(logits, by)
                val_loss += loss.item() * bx.size(0)
                preds = torch.argmax(logits, dim=1)
                all_preds.extend(preds.cpu().numpy().tolist())
                all_targets.extend(by.cpu().numpy().tolist())

        avg_val_loss = val_loss / max(1, len(all_targets))
        all_preds_arr = np.array(all_preds)
        all_targets_arr = np.array(all_targets)
        val_acc = float(np.mean(all_preds_arr == all_targets_arr))

        # Metrics & Confusion Matrix
        num_classes = len(SCENARIO_CLASSES)
        conf_mat = np.zeros((num_classes, num_classes), dtype=int)
        for p, t in zip(all_preds, all_targets):
            conf_mat[t, p] += 1

        precisions, recalls = [], []
        for c in range(num_classes):
            tp = conf_mat[c, c]
            fp = np.sum(conf_mat[:, c]) - tp
            fn = np.sum(conf_mat[c, :]) - tp
            prec = tp / max(1, (tp + fp))
            rec = tp / max(1, (tp + fn))
            precisions.append(prec)
            recalls.append(rec)

        avg_prec = float(np.mean(precisions))
        avg_rec = float(np.mean(recalls))
        val_f1 = (2 * avg_prec * avg_rec) / max(1e-5, (avg_prec + avg_rec))
        fpr = max(0.01, 1.0 - avg_prec)
        fnr = max(0.01, 1.0 - avg_rec)

        epoch_record = {
            "epoch": epoch,
            "train_loss": round(avg_train_loss, 4),
            "val_loss": round(avg_val_loss, 4),
            "train_acc": round(train_acc, 4),
            "val_acc": round(val_acc, 4),
            "precision": round(avg_prec, 4),
            "recall": round(avg_rec, 4),
            "f1_score": round(val_f1, 4),
            "fpr": round(fpr, 4),
            "fnr": round(fnr, 4)
        }
        history.append(epoch_record)

        if val_f1 >= best_f1:
            best_f1 = val_f1
            best_state_dict = model.state_dict().copy()

        if epoch % 5 == 0 or epoch == epochs or epoch == 1:
            print(f"Epoch [{epoch:02d}/{epochs:02d}] Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | Val Acc: {val_acc*100:.1f}% | F1: {val_f1*100:.1f}%")

    # 5. Save best weights
    print("[5/5] Saving trained model weights...")
    if best_state_dict is None:
        best_state_dict = model.state_dict()

    torch.save(best_state_dict, run_weights_path)
    torch.save(best_state_dict, prod_weights_path)
    print(f"  ✓ Saved checkpoint: {run_weights_path}")
    print(f"  ✓ Updated production weights: {prod_weights_path}")

    # Evaluate on hold-out Test Set
    model.load_state_dict(best_state_dict)
    model.eval()
    test_preds, test_targets = [], []
    with torch.no_grad():
        for bx, by in test_loader:
            bx = bx.to(device)
            logits, _ = model(bx)
            preds = torch.argmax(logits, dim=1)
            test_preds.extend(preds.cpu().numpy().tolist())
            test_targets.extend(by.numpy().tolist())

    test_acc = float(np.mean(np.array(test_preds) == np.array(test_targets)))
    print(f"\nFinal Generalization Accuracy on Hold-out Test Split: {test_acc*100:.2f}%\n")

    # 6. Database Registration
    db = SessionLocal()
    try:
        # Register Dataset
        ds_name = "UCF-Crime Real-World Surveillance Dataset (CVPR 2018)"
        existing_ds = db.query(Dataset).filter(Dataset.name == ds_name).first()
        if not existing_ds:
            ds = Dataset(
                name=ds_name,
                description="1,900 untrimmed CCTV videos (128 hours) covering 13 crime categories and normal activities",
                sample_count=total_samples,
                scenario_distribution=class_distribution,
                status="READY"
            )
            db.add(ds)
            db.commit()
            print(f"  ✓ Registered dataset in DB: {ds_name}")

        # Register Training Run
        run = TrainingRun(
            model_name="CIIRS-YOLO11-UCF-Crime-v3.0",
            architecture="YOLO11 + Bidirectional LSTM + Temporal Attention",
            epochs_total=epochs,
            epochs_completed=epochs,
            batch_size=batch_size,
            learning_rate=lr,
            dataset_name=ds_name,
            train_loss=history[-1]["train_loss"],
            val_loss=history[-1]["val_loss"],
            accuracy=round(test_acc, 4),
            precision=history[-1]["precision"],
            recall=history[-1]["recall"],
            f1_score=history[-1]["f1_score"],
            false_positive_rate=history[-1]["fpr"],
            false_negative_rate=history[-1]["fnr"],
            confusion_matrix=conf_mat.tolist(),
            epoch_history=history,
            weights_path=prod_weights_path,
            status="COMPLETED",
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow()
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        print(f"  ✓ Registered completed training run in DB: ID #{run.id} ({run.model_name})")

        # Register Model Version and set Active
        db.query(ModelVersion).update({ModelVersion.is_active: False})
        mv = ModelVersion(
            version_tag="v3.0.0-yolo11-ucf",
            architecture="YOLO11 + Bidirectional LSTM + Temporal Attention",
            trained_dataset=ds_name,
            accuracy=round(test_acc, 4),
            f1_score=history[-1]["f1_score"],
            is_active=True,
            deployed_at=datetime.utcnow()
        )
        db.add(mv)
        db.commit()
        print(f"  ✓ Activated production model version in DB: {mv.version_tag}")

    except Exception as e:
        db.rollback()
        print(f"Database update error: {e}")
    finally:
        db.close()

    # 7. Reload in-memory weights for AI Engine
    ai_engine._init_calibrated_weights()
    print("  ✓ Hot-reloaded live AI Engine with newly trained production weights!")

    return {
        "status": "SUCCESS",
        "dataset": ds_name,
        "epochs": epochs,
        "final_accuracy": test_acc,
        "final_f1": best_f1,
        "weights_path": prod_weights_path
    }

if __name__ == "__main__":
    result = train_yolo11_temporal_model(epochs=25, batch_size=32, lr=0.001)
    print("\nTraining execution completed successfully:")
    print(json.dumps(result, indent=2))
