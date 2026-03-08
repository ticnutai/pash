import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

KEY_FILE   = r"scripts\google-play-service-account.json"
PACKAGE    = "com.torahapp.pash"
AAB_PATH   = r"android\app\build\outputs\bundle\release\app-release.aab"
TRACK      = sys.argv[1] if len(sys.argv) > 1 else "internal"

SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

print(f"  Package : {PACKAGE}")
print(f"  Track   : {TRACK}")
print(f"  AAB     : {AAB_PATH}")
print()

creds   = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

# Create edit
edit    = service.edits().insert(body={}, packageName=PACKAGE).execute()
eid     = edit["id"]
print(f"  Edit ID : {eid}")

# Upload AAB
print("  Uploading AAB...")
media  = MediaFileUpload(AAB_PATH, mimetype="application/octet-stream", resumable=True)
upload = service.edits().bundles().upload(packageName=PACKAGE, editId=eid, media_body=media).execute()
vc = upload["versionCode"]
print(f"  Version Code: {vc}")

# Assign to track
service.edits().tracks().update(
    packageName=PACKAGE,
    editId=eid,
    track=TRACK,
    body={
        "releases": [{
            "versionCodes": [str(vc)],
            "status": "completed",
            "releaseNotes": [
                {"language": "he-IL", "text": "תיקון תצוגה חשוב: Safe Area בחלק העליון והתחתון, יציבות כפתורים צפים, שיפורי ביצועים"},
                {"language": "en-US", "text": "Important display fix: Safe Area top/bottom, floating button stability, performance improvements"},
            ]
        }]
    }
).execute()
print(f"  Track '{TRACK}' updated")

# Commit
service.edits().commit(packageName=PACKAGE, editId=eid).execute()

print()
print("  ========================================")
print(f"  SUCCESS! Version {vc} uploaded to {TRACK}")
print("  ========================================")
