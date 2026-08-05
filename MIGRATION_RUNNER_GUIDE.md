# מדריך הרצת מיגרציות — pash

המנגנון הזה מריץ SQL ישירות מול פרויקט Supabase של `pash` באמצעות Supabase Management API. הוא אינו שומר סיסמה, מפתח שירות או access token בקוד.

## הכנה חד־פעמית

1. יוצרים Personal Access Token ב־Supabase Dashboard: Account → Access Tokens.
2. מגדירים אותו רק בחלון הטרמינל הנוכחי:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "הטוקן-שלך"
```

מזהה הפרויקט נקרא אוטומטית מ־`VITE_SUPABASE_PROJECT_ID` בקובץ `.env`. אין להדפיס או להכניס את הטוקן ל־Git.

## פקודות

מהשורש של הפרויקט:

```powershell
node scripts/direct-run.mjs pending
node scripts/direct-run.mjs file "supabase/migrations/20260805000000_siddur_public_themes.sql"
node scripts/direct-run.mjs sql "SELECT to_regclass('public.siddur_themes') AS table_name" "verify_siddur_themes"
```

- `pending` מריץ רק פריטים עם `status: "pending"` מתוך `public/pending-migrations.json`.
- `file` מריץ קובץ SQL יחיד מתוך תיקיית הפרויקט.
- `sql` מיועד לבדיקה צרה או לפעולה שאושרה במפורש.

סטטוס משתנה ל־`completed` רק לאחר תשובת HTTP מוצלחת מ־Supabase. במקרה כשל נשמר `failed` יחד עם הודעת השגיאה; אין לסמן ידנית כמושלם.

## תהליך בטוח

1. בדוק את קובץ ה־SQL ואת מזהה הפרויקט שמציג ה־runner.
2. לפני מחיקה, שינוי המוני או מיגרציה גדולה ודא שקיים גיבוי ניתן לשחזור.
3. הרץ את הקובץ המדויק או `pending`.
4. דרוש הודעת `Migration completed successfully`.
5. הרץ שאילתת `SELECT` צרה לאימות התוצאה.

ה־runner חוסם כברירת מחדל `DROP`, `TRUNCATE` ו־`DELETE` במצב `sql`. אפשר לאשר פעולה כזו במפורש רק באמצעות `--allow-destructive`.
