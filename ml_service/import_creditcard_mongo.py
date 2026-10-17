"""
Script to import the creditcard dataset into MongoDB Atlas.
Uses batch processing for high throughput and reliability.
"""
import os
import sys
import time
import pandas as pd
from pymongo import MongoClient

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://usharamineni3_db_user:QtynolJOQRBFY3oW@cluster0.iezawh1.mongodb.net/fraud_detection?retryWrites=true&w=majority&appName=Cluster0"
)
DB_NAME = os.getenv("DB_NAME", "fraud_detection")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "credit_card_transactions")
CSV_PATH = os.getenv("CSV_PATH", os.path.join(os.path.dirname(__file__), "..", "creditcard.csv"))

def import_dataset(chunk_size=5000, max_records=None):
    print(f"[*] Connecting to MongoDB Atlas...")
    try:
        client = MongoClient(
            MONGODB_URI, 
            serverSelectionTimeoutMS=15000,
            tlsAllowInvalidCertificates=True
        )
        client.admin.command('ping')
        print("[+] Successfully connected to MongoDB Atlas!")
    except Exception as e:
        print(f"[-] MongoDB Connection Error: {e}")
        print("[-] Please ensure that Network Access on MongoDB Atlas is set to allow 0.0.0.0/0 (anywhere).")
        return False

    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    # Check existing count
    existing_count = collection.count_documents({})
    print(f"[*] Current documents in '{COLLECTION_NAME}': {existing_count}")

    if not os.path.exists(CSV_PATH):
        print(f"[-] Error: Dataset file not found at {CSV_PATH}")
        return False

    file_size_mb = os.path.getsize(CSV_PATH) / (1024 * 1024)
    print(f"[*] Reading dataset: {CSV_PATH} ({file_size_mb:.2f} MB)")

    # Create indexes for fast queries
    print("[*] Ensuring indexes on Class, Amount, Time, and card_type...")
    collection.create_index("Class")
    collection.create_index("Amount")
    collection.create_index("Time")
    collection.create_index("card_type")

    total_inserted = 0
    start_time = time.time()

    print(f"[*] Starting batch ingestion in chunks of {chunk_size}...")
    chunk_reader = pd.read_csv(CSV_PATH, chunksize=chunk_size)

    for i, chunk in enumerate(chunk_reader):
        # Convert numeric types appropriately
        records = chunk.to_dict(orient="records")
        for r in records:
            # Normalize Class to integer and tag card_type
            r["Class"] = int(r["Class"])
            r["is_fraud"] = bool(r["Class"] == 1)
            r["card_type"] = "DEBIT_CARD" if int(r.get("Time", 0)) % 2 == 0 else "CREDIT_CARD"

        try:
            collection.insert_many(records, ordered=False)
            total_inserted += len(records)
            elapsed = time.time() - start_time
            rate = total_inserted / elapsed if elapsed > 0 else 0
            print(f"    -> Ingested {total_inserted} records... ({rate:.0f} rec/sec)")
        except Exception as insert_err:
            print(f"[-] Warning on chunk {i}: {insert_err}")

        if max_records and total_inserted >= max_records:
            print(f"[*] Reached specified record limit: {max_records}")
            break

    elapsed_total = time.time() - start_time
    final_count = collection.count_documents({})
    fraud_count = collection.count_documents({"Class": 1})
    legit_count = collection.count_documents({"Class": 0})

    print(f"\n[+] Ingestion Complete in {elapsed_total:.2f}s!")
    print(f"    - Total Documents in MongoDB: {final_count}")
    print(f"    - Legitimate Transactions (Class 0): {legit_count}")
    print(f"    - Fraudulent Transactions (Class 1): {fraud_count}")
    return True

if __name__ == "__main__":
    # If a limit argument is provided, e.g. python import_creditcard_mongo.py 50000
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    import_dataset(chunk_size=5000, max_records=limit)
