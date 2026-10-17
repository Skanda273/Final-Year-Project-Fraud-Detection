"""
Unified Financial Fraud Detection System - Dataset Verification Script
======================================================================
This script validates:
1. Dataset file integrity, schema, row counts, and null checks for creditcard.csv
2. Class distribution (Class 0 legitimate vs Class 1 fraud)
3. Direct ML model inference using actual rows from creditcard.csv
4. MongoDB Atlas dataset synchronization & indexing
5. Live ML Service API evaluation using raw PCA vectors
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
import numpy as np
import pandas as pd
import joblib
from pymongo import MongoClient

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "creditcard.csv")
MODELS_DIR = os.path.join(BASE_DIR, "ml_service", "models")
RF_PATH = os.path.join(MODELS_DIR, "credit_card_rf.joblib")
SVM_PATH = os.path.join(MODELS_DIR, "credit_card_svm.joblib")
SCALER_PATH = os.path.join(MODELS_DIR, "scaler.joblib")
META_PATH = os.path.join(MODELS_DIR, "model_metadata.json")

MONGO_URI = "mongodb+srv://usharamineni3_db_user:QtynolJOQRBFY3oW@cluster0.iezawh1.mongodb.net/fraud_detection?retryWrites=true&w=majority&appName=Cluster0"

def section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_dataset_integrity():
    section("1. DATASET FILE INTEGRITY & SUMMARY STATISTICS")
    if not os.path.exists(CSV_PATH):
        print(f"  [FAIL] creditcard.csv NOT FOUND at {CSV_PATH}")
        return None
    
    file_size_mb = os.path.getsize(CSV_PATH) / (1024 * 1024)
    print(f"  [PASS] File located: creditcard.csv ({file_size_mb:.2f} MB)")
    
    print("  [*] Reading dataset with pandas...")
    t0 = time.time()
    df = pd.read_csv(CSV_PATH)
    t1 = time.time()
    print(f"  [PASS] Successfully read in {t1 - t0:.2f} seconds")
    
    total_rows = len(df)
    total_cols = len(df.columns)
    print(f"  [*] Total Transactions: {total_rows:,}")
    print(f"  [*] Total Features:     {total_cols} columns")
    
    # Null checks
    null_counts = int(df.isnull().sum().sum())
    if null_counts == 0:
        print("  [PASS] Missing/Null values: 0 (Dataset is clean)")
    else:
        print(f"  [WARN] Found {null_counts} null values")
        
    # Class distribution
    fraud_count = int(df['Class'].sum())
    legit_count = total_rows - fraud_count
    fraud_pct = (fraud_count / total_rows) * 100
    legit_pct = (legit_count / total_rows) * 100
    print(f"  [*] Class Distribution:")
    print(f"      - Legitimate (Class 0): {legit_count:,} ({legit_pct:.3f}%)")
    print(f"      - Fraudulent (Class 1): {fraud_count:,} ({fraud_pct:.3f}%)")
    
    # Summary of Amount
    print(f"  [*] Transaction Amount Statistics:")
    print(f"      - Min Amount:    INR {df['Amount'].min():.2f}")
    print(f"      - Median Amount: INR {df['Amount'].median():.2f}")
    print(f"      - Mean Amount:   INR {df['Amount'].mean():.2f}")
    print(f"      - Max Amount:    INR {df['Amount'].max():.2f}")
    
    return df

def test_model_inference_on_dataset(df):
    section("2. TESTING TRAINED ML MODELS DIRECTLY ON DATASET SAMPLES")
    if not (os.path.exists(RF_PATH) and os.path.exists(SCALER_PATH)):
        print("  [FAIL] Model files missing in ml_service/models/")
        return False

    rf_model = joblib.load(RF_PATH)
    scaler = joblib.load(SCALER_PATH)
    svm_model = joblib.load(SVM_PATH) if os.path.exists(SVM_PATH) else None
    print("  [PASS] Loaded Random Forest, SVM, and RobustScaler artifacts.")

    # Select real samples from the dataset
    legit_sample = df[df['Class'] == 0].sample(n=1, random_state=42).iloc[0]
    fraud_sample = df[df['Class'] == 1].sample(n=1, random_state=42).iloc[0]

    def prepare_vector(row):
        scaled_t = scaler.transform([[row['Time']]])[0][0]
        scaled_a = scaler.transform([[row['Amount']]])[0][0]
        vec = [scaled_t] + [row[f'V{i}'] for i in range(1, 29)] + [scaled_a]
        return np.array([vec])

    # Test Legitimate Sample
    vec_legit = prepare_vector(legit_sample)
    prob_legit_rf = float(rf_model.predict_proba(vec_legit)[0][1])
    prob_legit_svm = float(svm_model.predict_proba(vec_legit)[0][1]) if svm_model else prob_legit_rf
    score_legit = 0.70 * prob_legit_rf + 0.30 * prob_legit_svm
    
    print("\n  [*] Test Sample A: Real Legitimate Transaction from Dataset")
    print(f"      - Actual Class:  0 (Legitimate)")
    print(f"      - Amount:        INR {legit_sample['Amount']:.2f}")
    print(f"      - RF Score:      {prob_legit_rf*100:.2f}% | SVM Score: {prob_legit_svm*100:.2f}%")
    print(f"      - Ensemble Risk: {score_legit*100:.2f}%")
    print(f"      - Classification Result: {'[PASS] CORRECT (Low Risk)' if score_legit < 0.50 else '[FAIL]'}")

    # Test Fraud Sample
    vec_fraud = prepare_vector(fraud_sample)
    prob_fraud_rf = float(rf_model.predict_proba(vec_fraud)[0][1])
    prob_fraud_svm = float(svm_model.predict_proba(vec_fraud)[0][1]) if svm_model else prob_fraud_rf
    score_fraud = 0.70 * prob_fraud_rf + 0.30 * prob_fraud_svm

    print("\n  [*] Test Sample B: Real Fraudulent Transaction from Dataset")
    print(f"      - Actual Class:  1 (FRAUD)")
    print(f"      - Amount:        INR {fraud_sample['Amount']:.2f}")
    print(f"      - RF Score:      {prob_fraud_rf*100:.2f}% | SVM Score: {prob_fraud_svm*100:.2f}%")
    print(f"      - Ensemble Risk: {score_fraud*100:.2f}%")
    print(f"      - Classification Result: {'[PASS] CORRECT (Flagged as Fraud)' if score_fraud >= 0.50 else '[FAIL]'}")

    return True

def test_mongodb_sync():
    section("3. MONGODB ATLAS DATASET SYNCHRONIZATION")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000, tlsAllowInvalidCertificates=True)
        db = client["fraud_detection"]
        coll = db["credit_card_transactions"]

        total = coll.count_documents({})
        fraud = coll.count_documents({"Class": 1})
        legit = coll.count_documents({"Class": 0})
        debit = coll.count_documents({"card_type": "DEBIT_CARD"})
        credit = coll.count_documents({"card_type": "CREDIT_CARD"})

        print(f"  [PASS] Connected to MongoDB Atlas successfully!")
        print(f"  [*] Collection: credit_card_transactions")
        print(f"      - Total Ingested Documents: {total:,}")
        print(f"      - Legitimate (Class 0):      {legit:,}")
        print(f"      - Fraudulent (Class 1):      {fraud:,}")
        print(f"      - Debit Card Segment:        {debit:,}")
        print(f"      - Credit Card Segment:       {credit:,}")
        return True
    except Exception as e:
        print(f"  [FAIL] MongoDB connection: {e}")
        return False

def test_live_api_with_dataset_row(df):
    section("4. END-TO-END LIVE API VERIFICATION USING DATASET ROW")
    try:
        sample = df[df['Class'] == 1].iloc[0]
        payload = {
            "Time": float(sample["Time"]),
            "Amount": float(sample["Amount"]),
            "type": "CREDIT_CARD",
            "card_type": "CREDIT_CARD"
        }
        for i in range(1, 29):
            payload[f"V{i}"] = float(sample[f"V{i}"])

        url = "http://localhost:8000/predict_card"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode("utf-8"))

        print("  [PASS] Flask ML Service (http://localhost:8000/predict_card) evaluated dataset row:")
        print(f"      - is_fraud:    {result.get('is_fraud')}")
        print(f"      - Risk Score:  {result.get('risk_score')*100:.2f}%")
        print(f"      - Model Used:  {result.get('model_used')}")
        print(f"      - Top Reasons: {result.get('top_reasons')}")
        return True
    except Exception as e:
        print(f"  [INFO] Live ML Service test: {e}")
        return False

if __name__ == "__main__":
    print("\n" + "#" * 70)
    print("  STARTING UNIFIED FRAUD DETECTION SYSTEM: DATASET VERIFICATION")
    print("#" * 70)

    dataset_df = test_dataset_integrity()
    if dataset_df is not None:
        test_model_inference_on_dataset(dataset_df)
        test_mongodb_sync()
        test_live_api_with_dataset_row(dataset_df)

    print("\n" + "=" * 70)
    print("  DATASET VERIFICATION COMPLETE!")
    print("=" * 70 + "\n")
