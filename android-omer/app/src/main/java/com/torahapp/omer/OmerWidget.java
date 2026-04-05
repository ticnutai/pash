package com.torahapp.omer;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.TimeZone;

/**
 * ויג'ט ספירת העומר — מציג את היום הנוכחי בעומר על מסך הבית.
 * מחשב את יום העומר לפי תאריך גרגוריאני (ערב = לילה קודם).
 */
public class OmerWidget extends AppWidgetProvider {

    // ── Hebrew number conversion (1-49) ──
    private static final String[] HEBREW_ONES = {"", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"};
    private static final String[] HEBREW_TENS = {"", "י", "כ", "ל", "מ"};

    private static String toHebrewNum(int n) {
        if (n == 15) return "ט״ו";
        if (n == 16) return "ט״ז";
        if (n <= 0 || n > 49) return String.valueOf(n);
        int tens = n / 10;
        int ones = n % 10;
        String h = HEBREW_TENS[tens] + HEBREW_ONES[ones];
        if (h.length() > 1) {
            return h.substring(0, h.length() - 1) + "״" + h.charAt(h.length() - 1);
        }
        return h + "׳";
    }

    // ── Sefirot names ──
    private static final String[] SEFIROT = {
        "חסד", "גבורה", "תפארת", "נצח", "הוד", "יסוד", "מלכות"
    };

    private static String getSefira(int day) {
        if (day < 1 || day > 49) return "";
        int weekIndex = (day - 1) / 7;
        int dayIndex  = (day - 1) % 7;
        return SEFIROT[dayIndex] + " שב" + SEFIROT[weekIndex];
    }

    // ── Count text ──
    private static String getCountText(int day) {
        int weeks = day / 7;
        int remainder = day % 7;
        StringBuilder sb = new StringBuilder();
        sb.append("היום ").append(toHebrewNum(day)).append(" ");
        if (day == 1) {
            sb.append("יום אחד לעומר");
        } else {
            sb.append("ימים לעומר");
        }
        if (weeks > 0 && remainder == 0) {
            sb.append("\nשהם ");
            if (weeks == 1) sb.append("שבוע אחד");
            else sb.append(toHebrewNum(weeks)).append(" שבועות");
        } else if (weeks > 0) {
            sb.append("\nשהם ");
            if (weeks == 1) sb.append("שבוע אחד");
            else sb.append(toHebrewNum(weeks)).append(" שבועות");
            sb.append(" ו");
            if (remainder == 1) sb.append("יום אחד");
            else sb.append(toHebrewNum(remainder)).append(" ימים");
        }
        return sb.toString();
    }

    /**
     * Calculate the Omer day for the current date.
     * Omer starts on 16 Nisan. We approximate using a lookup for common years.
     * Returns 0 if not in Omer season.
     */
    private static int getOmerDay() {
        // Use Israel timezone for consistent date
        Calendar now = new GregorianCalendar(TimeZone.getTimeZone("Asia/Jerusalem"));
        int year = now.get(Calendar.YEAR);
        int month = now.get(Calendar.MONTH); // 0-based
        int dayOfMonth = now.get(Calendar.DAY_OF_MONTH);
        int hour = now.get(Calendar.HOUR_OF_DAY);

        // Omer night counting: after sunset (~19:00) we count for the next day
        // so effectively the Omer day advances in the evening.
        // We'll compute based on the civil date and adjust for evening.

        // Calculate Pesach date (15 Nisan) using a simplified algorithm
        // Based on the Gauss algorithm for Hebrew calendar Pesach date
        int pesachMonth, pesachDay;
        int[] pesach = computePesachGregorian(year);
        pesachMonth = pesach[0] - 1; // to 0-based
        pesachDay = pesach[1];

        // Omer starts evening of 15 Nisan = night of 16 Nisan
        // First counting is the night after the first Seder
        Calendar omerStart = new GregorianCalendar(TimeZone.getTimeZone("Asia/Jerusalem"));
        omerStart.set(year, pesachMonth, pesachDay, 0, 0, 0);
        // Omer day 1 is counted on the evening of 15 Nisan (civil date = 15 Nisan for evening count)
        // The civil date when day 1 is counted at night = pesachDay (15 Nisan evening)
        // Day 1 display during daytime = pesachDay + 1 (16 Nisan day)

        // Days since Pesach
        Calendar todayMidnight = new GregorianCalendar(TimeZone.getTimeZone("Asia/Jerusalem"));
        todayMidnight.set(year, month, dayOfMonth, 0, 0, 0);

        long diffMs = todayMidnight.getTimeInMillis() - omerStart.getTimeInMillis();
        int diffDays = (int) (diffMs / (24L * 60 * 60 * 1000));

        // During the day: omer day = diffDays (since day after Pesach = day 1 display)
        // After ~19:00 (sunset approximation): advance to next day for counting
        int omerDay = diffDays;
        if (hour >= 19) {
            omerDay++;
        }

        if (omerDay < 1 || omerDay > 49) return 0;
        return omerDay;
    }

    /**
     * Compute the Gregorian date of Pesach (15 Nisan) using the Gauss Pesach algorithm.
     * Returns {month (1-based), day}.
     */
    private static int[] computePesachGregorian(int year) {
        // Gauss formula for Pesach
        int a = (12 * year + 17) % 19;
        int b = year % 4;
        double m = 32.044093161144 + 1.5542417966212 * a
                   + 0.25 * b - 0.003177794022 * year;
        int Mi = (int) Math.floor(m);
        double mc = m - Mi;

        int c = (Mi + 3 * year + 5 * b + 5) % 7;

        // Postponement rules (dehiyot)
        int dayAdjust = 0;
        if (c == 2 || c == 4 || c == 6) {
            dayAdjust = 1;
        } else if (c == 1 && a > 6 && mc >= 0.632870370) {
            dayAdjust = 2;
        } else if (c == 0 && a > 11 && mc >= 0.897723765) {
            dayAdjust = 1;
        }

        int pesachDay = Mi + dayAdjust;
        int pesachMonth = 3; // March

        if (pesachDay > 31) {
            pesachMonth = 4; // April
            pesachDay -= 31;
        }

        return new int[]{pesachMonth, pesachDay};
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.omer_widget_layout);

        int omerDay = getOmerDay();
        if (omerDay > 0) {
            views.setTextViewText(R.id.omer_widget_day, toHebrewNum(omerDay));
            views.setTextViewText(R.id.omer_widget_count, getCountText(omerDay));
            views.setTextViewText(R.id.omer_widget_sefira, getSefira(omerDay));
        } else {
            views.setTextViewText(R.id.omer_widget_day, "—");
            views.setTextViewText(R.id.omer_widget_count, "מחוץ לימי הספירה");
            views.setTextViewText(R.id.omer_widget_sefira, "");
        }

        // Tap opens the app
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 1, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.omer_widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
