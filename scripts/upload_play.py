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
                {"language": "he-IL", "text": "הוספת 8 מפרשים: רש\"י, רמב\"ן, אבן עזרא, ספורנו, אור החיים, כלי יקר, חזקוני, מלבי\"ם. תיקון תצוגה ושיפורי ביצועים"},
                {"language": "en-US", "text": "Added 8 commentators: Rashi, Ramban, Ibn Ezra, Sforno, Or HaChaim, Kli Yakar, Chizkuni, Malbim. Display fixes and performance improvements"},
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
