import glob, os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

KEY_FILE = r"scripts\google-play-service-account.json"
PACKAGE = "com.torahapp.pash"
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

# Create edit
edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
eid = edit["id"]
print(f"Edit ID: {eid}")

# Delete existing phone screenshots
try:
    service.edits().images().deleteall(
        packageName=PACKAGE, editId=eid,
        language="he-IL", imageType="phoneScreenshots"
    ).execute()
    print("Deleted old he-IL screenshots")
except Exception as e:
    print(f"Delete old he-IL: {e}")

try:
    service.edits().images().deleteall(
        packageName=PACKAGE, editId=eid,
        language="en-US", imageType="phoneScreenshots"
    ).execute()
    print("Deleted old en-US screenshots")
except Exception as e:
    print(f"Delete old en-US: {e}")

# Upload new screenshots
screenshots = sorted(glob.glob(r"google-play-upload\screenshots\0*.png"))
print(f"\nFound {len(screenshots)} screenshots to upload")

for img_path in screenshots:
    fname = os.path.basename(img_path)
    media = MediaFileUpload(img_path, mimetype="image/png")
    try:
        result = service.edits().images().upload(
            packageName=PACKAGE, editId=eid,
            language="he-IL", imageType="phoneScreenshots",
            media_body=media
        ).execute()
        img_id = result.get("image", {}).get("id", "ok")
        print(f"  Uploaded: {fname} -> {img_id}")
    except Exception as e:
        print(f"  FAILED {fname}: {e}")

# Commit
service.edits().commit(packageName=PACKAGE, editId=eid).execute()
print()
print("========================================")
print("SUCCESS! Screenshots uploaded to Google Play")
print("========================================")
