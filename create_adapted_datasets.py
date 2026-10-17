"""
Create Adapted Datasets for UPI and Credit/Debit Card Fraud Detection
====================================================================
Transforms the raw source datasets in Dataset/ into structured datasets
strictly matching the input fields and forensic features of the application.
Generates 650 records each (between 500-800 rows):
  - Dataset/upi_fraud_dataset.csv & .json
  - Dataset/card_fraud_dataset.csv & .json
  - Dataset/all_transactions_seed.json
"""

import os
import json
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Set seeds for reproducibility
random.seed(42)
np.random.seed(42)

BASE_DIR = r"c:\Users\Shree Skanda V\Downloads\Final_Year_Project-main"
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")
RAW_UPI_CSV = os.path.join(DATASET_DIR, "fraud_dataset.csv")
RAW_CARD_CSV = os.path.join(DATASET_DIR, "creditcard.csv")

def luhn_checksum(card_number_str):
    """Calculates whether a card number passes the Luhn checksum."""
    digits = [int(d) for d in card_number_str if d.isdigit()]
    if len(digits) < 13:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, d in enumerate(reverse_digits):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0

def generate_valid_card_number(prefix="4", length=16):
    """Generates a valid credit card number that passes Luhn."""
    number = prefix
    while len(number) < length - 1:
        number += str(random.randint(0, 9))
    
    # Calculate check digit
    digits = [int(d) for d in number]
    checksum = 0
    reverse_digits = digits[::-1]
    for i, d in enumerate(reverse_digits):
        # Since check digit is at index 0 in full reversed, these are odd positions in full reversed
        if i % 2 == 0:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    check_digit = (10 - (checksum % 10)) % 10
    return number + str(check_digit)

def generate_invalid_card_number(prefix="4", length=16):
    """Generates an invalid card number that fails Luhn (Counterfeit clone)."""
    valid = generate_valid_card_number(prefix, length)
    # Flip the last digit so it definitely fails Luhn
    last_digit = int(valid[-1])
    bad_last = (last_digit + 1) % 10
    return valid[:-1] + str(bad_last)

