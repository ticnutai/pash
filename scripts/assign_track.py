from google.oauth2 import service_account
from googleapiclient.discovery import build
import sys

KEY_FILE = r"scripts\google-play-service-account.json"
PACKAGE  = "com.torahapp.pash"
SCOPES   = ["https://www.googleapis.com/auth/androidpublisher"]
TRACK    = sys.argv[1] if len(sys.argv) > 1 else "alpha"
VC       = sys.argv[2] if len(sys.argv) > 2 else "4"

creds   = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
eid  = edit["id"]

service.edits().tracks().update(
    packageName=PACKAGE,
    editId=eid,
    track=TRACK,
    body={
        "releases": [{
            "versionCodes": [VC],
            "status": "completed",
            "releaseNotes": [
                {"language": "he-IL", "text": "גרסה 1.4.0 - שיפורי ביצועים ותיקוני באגים"},
                {"language": "en-US", "text": "Version 1.4.0 - Performance improvements and bug fixes"},
            ]
        }]
    }
).execute()

service.edits().commit(packageName=PACKAGE, editId=eid).execute()
print(f"SUCCESS - versionCode {VC} assigned to track: {TRACK}")
