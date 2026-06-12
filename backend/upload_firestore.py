import firebase_admin
import pandas as pd

from firebase_admin import credentials
from firebase_admin import firestore

cred = credentials.Certificate("serviceAccountKey.json")

firebase_admin.initialize_app(cred)

db = firestore.client()

# ---------------------
# Bid History
# ---------------------

bid_df = pd.read_csv("bid_history.csv", skiprows=2)

for _, row in bid_df.iterrows():

    db.collection("bid_history").document(
        str(row["Bid ID"])
    ).set(row.to_dict())

print("Bid history uploaded")

# ---------------------
# Capability Library
# ---------------------

cap_df = pd.read_csv("capability_library.csv", skiprows=2)

for _, row in cap_df.iterrows():

    db.collection("capability_library").document(
        str(row["Cap ID"])
    ).set(row.to_dict())

print("Capabilities uploaded")