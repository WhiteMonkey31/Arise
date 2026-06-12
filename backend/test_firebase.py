from firebase_admin import credentials

cred = credentials.Certificate("serviceAccountKey.json")

print("Firebase key loaded successfully")