"""
Seed Adapted Datasets into Local MongoDB
=========================================
Imports the 1,300 newly created records into MongoDB database 'fraud_detection'
Collections:
  - transactions (Unified collection queried by the backend and UI)
  - upi_transactions (Dedicated UPI collection)
  - card_transactions (Dedicated Card collection)
"""

import os
import json
import sys
from pymongo import MongoClient

BASE_DIR = r"c:\Users\Shree Skanda V\Downloads\Final_Year_Project-main"
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")

SEED_FILE = os.path.join(DATASET_DIR, "all_transactions_seed.json")
UPI_FILE = os.path.join(DATASET_DIR, "upi_fraud_dataset.json")
CARD_FILE = os.path.join(DATASET_DIR, "card_fraud_dataset.json")

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = "fraud_detection"

def seed_mongodb():
    print(f"[*] Connecting to MongoDB at {MONGO_URI}...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=4000)
        # Trigger connection check
        client.admin.command('ping')
        print(f"[+] Connected to MongoDB successfully!")
    except Exception as e:
        print(f"[-] Could not connect with 'localhost', trying '127.0.0.1'...")
        try:
            client = MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=4000)
            client.admin.command('ping')
            print(f"[+] Connected to MongoDB via 127.0.0.1 successfully!")
        except Exception as e2:
            print(f"[FAIL] MongoDB connection failed: {e2}")
            return False

    db = client[DB_NAME]
    
    # 1. Seed Unified transactions
    print(f"[*] Ingesting unified transactions into '{DB_NAME}.transactions'...")
    with open(SEED_FILE, "r") as f:
        unified_data = json.load(f)
        
    coll_tx = db["transactions"]
    # Create unique index on tx_id
    coll_tx.create_index("tx_id", unique=True)
    
    upsert_count = 0
    for doc in unified_data:
        coll_tx.update_one({"tx_id": doc["tx_id"]}, {"$set": doc}, upsert=True)
        upsert_count += 1
    print(f"[+] Upserted {upsert_count} records into collection 'transactions'.")

    # 2. Seed upi_transactions
    print(f"[*] Ingesting UPI transactions into '{DB_NAME}.upi_transactions'...")
    with open(UPI_FILE, "r") as f:
        upi_data = json.load(f)
    coll_upi = db["upi_transactions"]
    coll_upi.create_index("tx_id", unique=True)
    for doc in upi_data:
        coll_upi.update_one({"tx_id": doc["tx_id"]}, {"$set": doc}, upsert=True)
    print(f"[+] Upserted {len(upi_data)} records into collection 'upi_transactions'.")

    # 3. Seed card_transactions
    print(f"[*] Ingesting Card transactions into '{DB_NAME}.card_transactions'...")
    with open(CARD_FILE, "r") as f:
        card_data = json.load(f)
    coll_card = db["card_transactions"]
    coll_card.create_index("tx_id", unique=True)
    for doc in card_data:
        coll_card.update_one({"tx_id": doc["tx_id"]}, {"$set": doc}, upsert=True)
    print(f"[+] Upserted {len(card_data)} records into collection 'card_transactions'.")

    # Verification counts
    print("\n" + "=" * 60)
    print(f"  MongoDB Database: '{DB_NAME}' Summary")
    print("=" * 60)
    print(f"  - 'transactions' count:       {coll_tx.count_documents({})}")
    print(f"  - 'upi_transactions' count:   {coll_upi.count_documents({})}")
    print(f"  - 'card_transactions' count:  {coll_card.count_documents({})}")
    print("=" * 60 + "\n")
    return True

if __name__ == "__main__":
    success = seed_mongodb()
    if not success:
        sys.exit(1)
