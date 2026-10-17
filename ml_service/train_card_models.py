"""
Model Training Script for Credit and Debit Card Fraud Detection.
Implements:
1. Random Forest Classifier (Primary Model + Feature Importance for Explainable AI)
2. Support Vector Machine (SVM) Classifier (Boundary Verifier)
Evaluates Precision, Recall, F1-Score, and ROC-AUC.
Exports trained models and scaler to ml_service/models/.
"""
import os
import time
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(CURRENT_DIR, "..", "creditcard.csv")
MODELS_DIR = os.path.join(CURRENT_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_models():
    print(f"[*] Starting ML Model Training Pipeline...")
    print(f"[*] Loading dataset from {CSV_PATH}...")
    
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Dataset not found at {CSV_PATH}")

    df = pd.read_csv(CSV_PATH)
    total_samples = len(df)
    fraud_samples = df['Class'].sum()
    legit_samples = total_samples - fraud_samples
    print(f"[*] Dataset loaded: {total_samples} total transactions")
    print(f"    - Legitimate (Class 0): {legit_samples} ({legit_samples/total_samples*100:.2f}%)")
    print(f"    - Fraudulent (Class 1): {fraud_samples} ({fraud_samples/total_samples*100:.2f}%)")

    # Preprocessing
    # RobustScaler is resilient to outliers in Amount and Time
    scaler = RobustScaler()
    df['scaled_amount'] = scaler.fit_transform(df['Amount'].values.reshape(-1, 1))
    df['scaled_time'] = scaler.fit_transform(df['Time'].values.reshape(-1, 1))

    # Features: scaled_time, V1..V28, scaled_amount
    feature_cols = ['scaled_time'] + [f'V{i}' for i in range(1, 29)] + ['scaled_amount']
    X = df[feature_cols]
    y = df['Class']

    # Stratified Train/Test Split (80/20)
    print("[*] Splitting dataset (80% Train, 20% Test) with stratification...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 1. Random Forest Classifier (Primary Model)
    print("\n[+] Training Random Forest Classifier (Primary Model)...")
    rf_start = time.time()
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    rf_time = time.time() - rf_start
    print(f"[+] Random Forest trained in {rf_time:.2f}s")

    # Evaluate Random Forest
    rf_preds = rf_model.predict(X_test)
    rf_probs = rf_model.predict_proba(X_test)[:, 1]
    rf_auc = roc_auc_score(y_test, rf_probs)
    rf_f1 = f1_score(y_test, rf_preds)
    rf_prec = precision_score(y_test, rf_preds)
    rf_rec = recall_score(y_test, rf_preds)

    print("--- Random Forest Performance ---")
    print(f"ROC-AUC Score: {rf_auc:.4f}")
    print(f"Precision:     {rf_prec:.4f}")
    print(f"Recall:        {rf_rec:.4f}")
    print(f"F1-Score:      {rf_f1:.4f}")
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, rf_preds))

    # Feature Importances for Explainable AI
    importances = dict(zip(feature_cols, rf_model.feature_importances_))
    sorted_importances = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    top_features = sorted_importances[:7]
    print("\n[+] Top Discriminative Features for Explainable AI:")
    for feat, imp in top_features:
        print(f"    - {feat}: {imp:.4f}")

    # 2. Support Vector Machine (SVM Classifier)
    # Since kernel SVM on 220k rows is computationally prohibitive (O(N^3)),
    # we train an SVM with RBF kernel on a high-information balanced sub-sample
    # combining all training fraud cases with 10x matched legitimate cases.
    print("\n[+] Training Support Vector Machine (SVM) Classifier (Boundary Verifier)...")
    svm_start = time.time()

    train_df = pd.concat([X_train, y_train], axis=1)
    fraud_train = train_df[train_df['Class'] == 1]
    legit_train = train_df[train_df['Class'] == 0].sample(n=len(fraud_train) * 10, random_state=42)
    balanced_svm_train = pd.concat([fraud_train, legit_train]).sample(frac=1, random_state=42)

    X_svm_train = balanced_svm_train[feature_cols]
    y_svm_train = balanced_svm_train['Class']

    svm_base = SVC(kernel='rbf', C=1.0, probability=True, random_state=42)
    svm_base.fit(X_svm_train, y_svm_train)
    svm_time = time.time() - svm_start
    print(f"[+] SVM trained in {svm_time:.2f}s")

    # Evaluate SVM
    svm_preds = svm_base.predict(X_test)
    svm_probs = svm_base.predict_proba(X_test)[:, 1]
    svm_auc = roc_auc_score(y_test, svm_probs)
    svm_f1 = f1_score(y_test, svm_preds)
    svm_prec = precision_score(y_test, svm_preds)
    svm_rec = recall_score(y_test, svm_preds)

    print("--- SVM Classifier Performance ---")
    print(f"ROC-AUC Score: {svm_auc:.4f}")
    print(f"Precision:     {svm_prec:.4f}")
    print(f"Recall:        {svm_rec:.4f}")
    print(f"F1-Score:      {svm_f1:.4f}")

    # 3. Export Models & Metadata
    print("\n[*] Saving models and artifacts...")
    rf_path = os.path.join(MODELS_DIR, "credit_card_rf.joblib")
    svm_path = os.path.join(MODELS_DIR, "credit_card_svm.joblib")
    scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")

    joblib.dump(rf_model, rf_path)
    joblib.dump(svm_base, svm_path)
    joblib.dump(scaler, scaler_path)

    metadata = {
        "model_type": "Random Forest + SVM Ensemble",
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_samples": total_samples,
        "features": feature_cols,
        "metrics": {
            "random_forest": {
                "roc_auc": round(rf_auc, 4),
                "precision": round(rf_prec, 4),
                "recall": round(rf_rec, 4),
                "f1_score": round(rf_f1, 4)
            },
            "svm": {
                "roc_auc": round(svm_auc, 4),
                "precision": round(svm_prec, 4),
                "recall": round(svm_rec, 4),
                "f1_score": round(svm_f1, 4)
            }
        },
        "top_features": sorted_importances[:10]
    }

    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[+] All artifacts saved successfully:")
    print(f"    - {rf_path}")
    print(f"    - {svm_path}")
    print(f"    - {scaler_path}")
    print(f"    - {meta_path}")
    print("[+] Model Training Completed Successfully!")

if __name__ == "__main__":
    train_models()
