# 📱 העלאה ל-Google Play Store — חמישה חומשי תורה
## כל מה שצריך בתיקייה הזאת

---

## 📂 מבנה התיקייה

```
google-play-upload/
├── README.md                ← אתה כאן
├── STORE_LISTING.md         ← טקסטים להעתקה (שם, תיאור קצר, תיאור מלא)
├── DATA_SAFETY.md           ← תשובות לשאלון Data Safety
├── RELEASE_NOTES.md         ← הערות גרסה
├── privacy-policy.html      ← מדיניות פרטיות (צריך לאחסן בכתובת ציבורית)
├── feature_graphic.png      ← באנר 1024x500 (Feature Graphic)
├── icons/
│   └── app-icon-512x512.png ← אייקון 512x512 (עיגול + תורה)
├── screenshots/
│   ├── screenshot_1_main.png
│   ├── screenshot_2_scroll.png
│   ├── screenshot_3_nav.png
│   ├── screenshot_4_back.png
│   └── screenshot_5_landscape.png
└── aab/
    └── torah-app-release.aab ← קובץ ה-App Bundle החתום
```

---

## 🚀 שלבים להעלאה

### שלב 1: יצירת חשבון מפתח
1. כניסה ל: https://play.google.com/console
2. תשלום חד-פעמי של **$25**
3. מילוי פרטי מפתח
4. המתנה לאימות (עד 48 שעות)

### שלב 2: יצירת אפליקציה חדשה
1. לחצו **"Create app"**
2. מלאו:
   - **App name**: `חמישה חומשי תורה`
   - **Default language**: `עברית (Hebrew)`
   - **App or Game**: `App`
   - **Free or Paid**: `Free`
3. קבלו את ההצהרות → **"Create app"**

### שלב 3: Store Listing (פרטי החנות)
1. כנסו ל-**"Main store listing"**
2. העתיקו מהקובץ `STORE_LISTING.md`:
   - **App name** → שם האפליקציה
   - **Short description** → תיאור קצר
   - **Full description** → תיאור מלא
3. העלו גרפיקה:
   - **App icon** → `icons/app-icon-512x512.png` (512x512)
   - **Feature graphic** → `feature_graphic.png` (1024x500)
   - **Screenshots** → כל הקבצים מתיקיית `screenshots/`

### שלב 4: תוכן האפליקציה (App Content)
1. **Privacy policy** → העלו את `privacy-policy.html` לכתובת ציבורית והזינו את ה-URL
2. **Content rating** → עברו את השאלון:
   - אין אלימות, אין תוכן מיני, אין הימורים
   - תוכן חינוכי/דתי
   - תוצאה: **Everyone** (PEGI 3)
3. **Target audience** → גיל 13 ומעלה
4. **Data safety** → מלאו לפי `DATA_SAFETY.md`
5. **Ads** → **No** (אין פרסומות)

### שלב 5: קטגוריה
- **Category**: `Education`
- **Tags**: Torah, Bible, Jewish, Hebrew, Education

### שלב 6: העלאת ה-AAB
1. כנסו ל-**"Production"** → **"Create new release"**
2. לחצו **"Upload"** → בחרו `aab/torah-app-release.aab`
3. **Release name**: `1.0`
4. **Release notes** → העתיקו מ-`RELEASE_NOTES.md`
5. **"Review release"** → **"Start rollout to Production"**

### שלב 7: שליחה לבדיקה
1. כנסו ל-**"Publishing overview"**
2. וודאו שכל הסעיפים מסומנים ב-✅
3. לחצו **"Send for review"**
4. **זמן בדיקה**: 3-7 ימים בדרך כלל

---

## ⚠️ חשוב מאוד — גיבוי Keystore!

| פרט | ערך |
|-----|-----|
| **קובץ Keystore** | `android\app\torah-release-key.jks` |
| **Alias** | `torah-app` |
| **סיסמה** | `543211` |

**גבו את הקובץ הזה!** בלי ה-keystore לא ניתן לעדכן את האפליקציה ב-Play Store.

---

## 📧 פרטי קשר
- **אימייל**: jj1212t@gmail.com (יוצג בדף החנות)
