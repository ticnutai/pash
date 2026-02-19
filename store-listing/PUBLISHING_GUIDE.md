# מדריך פרסום באפליקציה ב-Google Play Store
# Complete Google Play Store Publishing Guide

## קבצים מוכנים / Ready Files

| File | Purpose | Location |
|------|---------|----------|
| torah-app-release.aab | Signed App Bundle (13.2 MB) | `C:\Users\jj121\pashash\torah-app-release.aab` |
| Screenshots (5) | Store listing images | `store-listing\screenshots\` |
| Feature Graphic | 1024x500 banner | `store-listing\feature_graphic.png` |
| App Icon | 512x512 | `android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png` |
| Store Listing Text | Description, title | `store-listing\store_listing.md` |
| Privacy Policy | HTML page | `store-listing\privacy-policy.html` |
| Data Safety | Questionnaire answers | `store-listing\data_safety_answers.md` |

---

## Step 1: Create Google Play Developer Account

1. Go to: https://play.google.com/console
2. Sign in with a Google account
3. Pay the one-time $25 registration fee
4. Fill in developer profile details
5. Wait for account verification (can take 48 hours)

---

## Step 2: Create New App

1. In Play Console → Click **"Create app"**
2. Fill in:
   - **App name**: חמישה חומשי תורה
   - **Default language**: עברית (Hebrew)
   - **App or Game**: App
   - **Free or Paid**: Free
3. Accept the declarations
4. Click **"Create app"**

---

## Step 3: Store Listing (חנות)

### Main Store Listing:
1. Go to **"Main store listing"** in the left menu
2. Fill in from `store-listing\store_listing.md`:
   - **App name**: חמישה חומשי תורה
   - **Short description**: Copy from store_listing.md
   - **Full description**: Copy from store_listing.md

### Graphics:
1. **App icon**: Upload `android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png` (512x512)
2. **Feature graphic**: Upload `store-listing\feature_graphic.png` (1024x500)
3. **Phone screenshots**: Upload 2-8 images from `store-listing\screenshots\`
   - Minimum 2 screenshots required
   - Use: screenshot_1_main.png, screenshot_2_scroll.png, etc.

---

## Step 4: App Content (תוכן האפליקציה)

### Privacy Policy:
1. Host the privacy policy at a public URL:
   - Option A: Use your web app URL + /privacy-policy.html
   - Option B: Upload to GitHub Pages
   - Option C: Use a free hosting service
2. Enter the URL in the Privacy Policy field

### Content Rating:
1. Go to **"Content rating"**
2. Start the questionnaire
3. Answer: 
   - No violence, no sexual content, no gambling
   - Reference/educational content related to religion
4. Result should be: **Everyone** (PEGI 3)

### Target Audience:
1. Go to **"Target audience"**
2. Select age group: **13 and above** (or All ages)
3. Not designed for children under 13

### Data Safety:
1. Go to **"Data safety"**
2. Fill in using answers from `store-listing\data_safety_answers.md`
3. Mark: collects email (optional), user content, settings
4. Mark: does NOT share data with third parties

### Ads:
1. Does your app contain ads? **No**

---

## Step 5: App Category

1. Go to **"App category"**
2. **Category**: Education
3. **Tags**: Add relevant tags (Torah, Bible, Jewish, Hebrew)

---

## Step 6: Upload the AAB

1. Go to **"Production"** → **"Create new release"**
2. Click **"Upload"**
3. Select: `C:\Users\jj121\pashash\torah-app-release.aab`
4. **Release name**: 1.0
5. **Release notes** (Hebrew):
   ```
   גרסה ראשונה של חמישה חומשי תורה!
   • קריאת כל חמשת חומשי התורה
   • חיפוש חכם בכל הפסוקים
   • סימניות והערות אישיות
   • פירושים ומפרשים
   • סנכרון בענן בין מכשירים
   • מצב כהה ובהיר
   • התאמה אישית של גודל גופן וצבעים
   ```
6. Click **"Review release"**
7. Click **"Start rollout to Production"**

---

## Step 7: Review & Submit

1. Go to **"Publishing overview"**
2. Make sure all sections show ✅ (green checkmarks)
3. Click **"Send for review"**
4. **Review time**: Usually 3-7 days for first submission

---

## Important Notes

### Keystore Backup (CRITICAL!)
- **Keystore file**: `android\app\torah-release-key.jks`
- **Alias**: torah-app
- **Password**: 543211
- **BACK UP THIS FILE!** Without it, you cannot update the app on Play Store.
- Store a copy in a safe location (cloud drive, USB, etc.)

### Contact Email
- Contact email: jj1212t@gmail.com
- This will be shown publicly on the Play Store listing

### Privacy Policy Hosting
The privacy policy HTML file needs to be at a public URL. Options:
1. **Easiest**: Deploy with your web app (already copied to `public/privacy-policy.html`)
   - URL will be: https://[your-web-domain]/privacy-policy.html
2. **GitHub Pages**: Push to a gh-pages branch
3. **Free hosting**: Use any static hosting service

---

## Future Updates Workflow

When you want to update the app:

1. Make code changes
2. Update version in `android/app/build.gradle`:
   - `versionCode` → increment by 1 (e.g., 2, 3, 4...)
   - `versionName` → update string (e.g., "1.1", "1.2", "2.0")
3. Run: `.\build-release.ps1`
4. Upload new AAB to Play Console → Production → Create new release
5. Add release notes
6. Submit for review

---

## Checklist

- [ ] Google Play Developer account created ($25)
- [ ] App created in Play Console
- [ ] Store listing filled (name, descriptions, screenshots)
- [ ] Feature graphic uploaded
- [ ] Privacy policy hosted and URL entered
- [ ] Content rating questionnaire completed
- [ ] Target audience set
- [ ] Data safety form filled
- [ ] AAB uploaded
- [ ] Release notes written
- [ ] All sections show green checkmarks
- [ ] Submitted for review
- [ ] Keystore backed up securely