def process_upi_dataset():
    print("[*] Processing UPI Fraud Dataset...")
    df_raw = pd.read_csv(RAW_UPI_CSV)
    
    # Target: 650 records (520 legit Class 0, 130 fraud Class 1)
    df_legit = df_raw[df_raw['is_fraud'] == 0].sample(n=520, random_state=42)
    df_fraud = df_raw[df_raw['is_fraud'] == 1].sample(n=130, random_state=42)
    df_combined = pd.concat([df_legit, df_fraud]).sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    indian_first_names = [
        "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Muhammad", "Sai", "Ayaan", "Krishna",
        "Ishaan", "Shaurya", "Atharva", "Advik", "Pranav", "Advaith", "Aaryan", "Dhruv", "Kabir", "Ritvik",
        "Ananya", "Diya", "Saanvi", "Aanya", "Aadhya", "Pari", "Anika", "Navya", "Angel", "Myra",
        "Sara", "Isha", "Riya", "Avni", "Ahana", "Sneha", "Pooja", "Priya", "Neha", "Divya",
        "Rahul", "Rohan", "Amit", "Vikram", "Suresh", "Rajesh", "Deepak", "Sunil", "Manish", "Gaurav"
    ]
    
    indian_last_names = [
        "Sharma", "Verma", "Patel", "Gupta", "Singh", "Kumar", "Mishra", "Shah", "Reddy", "Nair",
        "Joshi", "Iyer", "Choudhary", "Mehta", "Bhat", "Deshmukh", "Kulkarni", "Banerjee", "Chatterjee", "Mukherjee"
    ]
    
    vpa_handles = ["okaxis", "okhdfcbank", "ybl", "paytm", "oksbi", "icici", "ibl", "barodampay"]
    
    legit_merchants = [
        ("flipkart", "flipkart@icici", "E-Commerce"),
        ("swiggy", "swiggy@axisbank", "Food Delivery"),
        ("zomato", "zomato@hdfcbank", "Food Delivery"),
        ("amazon_pay", "amazonpay@apl", "E-Commerce"),
        ("dmart_retail", "dmart.store@sbi", "Supermarket"),
        ("irctc", "irctc@sbi", "Rail Booking"),
        ("tata_neu", "tata.neu@hdfcbank", "Retail"),
        ("reliance_smart", "reliance.retail@ybl", "Supermarket"),
        ("uber_india", "uber.india@icici", "Rides"),
        ("bescom_utility", "electric.bill@bescom", "Utilities"),
        ("apollo_pharmacy", "apollo.meds@axisbank", "Pharmacy"),
        ("bookmyshow", "tickets@bms", "Entertainment")
    ]
    
    fraud_merchants = [
        ("lottery_claim", "lottery.prize.claim@paytm", "Gambling/Lottery Scam"),
        ("sbi_kyc_verification", "sbi.kyc.verification@fakeybl", "Phishing KYC Impersonation"),
        ("crypto_refund_desk", "crypto.refund.desk@okhdfc", "Investment Scam"),
        ("urgent_helpline", "urgent.support.help@ybl", "Tech Support Fraud"),
        ("reward_redemption", "reward.points.redeem@okaxis", "Gift Card Scam"),
        ("instant_loan_desk", "instant.loan.settlement@paytm", "Illegal Loan App Extortion"),
        ("kbc_jackpot_hq", "kbc.jackpot.headquarters@ybl", "KBC Lottery Scam"),
        ("electricity_rebill", "electricity.rebill.urgent@sbi", "Power Disconnection Scam")
    ]
    
    phishing_urls = [
        "https://bit.ly/sbi-kyc-verify-urgent",
        "https://tinyurl.com/claim-5000-cashback-upi",
        "http://secure-update-phonepe.xyz/verify",
        "https://reward-points-redemption.in/login",
        "http://kyc-verification-gateway-live.com/auth",
        "https://bit.ly/electricity-bill-discount-pay",
        "http://gpay-scratch-card-win.top/claim",
        "https://update-pan-aadhaar-link-online.com/sbi"
    ]
    
    records = []
    base_time = datetime(2026, 10, 16, 10, 0, 0)
    
    for i, row in df_combined.iterrows():
        is_fraud = int(row['is_fraud'])
        first = random.choice(indian_first_names)
        last = random.choice(indian_last_names)
        user_name = f"{first} {last}"
        handle = random.choice(vpa_handles)
        sender_vpa = f"{first.lower()}.{last.lower()}{random.randint(10, 99)}@{handle}"
        
        # ID generation
        id_type = random.choice(["phonepe", "gpay", "generic"])
        if id_type == "phonepe":
            tx_id = f"T241016{random.randint(100000000000, 999999999999)}"
            tx_type = "UPI (PhonePe)"
        elif id_type == "gpay":
            tx_id = str(random.randint(400000000000, 499999999999))
            tx_type = "UPI (Google Pay)"
        else:
            tx_id = f"UPI2410{random.randint(10000000, 99999999)}"
            tx_type = "UPI"
            
        # Timestamp
        tx_time = base_time - timedelta(minutes=random.randint(1, 43200))
        time_hour = tx_time.hour
        
        reasons = []
        
        if is_fraud == 1:
            # Fraud characteristics
            merch_tuple = random.choice(fraud_merchants)
            receiver_vpa = merch_tuple[1]
            merch_id = merch_tuple[0]
            
            # 60% chance of high amount
            if random.random() < 0.65:
                amount = round(random.uniform(25000, 95000), 2)
                reasons.append("High-value transaction anomaly for this account profile")
            else:
                amount = round(random.uniform(1500, 15000), 2)
                
            # 65% chance of phishing URL
            if random.random() < 0.65:
                url = random.choice(phishing_urls)
                reasons.append("Suspicious URL pattern detected: bit.ly / tinyurl / kyc update")
            else:
                url = ""
                
            # 55% chance of OTP shared
            if random.random() < 0.55:
                otp_shared = True
                reasons.append("CRITICAL: OTP sharing detected (Social Engineering vector)")
            else:
                otp_shared = False
                
            file_attached = random.choice([True, False])
            if file_attached:
                reasons.append("Forensic OCR: Detected keywords 'URGENT', 'BLOCK', 'REWARD' in screenshot")
                
            distance = round(random.uniform(65, 450), 1)
            if distance > 100:
                reasons.append(f"Irregular geographic location ({distance:.0f} km from home)")
                
            velocity = random.randint(3, 9)
            if velocity > 5:
                reasons.append(f"High transaction velocity detected ({velocity} attempts in 10 mins)")
                
            risk_score = round(min(0.68 + random.uniform(0.10, 0.30), 0.99), 4)
            if not reasons:
                reasons.append("Anomalous behavioral transaction velocity and destination risk profile")
        else:
            # Legit characteristics
            merch_tuple = random.choice(legit_merchants)
            receiver_vpa = merch_tuple[1]
            merch_id = merch_tuple[0]
            amount = round(random.uniform(25, 4500), 2)
            url = ""
            otp_shared = False
            file_attached = False
            distance = round(random.uniform(0.5, 18.0), 1)
            velocity = random.choice([1, 1, 1, 2])
            risk_score = round(random.uniform(0.01, 0.15), 4)
            reasons = ["Consistent user pattern and verified merchant channel"]

        record = {
            "tx_id": tx_id,
            "type": tx_type,
            "sender_upi": sender_vpa,
            "receiver_upi": receiver_vpa,
            "user_id": sender_vpa,
            "merchant_id": merch_id,
            "amount": amount,
            "url": url,
            "otp_shared": otp_shared,
            "file_attached": file_attached,
            "distance": distance,
            "velocity": velocity,
            "time_hour": time_hour,
            "timestamp": tx_time.isoformat(),
            "is_fraud": bool(is_fraud),
            "risk_score": risk_score,
            "reasons": reasons
        }
        records.append(record)

    out_csv = os.path.join(DATASET_DIR, "upi_fraud_dataset.csv")
    out_json = os.path.join(DATASET_DIR, "upi_fraud_dataset.json")
    
    df_out = pd.DataFrame(records)
    # Save reasons as semicolon-separated string for clean CSV viewing
    df_out_csv = df_out.copy()
    df_out_csv['reasons'] = df_out_csv['reasons'].apply(lambda r: "; ".join(r) if isinstance(r, list) else r)
    df_out_csv.to_csv(out_csv, index=False)
    
    with open(out_json, "w") as f:
        json.dump(records, f, indent=2)
        
    print(f"[+] UPI Dataset Created: {len(records)} records (Legit: {sum(1 for r in records if not r['is_fraud'])}, Fraud: {sum(1 for r in records if r['is_fraud'])})")
    print(f"    CSV: {out_csv}")
    print(f"    JSON: {out_json}")
    return records

