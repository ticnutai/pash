import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_FILE   = r"scripts\google-play-service-account.json"
PACKAGE    = "com.torahapp.pash"
TRACK      = sys.argv[1] if len(sys.argv) > 1 else "production"
VERSION    = sys.argv[2] if len(sys.argv) > 2 else "14"

SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

print(f"  Package : {PACKAGE}")
print(f"  Track   : {TRACK}")
print(f"  Version : {VERSION}")
print()

creds   = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
eid  = edit["id"]
print(f"  Edit ID : {eid}")

# Promote existing version to target track (no upload)
service.edits().tracks().update(
    packageName=PACKAGE,
    editId=eid,
    track=TRACK,
    body={
        "releases": [{
            "versionCodes": [VERSION],
            "status": "completed",
            "releaseNotes": [
                {"language": "he-IL", "text": "v1.6.0 - מערכת תזכורות משופרת: תזכורות מרובות עם תזמון, פופ-אפ באפליקציה, בחירת ימים, הפעלה אוטומטית בהתקנה. התראות נייטיב לאנדרואיד."},
                {"language": "en-US", "text": "v1.6.0 - Enhanced reminder system: multiple reminders with scheduling, in-app popup, day picker, auto-enable on install. Native Android notifications."},
            ]
        }]
    }
).execute()
print(f"  Track '{TRACK}' updated")

service.edits().commit(packageName=PACKAGE, editId=eid).execute()

print()
print("  ========================================")
print(f"  SUCCESS! Version {VERSION} promoted to {TRACK}")
print("  ========================================")
