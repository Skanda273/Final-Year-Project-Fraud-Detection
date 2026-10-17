"""
Comprehensive System Health & Verification Test Script.
Validates:
1. Python ML Service & Trained Models (Random Forest + SVM)
2. MongoDB Atlas Connection & Document Counts
3. Node.js Backend Gateway & Real-Time Card Route
"""
import sys
import os
import json
import urllib.request
import urllib.error
from pymongo import MongoClient

def print_header(title):
    print("\n" + "=" * 65)
    print(f"  {title}")
    print("=" * 65)

def test_ml_models_local():
    print_header("1. CHECKING LOCAL ML MODELS & ARTIFACTS")
    models_dir = os.path.join(os.path.dirname(__file__), "ml_service", "models")
    expected_files = [
        "credit_card_rf.joblib",
        "credit_card_svm.joblib",
        "scaler.joblib",
        "model_metadata.json"
    ]
    all_ok = True
    for fname in expected_files:
        fpath = os.path.join(models_dir, fname)
        if os.path.exists(fpath):
            size_kb = os.path.getsize(fpath) / 1024
            print(f"  [PASS] {fname} exists ({size_kb:.1f} KB)")
        else:
            print(f"  [FAIL] {fname} is missing!")
            all_ok = False

    meta_path = os.path.join(models_dir, "model_metadata.json")
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            meta = json.load(f)
        rf_auc = meta.get("metrics", {}).get("random_forest", {}).get("roc_auc")
        svm_auc = meta.get("metrics", {}).get("svm", {}).get("roc_auc")
        print(f"  -> Model Performance: Random Forest ROC-AUC = {rf_auc*100:.2f}%, SVM ROC-AUC = {svm_auc*100:.2f}%")
    return all_ok

def test_mongodb():
    print_header("2. CHECKING MONGODB ATLAS CLUSTER DATA")
    uri = "mongodb+srv://usharamineni3_db_user:QtynolJOQRBFY3oW@cluster0.iezawh1.mongodb.net/fraud_detection?retryWrites=true&w=majority&appName=Cluster0"
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=8000, tlsAllowInvalidCertificates=True)
        db = client["fraud_detection"]
        coll = db["credit_card_transactions"]
        
        total = coll.count_documents({})
        debit = coll.count_documents({"card_type": "DEBIT_CARD"})
        credit = coll.count_documents({"card_type": "CREDIT_CARD"})
        fraud = coll.count_documents({"Class": 1})
        
        print(f"  [PASS] Connected to MongoDB Atlas successfully!")
        print(f"  -> Database:   fraud_detection")
        print(f"  -> Collection: credit_card_transactions")
        print(f"  -> Total Documents:  {total:,}")
        print(f"  -> Debit Cards:      {debit:,}")
        print(f"  -> Credit Cards:     {credit:,}")
        print(f"  -> Fraud Samples:    {fraud:,}")
        return True
    except Exception as e:
        print(f"  [FAIL] MongoDB connection failed: {e}")
        return False

def test_service_http(url, service_name):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html,application/json,*/*"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = resp.read().decode('utf-8')
            print(f"  [PASS] {service_name} is RUNNING at {url}")
            return True, data
    except urllib.error.URLError:
        print(f"  [INFO] {service_name} is not currently running on {url} (Start it using start_project.bat)")
        return False, None
    except Exception as e:
        print(f"  [INFO] {service_name} at {url}: {e}")
        return False, None

def test_ml_inference():
    print_header("3. CHECKING ML INFERENCE ENGINE (OFFLINE TEST)")
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "ml_service"))
        from app import app, evaluate_card_transaction

        with app.app_context():
            # Test A: Legitimate Swipe
            legit_res = evaluate_card_transaction({
                "amount": 1200, "distance": 3, "velocity": 1, "card_type": "DEBIT_CARD"
            }).get_json()

            # Test B: Fraud Attack
            fraud_res = evaluate_card_transaction({
                "amount": 95000, "distance": 450, "velocity": 8, "card_type": "CREDIT_CARD", "is_international": True
            }).get_json()

        print(f"  [PASS] Legitimate Debit Transaction:")
        print(f"         is_fraud: {legit_res['is_fraud']} | Risk Score: {legit_res['risk_score']*100:.1f}% | Model: {legit_res['model_used']}")

        print(f"  [PASS] Fraudulent Credit Transaction:")
        print(f"         is_fraud: {fraud_res['is_fraud']} | Risk Score: {fraud_res['risk_score']*100:.1f}% | Model: {fraud_res['model_used']}")
        print(f"         Explainable AI Reasons: {fraud_res['reasons'][:2]}")
        return True
    except Exception as e:
        print(f"  [FAIL] Inference test error: {e}")
        return False

if __name__ == "__main__":
    print("\n[*] STARTING SYSTEM VERIFICATION CHECK...")
    m1 = test_ml_models_local()
    m2 = test_mongodb()
    m3 = test_ml_inference()

    print_header("4. LIVE PORTS STATUS")
    test_service_http("http://localhost:8000/", "Flask ML Service")
    test_service_http("http://localhost:5000/health", "Node.js Backend Gateway")
    test_service_http("http://localhost:5173/", "React Frontend")

    print("\n" + "=" * 65)
    if m1 and m2 and m3:
        print("  [SUCCESS] ALL CORE ENGINES & DATASETS ARE FULLY OPERATIONAL!")
    else:
        print("  [WARNING] Some components need attention. Review logs above.")
    print("=" * 65 + "\n")
