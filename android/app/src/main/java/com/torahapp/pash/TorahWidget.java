package com.torahapp.pash;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import java.util.Calendar;

public class TorahWidget extends AppWidgetProvider {

    // פסוקים מפורסמים מהתורה
    private static final String[][] VERSES = {
        {"בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ", "בראשית א:א"},
        {"שְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ יְהוָה אֶחָד", "דברים ו:ד"},
        {"וְאָהַבְתָּ לְרֵעֲךָ כָּמוֹךָ אֲנִי יְהוָה", "ויקרא יט:יח"},
        {"צֶדֶק צֶדֶק תִּרְדֹּף לְמַעַן תִּחְיֶה וְיָרַשְׁתָּ אֶת הָאָרֶץ", "דברים טז:כ"},
        {"בְּכָל דְּרָכֶיךָ דָעֵהוּ וְהוּא יְיַשֵּׁר אֹרְחֹתֶיךָ", "משלי ג:ו"},
        {"חֲזַק וֶאֱמָץ אַל תִּירָא וְאַל תֵּחָת", "יהושע א:ט"},
        {"כִּי לֹא יִטֹּשׁ יְהוָה עַמּוֹ בַּעֲבוּר שְׁמוֹ הַגָּדוֹל", "שמואל א יב:כב"},
        {"וְאָהַבְתָּ אֵת יְהוָה אֱלֹהֶיךָ בְּכָל לְבָבְךָ וּבְכָל נַפְשְׁךָ", "דברים ו:ה"},
        {"תּוֹרַת יְהוָה תְּמִימָה מְשִׁיבַת נָפֶשׁ", "תהלים יט:ח"},
        {"כִּי אָדָם אֵין צַדִּיק בָּאָרֶץ אֲשֶׁר יַעֲשֶׂה טּוֹב וְלֹא יֶחֱטָא", "קהלת ז:כ"},
        {"וְהָיָה כִּי תָבֹא אֶל הָאָרֶץ אֲשֶׁר יְהוָה אֱלֹהֶיךָ נֹתֵן לָךְ", "דברים כו:א"},
        {"לֹא תִשָּׂא אֶת שֵׁם יְהוָה אֱלֹהֶיךָ לַשָּׁוְא", "שמות כ:ז"},
        {"זָכוֹר אֶת יוֹם הַשַּׁבָּת לְקַדְּשׁוֹ", "שמות כ:ח"},
        {"כַּבֵּד אֶת אָבִיךָ וְאֶת אִמֶּךָ", "שמות כ:יב"},
        {"לֹא תִרְצַח לֹא תִנְאַף לֹא תִגְנֹב", "שמות כ:יג"},
        {"אָנֹכִי יְהוָה אֱלֹהֶיךָ אֲשֶׁר הוֹצֵאתִיךָ מֵאֶרֶץ מִצְרַיִם", "שמות כ:ב"},
        {"קְדֹשִׁים תִּהְיוּ כִּי קָדוֹשׁ אֲנִי יְהוָה אֱלֹהֵיכֶם", "ויקרא יט:ב"},
        {"לֹא תִקֹּם וְלֹא תִטֹּר אֶת בְּנֵי עַמֶּךָ", "ויקרא יט:יח"},
        {"וּמָל יְהוָה אֱלֹהֶיךָ אֶת לְבָבְךָ וְאֶת לְבַב זַרְעֶךָ", "דברים ל:ו"},
        {"כִּי הַמִּצְוָה הַזֹּאת אֲשֶׁר אָנֹכִי מְצַוְּךָ הַיּוֹם לֹא נִפְלֵאת הִוא מִמְּךָ", "דברים ל:יא"},
        {"הַחַיִּים וְהַמָּוֶת נָתַתִּי לְפָנֶיךָ הַבְּרָכָה וְהַקְּלָלָה וּבָחַרְתָּ בַּחַיִּים", "דברים ל:יט"},
        {"בְּצֶלֶם אֱלֹהִים בָּרָא אֹתוֹ זָכָר וּנְקֵבָה בָּרָא אֹתָם", "בראשית א:כז"},
        {"וַיַּרְא אֱלֹהִים אֶת כָּל אֲשֶׁר עָשָׂה וְהִנֵּה טוֹב מְאֹד", "בראשית א:לא"},
        {"לֹא טוֹב הֱיוֹת הָאָדָם לְבַדּוֹ אֶעֱשֶׂה לּוֹ עֵזֶר כְּנֶגְדּוֹ", "בראשית ב:יח"},
        {"אָנֹכִי עִמְּךָ וּשְׁמַרְתִּיךָ בְּכֹל אֲשֶׁר תֵּלֵךְ", "בראשית כח:טו"},
        {"וַיִּשְׁמַע יְהוָה אֶת קֹלֵנוּ וַיַּרְא אֶת עָנְיֵנוּ וְאֶת עֲמָלֵנוּ", "דברים כו:ז"},
        {"וְיָדַעְתָּ הַיּוֹם וַהֲשֵׁבֹתָ אֶל לְבָבֶךָ כִּי יְהוָה הוּא הָאֱלֹהִים", "דברים ד:לט"},
        {"עַל כֵּן יַעֲזָב אִישׁ אֶת אָבִיו וְאֶת אִמּוֹ וְדָבַק בְּאִשְׁתּוֹ", "בראשית ב:כד"},
        {"וְהִנֵּה יְהוָה נִצָּב עָלָיו וַיֹּאמַר אֲנִי יְהוָה אֱלֹהֵי אַבְרָהָם", "בראשית כח:יג"},
        {"אַשְׁרֵי הַגֶּבֶר אֲשֶׁר יִבְטַח בַּיהוָה וְהָיָה יְהוָה מִבְטַחוֹ", "ירמיהו יז:ז"},
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // בחירת פסוק לפי יום השנה
        int dayOfYear = Calendar.getInstance().get(Calendar.DAY_OF_YEAR);
        int index = dayOfYear % VERSES.length;

        String verseText = VERSES[index][0];
        String verseRef  = VERSES[index][1];

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        views.setTextViewText(R.id.widget_verse_text, verseText);
        views.setTextViewText(R.id.widget_verse_ref, verseRef);

        // לחיצה פותחת את האפליקציה
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_open_btn, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_verse_text, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