def process_card_dataset():
    print("[*] Processing Credit/Debit Card Fraud Dataset...")
    df_raw = pd.read_csv(RAW_CARD_CSV)
    
    # Target: 650 records (520 legit Class 0, 130 fraud Class 1)
    df_legit = df_raw[df_raw['Class'] == 0].sample(n=520, random_state=42)
    df_fraud = df_raw[df_raw['Class'] == 1].sample(n=130, random_state=42)
    df_combined = pd.concat([df_legit, df_fraud]).sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    holder_names = [
        "PRIYA SHARMA", "RAJESH KUMAR", "AMIT PATEL", "NEHA GUPTA", "SUNIL VERMA",
        "DEEPAK NAIR", "POOJA MEHTA", "VIKRAM CHOUDHARY", "ANANYA REDDY", "ROHIT JOSHI",
        "KAVITA IYER", "SANJAY DESHMUKH", "MANISH BHAT", "RITU KULKARNI", "ARJUN RAO",
        "SHREEYA MENON", "ABHISHEK SINGH", "SNEHA CHATTERJEE", "VIVEK AGARWAL", "DIVYA NAIDU"
    ]
    
    expiries = ["05/27", "12/28", "09/26", "03/29", "11/27", "08/30", "04/26", "01/28", "10/29"]
    
    merchants_legit = [
        "AMAZON_INDIA", "FLIPKART_RETAIL", "SHELL_FUEL_MUMBAI", "CROMA_ELECTRONICS",
        "STARBUCKS_DELHI", "APOLLO_PHARMACY", "BIG_BASKET_BLR", "TAJ_HOTEL_GOA",
        "INDIAN_OIL_PUMP", "MAKEMYTRIP_TRAVEL", "ZARA_PHOENIX_MALL", "DECATHLON_SPORTS"
    ]
    
    merchants_fraud = [
        "UNKNOWN_POS_FOREIGN", "OFFSHORE_GAMBLING_MALTA", "CRYPTO_EXCHANGE_BV",
        "FAST_CASH_DISPENSE_MOSCOW", "LUXURY_JEWELRY_DUBAI_UNV", "ANONYMOUS_VPN_BULGARIA",
        "BULK_ELECTRONICS_GUANGZHOU", "DARK_TERMINAL_ATM_B2"
    ]
    
    records = []
    base_time = datetime(2026, 10, 16, 11, 0, 0)
    
    for idx, row in df_combined.iterrows():
        is_fraud = int(row['Class'])
        card_type = random.choice(["CREDIT_CARD", "CREDIT_CARD", "DEBIT_CARD"])
        tx_id = f"CARD-2410-{idx+1:04d}"
        holder = random.choice(holder_names)
        expiry = random.choice(expiries)
        cvv = f"{random.randint(100, 999)}"
        tx_time = base_time - timedelta(minutes=random.randint(1, 43200))
        time_hour = tx_time.hour
        
        # Card number brand selection
        brand_prefix = random.choice(["4", "51", "55", "60", "65", "37"])
        
        reasons = []
        
        if is_fraud == 1:
            # 20% chance of failing Luhn (Counterfeit Card)
            if random.random() < 0.22:
                card_number = generate_invalid_card_number(brand_prefix, 16 if brand_prefix != "37" else 15)
                reasons.append("CRITICAL: Failed Luhn algorithm checksum (Counterfeit or Malformed Card)")
            else:
                card_number = generate_valid_card_number(brand_prefix, 16 if brand_prefix != "37" else 15)
                
            # Amount: use or scale
            raw_amt = float(row['Amount'])
            if raw_amt < 10:
                amount = round(random.uniform(35000, 92000), 2)
            else:
                amount = round(raw_amt * 12.5 if raw_amt < 5000 else raw_amt, 2)
                
            if amount > 50000:
                reasons.append(f"Excessive transaction volume anomaly (INR {amount:,.2f})")
            elif amount > 25000:
                reasons.append(f"Elevated amount exceeding typical cardholder baseline (INR {amount:,.2f})")
                
            velocity = random.randint(4, 9)
            if velocity >= 5:
                reasons.append(f"High velocity swipe pattern: {velocity} authorization attempts in < 10 mins")
                
            distance = round(random.uniform(75, 490), 1)
            if distance > 200:
                reasons.append(f"Geographic distance anomaly: {distance:.0f}km from card billing address")
                
            is_international = random.random() < 0.45
            if is_international:
                reasons.append("Cross-border / International payment channel triggered")
                
            merchant = random.choice(merchants_fraud)
            risk_score = round(min(0.70 + random.uniform(0.08, 0.28), 0.99), 4)
            if not reasons:
                reasons.append("Ensemble classifier detected pattern matching historical fraud vectors")
        else:
            card_number = generate_valid_card_number(brand_prefix, 16 if brand_prefix != "37" else 15)
            amount = round(max(float(row['Amount']) * 8.5, random.uniform(120, 7500)), 2)
            velocity = random.choice([1, 1, 1, 2])
            distance = round(random.uniform(0.5, 25.0), 1)
            is_international = random.random() < 0.04
            merchant = random.choice(merchants_legit)
            risk_score = round(random.uniform(0.01, 0.15), 4)
            reasons = ["Cardholder pattern verified with normal risk boundaries"]
            
        record = {
            "tx_id": tx_id,
            "type": card_type,
            "card_type": card_type,
            "number": card_number,
            "holder_name": holder,
            "expiry": expiry,
            "cvv": cvv,
            "amount": amount,
            "velocity": velocity,
            "distance": distance,
            "is_international": is_international,
            "time_hour": time_hour,
            "timestamp": tx_time.isoformat(),
            "user_id": holder.lower().replace(" ", "."),
            "merchant_id": merchant,
            "Time": float(row['Time']),
            "is_fraud": bool(is_fraud),
            "risk_score": risk_score,
            "reasons": reasons
        }
        # Add V1..V28 PCA features for direct model evaluation
        for k in range(1, 29):
            record[f"V{k}"] = float(row[f"V{k}"])
            
        records.append(record)

    out_csv = os.path.join(DATASET_DIR, "card_fraud_dataset.csv")
    out_json = os.path.join(DATASET_DIR, "card_fraud_dataset.json")
    
    df_out = pd.DataFrame(records)
    df_out_csv = df_out.copy()
    df_out_csv['reasons'] = df_out_csv['reasons'].apply(lambda r: "; ".join(r) if isinstance(r, list) else r)
    df_out_csv.to_csv(out_csv, index=False)
    
    with open(out_json, "w") as f:
        json.dump(records, f, indent=2)
        
    print(f"[+] Card Dataset Created: {len(records)} records (Legit: {sum(1 for r in records if not r['is_fraud'])}, Fraud: {sum(1 for r in records if r['is_fraud'])})")
    print(f"    CSV: {out_csv}")
    print(f"    JSON: {out_json}")
    return records

