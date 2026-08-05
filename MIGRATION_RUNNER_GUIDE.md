# מדריך הרצת מיגרציות — pash

המנגנון מתחבר למשתמש המנהל דרך Supabase Auth ומריץ SQL באמצעות `execute_safe_migration`. אין צורך ב־Supabase CLI או ב־Access Token.

## הכנה חד־פעמית

מגדירים פעם אחת בקובץ מקומי `.env.migrations.local` שאינו נכנס ל־Git:

```dotenv
MIGRATION_ADMIN_EMAIL=כתובת-המנהל
MIGRATION_ADMIN_PASSWORD=סיסמת-המנהל
```

ה־URL, ה־anon key ומזהה הפרויקט נקראים אוטומטית מ־`.env`. אין להכניס את קובץ פרטי המנהל ל־Git.

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
