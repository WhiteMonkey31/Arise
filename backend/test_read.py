# test_read.py

import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

docs = db.collection("bid_history").limit(5).stream()

for doc in docs:
    print(doc.id)
    print(doc.to_dict())
    print()