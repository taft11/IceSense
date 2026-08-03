import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

# 1. Initialize Firebase Admin SDK
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# 2. File and Collection Configuration
CSV_FILE_PATH = "historical_ice_demand.csv"
COLLECTION_NAME = "daily_analytics"  # Firestore collection name

def import_csv_to_firestore():
    # Read CSV file using pandas
    df = pd.read_csv(CSV_FILE_PATH)
    
    # Firestore supports batch writes up to 500 documents per batch
    batch = db.batch()
    count = 0
    total_imported = 0
    
    print(f"Starting import of {len(df)} records into '{COLLECTION_NAME}'...")

    for index, row in df.iterrows():
        # Convert row to dictionary
        data = row.to_dict()
        
        # Ensure correct data types for new metrics
        data['total_kg_demanded'] = int(data['total_kg_demanded'])
        data['total_kg_produced'] = int(data['total_kg_produced'])
        data['avg_temperature_c'] = float(data['avg_temperature_c'])
        data['is_payday_weekend'] = bool(data['is_payday_weekend'])
        
        # Variant quantities
        data['bags_5kg'] = int(data['bags_5kg'])
        data['sacks_35kg'] = int(data['sacks_35kg'])
        data['sacks_40kg'] = int(data['sacks_40kg'])
        data['sacks_50kg'] = int(data['sacks_50kg'])
        data['crates_70kg'] = int(data['crates_70kg'])
        
        # Use the date string as the Document ID (e.g., '2025-08-01')
        doc_ref = db.collection(COLLECTION_NAME).document(str(data['date']))
        batch.set(doc_ref, data)
        
        count += 1
        total_imported += 1
        
        # Commit batch every 400 records to stay well within limits
        if count == 400:
            batch.commit()
            print(f"Committed batch of {count} records...")
            batch = db.batch() # Reset batch
            count = 0

    # Commit any remaining items in the batch
    if count > 0:
        batch.commit()
        print(f"Committed final batch of {count} records.")

    print(f"✅ Successfully imported {total_imported} records to Firestore!")

if __name__ == "__main__":
    import_csv_to_firestore()