def generate_unified_seed(upi_records, card_records):
    print("[*] Generating Unified Seed for MongoDB...")
    unified_records = []
    
    for r in upi_records:
        doc = {
            "tx_id": r["tx_id"],
            "type": r["type"],
            "amount": r["amount"],
            "user_id": r["user_id"],
            "merchant_id": r["merchant_id"],
            "timestamp": r["timestamp"],
            "sender_upi": r["sender_upi"],
            "receiver_upi": r["receiver_upi"],
            "url": r["url"],
            "otp_shared": r["otp_shared"],
            "file_attached": r["file_attached"],
            "distance": r["distance"],
            "velocity": r["velocity"],
            "time_hour": r["time_hour"],
            "analysis": {
                "is_fraud": r["is_fraud"],
                "risk_score": r["risk_score"],
                "reasons": r["reasons"],
                "model_used": "Heuristic Forensic Engine"
            }
        }
        unified_records.append(doc)
        
    for r in card_records:
        doc = {
            "tx_id": r["tx_id"],
            "type": r["type"],
            "card_type": r["card_type"],
            "amount": r["amount"],
            "user_id": r["user_id"],
            "merchant_id": r["merchant_id"],
            "timestamp": r["timestamp"],
            "number": r["number"],
            "holder_name": r["holder_name"],
            "expiry": r["expiry"],
            "cvv": r["cvv"],
            "velocity": r["velocity"],
            "distance": r["distance"],
            "is_international": r["is_international"],
            "time_hour": r["time_hour"],
            "Time": r["Time"],
            "analysis": {
                "is_fraud": r["is_fraud"],
                "risk_score": r["risk_score"],
                "reasons": r["reasons"],
                "model_used": "Random Forest + SVM Ensemble"
            }
        }
        # Include PCA columns
        for k in range(1, 29):
            doc[f"V{k}"] = r[f"V{k}"]
        unified_records.append(doc)
        
    seed_path = os.path.join(DATASET_DIR, "all_transactions_seed.json")
    with open(seed_path, "w") as f:
        json.dump(unified_records, f, indent=2)
    print(f"[+] Unified MongoDB Seed File created: {seed_path} ({len(unified_records)} total transactions)")

if __name__ == "__main__":
    upi_recs = process_upi_dataset()
    card_recs = process_card_dataset()
    generate_unified_seed(upi_recs, card_recs)
    print("\n[SUCCESS] All datasets generated cleanly with 650 rows each (500-800 range)!")
