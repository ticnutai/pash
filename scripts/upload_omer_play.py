import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

KEY_FILE   = r"scripts\google-play-service-account.json"
PACKAGE    = "com.torahapp.omer"
AAB_PATH   = r"android-omer\app\build\outputs\bundle\release\omer-sfirat-haomer-v1.1-release.aab"
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
                {"language": "he-IL", "text": "v1.1 - תפילות מורחבות (לשם ייחוד, יהי נועם, יושב בסתר), אנימציית קונפטי, מצב לילה אוטומטי, שיתוף נייטיב, תצוגת לוח שנה חודשי, ווידג'ט למסך הבית."},
                {"language": "en-US", "text": "v1.1 - Extended prayers (Leshem Yichud, Vihi Noam, Yoshev b'Seter), confetti animation, auto dark mode, native sharing, calendar month view, home screen widget."},
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
