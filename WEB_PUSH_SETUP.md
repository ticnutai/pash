# Web Push – מדריך השלמת ההתקנה

## סטטוס נוכחי

| רכיב | מצב |
|-------|------|
| Service Worker (`push-sw.js`) | ✅ מוכן |
| Hook לקוח (`useWebPush.ts`) | ✅ מוכן |
| שירות VAPID (`webPushService.ts`) | ✅ מוכן |
| חיבור עומר ← Web Push | ✅ מוכן |
| חיבור תזכורות יומיות ← Web Push | ✅ מוכן |
| טבלת `push_subscriptions` | ✅ מיגרציה הורצה |
| Edge Function `push-subscribe` | ✅ דופלי |
| Edge Function `send-push` | ✅ דופלי |
| Secrets ב-Supabase | ✅ הוגדרו |
| pg_cron (שליחת התראות כל דקה) | ✅ הוגדר |

---

## שלב 1: התקנת Supabase CLI

```powershell
npm install -g supabase
```

אם כבר מותקן, וודא גרסה עדכנית:
```powershell
supabase --version
```

## שלב 2: התחברות ל-Supabase

```powershell
supabase login
```

יפתח דפדפן לאישור. אחרי אישור:

```powershell
supabase link --project-ref mocukhvfqqzkekphifsr
```

## שלב 3: הגדרת Secrets

```powershell
supabase secrets set VAPID_PUBLIC_KEY="BLSFD4oodnVhrA9IGuDtvDvxqJI9U0E2dT30peC1dX5qwL8FPz_46n1TmNMjjnOeAETBavO_aLuobwXsl3D2L_Y"
supabase secrets set VAPID_PRIVATE_KEY="MmrMQnBStp9ZBgciMuWWa1E3dFJ7f6JO1H2WUMl_2dI"
supabase secrets set VAPID_SUBJECT="mailto:jj1212t@gmail.com"
```

**או ידנית:** Supabase Dashboard → Edge Functions → Secrets → Add:

| Secret | ערך |
|--------|------|
| `VAPID_PUBLIC_KEY` | `BLSFD4oodnVhrA9IGuDtvDvxqJI9U0E2dT30peC1dX5qwL8FPz_46n1TmNMjjnOeAETBavO_aLuobwXsl3D2L_Y` |
| `VAPID_PRIVATE_KEY` | `MmrMQnBStp9ZBgciMuWWa1E3dFJ7f6JO1H2WUMl_2dI` |
| `VAPID_SUBJECT` | `mailto:jj1212t@gmail.com` |

### ערכים להעתקה ישירה (Add Secrets):

```
VAPID_PUBLIC_KEY
```
```
BLSFD4oodnVhrA9IGuDtvDvxqJI9U0E2dT30peC1dX5qwL8FPz_46n1TmNMjjnOeAETBavO_aLuobwXsl3D2L_Y
```

```
VAPID_PRIVATE_KEY
```
```
MmrMQnBStp9ZBgciMuWWa1E3dFJ7f6JO1H2WUMl_2dI
```

```
VAPID_SUBJECT
```
```
mailto:jj1212t@gmail.com
```

## שלב 4: דיפלוי ה-Edge Functions

```powershell
supabase functions deploy push-subscribe --no-verify-jwt
supabase functions deploy send-push --no-verify-jwt
```

> `--no-verify-jwt` נדרש כי `push-subscribe` נקרא מהקליינט ו-`send-push` מ-pg_cron.

לבדיקה:
```powershell
supabase functions list
```

## שלב 5: הגדרת pg_cron לשליחה אוטומטית

ב-Supabase Dashboard → SQL Editor, להריץ:

```sql
-- ודא ש-pg_cron ו-pg_net מופעלים
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- תזמן שליחת push כל דקה
SELECT cron.schedule(
  'send-push-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mocukhvfqqzkekphifsr.supabase.co/functions/v1/send-push',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);
```

> **חלופה:** אם `current_setting` לא עובד, החלף עם ה-Service Role Key הישיר מה-Dashboard → Settings → API.

לבדיקת ה-cron:
```sql
SELECT * FROM cron.job;
```

## שלב 6: בדיקה

1. פתח את האפליקציה בדפדפן (Chrome)
2. הוסף תזכורת עם ערוץ "פוש" מופעל
3. סגור את הטאב
4. חכה לזמן התזכורת → צריך לקבל התראה על המסך

---

## פתרון בעיות

### ההתראות לא מגיעות
- בדוק ש-Edge Functions דופלצו: `supabase functions list`
- בדוק לוגים: `supabase functions logs send-push`
- בדוק שה-Secrets הוגדרו: `supabase secrets list`
- בדוק שה-cron רץ: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;`

### שגיאת VAPID
- ודא שהמפתחות תואמים בין הקליינט (`webPushService.ts`) לשרת (Secrets)
- Public key בקליינט = אותו public key ב-Secrets

### השרת מחזיר 401
- בדוק שה-`--no-verify-jwt` הוגדר בדיפלוי
- או הוסף JWT תקין ב-cron request

---

## ארכיטקטורה

```
משתמש בוחר "פוש" בתזכורת
  │
  ├─ Omer / Daily reminder persist()
  │   └─ webPushService.syncReminders()
  │       └─ ensures browser subscribed (VAPID)
  │       └─ saves reminders to push_subscriptions table
  │
  ├─ pg_cron (כל דקה)
  │   └─ calls send-push Edge Function
  │       └─ reads push_subscriptions
  │       └─ checks current Israel time vs reminder schedule
  │       └─ sends Web Push via VAPID to matching devices
  │
  └─ push-sw.js (Service Worker)
      └─ receives push event
      └─ shows system notification
      └─ click → opens/focuses app
```
