from google.oauth2 import service_account
from googleapiclient.discovery import build
import json

KEY_FILE = r"scripts\google-play-service-account.json"
PACKAGE  = "com.torahapp.pash"
SCOPES   = ["https://www.googleapis.com/auth/androidpublisher"]

creds   = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

print("=== REVIEWS ===")
try:
    result = service.reviews().list(packageName=PACKAGE, maxResults=20).execute()
    reviews = result.get("reviews", [])
    if not reviews:
        print("No reviews found.")
    for r in reviews:
        comments = r.get("comments", [])
        for c in comments:
            uc = c.get("userComment", {})
            rating = uc.get("starRating", "?")
            text   = uc.get("text", "")
            print(f"\n⭐ {rating}/5")
            print(f"   {text[:300]}")
            dr = c.get("developerComment", {})
            if dr:
                print(f"   [Dev reply]: {dr.get('text','')[:200]}")
except Exception as e:
    print(f"Reviews error: {e}")

print("\n=== APP INFO ===")
try:
    edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
    eid  = edit["id"]
    
    tracks = service.edits().tracks().list(packageName=PACKAGE, editId=eid).execute()
    for t in tracks.get("tracks", []):
        track_name = t.get("track")
        for rel in t.get("releases", []):
            vc    = rel.get("versionCodes", [])
            status = rel.get("status")
            print(f"  Track: {track_name} | Status: {status} | VersionCodes: {vc}")
    
    # Cancel edit (don't commit)
    service.edits().delete(packageName=PACKAGE, editId=eid).execute()
except Exception as e:
    print(f"App info error: {e}")
