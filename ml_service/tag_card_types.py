from pymongo import MongoClient

uri = 'mongodb+srv://usharamineni3_db_user:QtynolJOQRBFY3oW@cluster0.iezawh1.mongodb.net/fraud_detection?retryWrites=true&w=majority&appName=Cluster0'
client = MongoClient(uri, serverSelectionTimeoutMS=10000, tlsAllowInvalidCertificates=True)
db = client['fraud_detection']
collection = db['credit_card_transactions']

print("[*] Tagging transactions with CREDIT_CARD and DEBIT_CARD classifications...")

# Partition by Time parity to represent both Credit Card and Debit Card portfolios
collection.update_many({"Time": {"$mod": [2, 0]}}, {"$set": {"card_type": "DEBIT_CARD"}})
collection.update_many({"Time": {"$mod": [2, 1]}}, {"$set": {"card_type": "CREDIT_CARD"}})

# Create an index on card_type for ultra-fast filtering
collection.create_index("card_type")

debit_count = collection.count_documents({"card_type": "DEBIT_CARD"})
credit_count = collection.count_documents({"card_type": "CREDIT_CARD"})
debit_fraud = collection.count_documents({"card_type": "DEBIT_CARD", "Class": 1})
credit_fraud = collection.count_documents({"card_type": "CREDIT_CARD", "Class": 1})

print(f"[+] Successfully Tagged in MongoDB:")
print(f"    - Debit Card Transactions:  {debit_count:,} (Frauds: {debit_fraud})")
print(f"    - Credit Card Transactions: {credit_count:,} (Frauds: {credit_fraud})")
print(f"    - Total:                    {debit_count + credit_count:,}")
