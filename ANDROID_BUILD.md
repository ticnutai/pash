# בניית אפליקציית אנדרויד - חמישה חומשי תורה

## דרישות מוקדמות

| דרישה | התקנה |
|--------|--------|
| Node.js 18+ | https://nodejs.org |
| Java JDK 17+ | https://adoptium.net |
| Android Studio | https://developer.android.com/studio |
| Python 3.8+ | https://python.org (להעלאה לגוגל פליי) |

**הגדרת Android SDK:**
1. פתח Android Studio
2. SDK Manager > SDK Platforms > Android 14 (API 34)
3. SDK Tools > Android SDK Build-Tools, Command-line Tools

**הגדרת משתני סביבה:**
```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17..."
```

---

## שלב 1: יצירת Keystore (פעם אחת בלבד!)

```powershell
npm run android:keystore
# או
.\scripts\generate-keystore.ps1
```

> **חשוב מאוד:** שמור את קובץ ה-Keystore והסיסמאות במקום בטוח!
> בלי ה-Keystore לא תוכל לעדכן את האפליקציה בגוגל פליי.

---

## שלב 2: בניית האפליקציה

### AAB לגוגל פליי (מומלץ):
```powershell
npm run android:build
# או
.\scripts\build-android.ps1
```

### APK להתקנה ישירה:
```powershell
npm run android:build:apk
# או
.\scripts\build-android.ps1 -apk
```

### Debug APK (ללא חתימה):
```powershell
npm run android:build:debug
# או
.\scripts\build-android.ps1 -debug
```

### בנייה עם גרסה ספציפית:
```powershell
.\scripts\build-android.ps1 -versionName "1.2.0" -versionCode 3
```

---

## שלב 3: העלאה לגוגל פליי

### הגדרת Service Account (פעם אחת):

1. **Google Play Console** → Settings → API access
2. לחץ "Create new service account"
3. ב-Google Cloud Console:
   - צור Service Account חדש
   - הוסף Role: `Service Account User`
   - Keys → Add Key → Create new key → JSON
   - הורד את קובץ ה-JSON
4. חזור ל-Google Play Console:
   - לחץ "Grant access" ליד ה-Service Account
   - הוסף הרשאות: Release to production, Manage testing tracks
5. שמור את קובץ ה-JSON בנתיב:
   ```
   scripts/google-play-service-account.json
   ```

### העלאה:

```powershell
# העלאה ל-Internal Testing (מומלץ לבדיקה ראשונית)
npm run android:upload

# העלאה ל-Beta
.\scripts\upload-google-play.ps1 -track beta

# העלאה ל-Production
npm run android:upload:prod

# בנייה + העלאה ביחד
.\scripts\upload-google-play.ps1 -track production -build

# עם הערות שחרור
.\scripts\upload-google-play.ps1 -track production -releaseNotes "תיקוני באגים ושיפורי ביצועים"
```

### העלאה ידנית (חלופה):

1. לך ל-https://play.google.com/console
2. בחר את האפליקציה
3. Production → Create new release
4. העלה את הקובץ: `android/app/build/outputs/bundle/release/app-release.aab`
5. הוסף הערות שחרור ולחץ "Review release"

---

## פקודות שימושיות

| פקודה | תיאור |
|--------|--------|
| `npm run android:sync` | בנייה + סנכרון Capacitor |
| `npm run android:open` | פתיחה ב-Android Studio |
| `npm run android:run` | התקנה והרצה על מכשיר/אמולטור |
| `npm run android:build` | בניית AAB לגוגל פליי |
| `npm run android:build:apk` | בניית APK חתום |
| `npm run android:build:debug` | בניית Debug APK |
| `npm run android:upload` | העלאה ל-Internal Testing |
| `npm run android:upload:prod` | העלאה ל-Production |
| `npm run android:keystore` | יצירת Keystore חדש |
| `npx cap sync android` | סנכרון בלבד (ללא בנייה) |

---

## מבנה הקבצים

```
scripts/
  generate-keystore.ps1        # יצירת Keystore
  build-android.ps1            # בניית APK/AAB
  upload-google-play.ps1       # העלאה לגוגל פליי
  google-play-service-account.json  # (לא ב-Git!) מפתח API

android/
  app/
    build.gradle               # הגדרות בנייה + גרסה
    signing.properties         # (לא ב-Git!) פרטי חתימה
    pashash-release.keystore   # (לא ב-Git!) מפתח חתימה
    build/outputs/
      bundle/release/app-release.aab   # AAB לגוגל פליי
      apk/release/app-release.apk      # APK חתום
      apk/debug/app-debug.apk          # Debug APK
```

---

## עדכון גרסה

לפני כל העלאה לגוגל פליי, עדכן את מספר הגרסה ב-`android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2        // חייב לעלות בכל העלאה!
    versionName "1.1.0"  // מספר גרסה ידידותי
}
```

או דרך הסקריפט:
```powershell
.\scripts\build-android.ps1 -versionName "1.1.0" -versionCode 2
```

---

## פתרון בעיות

### Gradle לא נמצא
וודא ש-Android Studio מותקן ושהגדרת `ANDROID_HOME`.

### שגיאת חתימה
וודא שקובץ `android/app/signing.properties` קיים ומכיל נתונים נכונים.
הרץ מחדש: `npm run android:keystore`

### שגיאת העלאה
- וודא ש-Service Account Key תקין
- וודא שהאפליקציה כבר נוצרה ב-Google Play Console
- וודא שה-versionCode גדול מהגרסה הקודמת
