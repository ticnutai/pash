import { HebrewCalendar, HDate, flags } from "@hebcal/core";

export interface OmerDayEntry {
  day: number;              // 1-49
  hebrewDate: string;       // e.g. "16 Nisan 5786"
  gregorianDate: Date;      // JS Date
  hebrewText: string;       // e.g. "א׳ בָּעוֹמֶר"
  countText: string;        // e.g. "הַיּוֹם יוֹם אֶחָד לָעֹמֶר"
  sefira: string;           // e.g. "חֶֽסֶד שֶׁבְּחֶֽסֶד"
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

export interface OmerBoardData {
  hebrewYear: number;
  currentDay: number | null;   // null if not in counting season
  isInSeason: boolean;
  startDate: Date;
  endDate: Date;
  days: OmerDayEntry[];
}

export const OMER_BLESSING =
  "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו, וְצִוָּנוּ עַל סְפִירַת הָעֹֽמֶר";

export const OMER_AFTER_BLESSING =
  "הָרַחֲמָן הוּא יַחֲזִיר לָנוּ עֲבוֹדַת בֵּית הַמִּקְדָּשׁ לִמְקוֹמָהּ, בִּמְהֵרָה בְיָמֵינוּ אָמֵן סֶלָה";

function buildEvents(gregYear: number) {
  return HebrewCalendar.calendar({ year: gregYear, isHebrewYear: false, omer: true }).filter(
    (e) => e.getFlags() & flags.OMER_COUNT,
  );
}

export function getOmerBoardData(): OmerBoardData {
  const today = new Date();
  const gregYear = today.getFullYear();

  let events = buildEvents(gregYear);

  // If the Omer season for this Gregorian year has fully passed, show next year's
  const lastEvent = events[events.length - 1];
  const lastDate = lastEvent?.getDate().greg();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (lastDate) {
    const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    if (lastMidnight < todayMidnight) {
      const nextEvents = buildEvents(gregYear + 1);
      if (nextEvents.length > 0) events = nextEvents;
    }
  }

  const startDate = events[0].getDate().greg();
  const endDate = events[48].getDate().greg();

  const todayEvent = events.find((ev) => {
    const g = ev.getDate().greg();
    return (
      g.getFullYear() === today.getFullYear() &&
      g.getMonth() === today.getMonth() &&
      g.getDate() === today.getDate()
    );
  });

  const currentDay = todayEvent ? (todayEvent.omer as number) : null;
  const isInSeason = currentDay !== null;

  const hebrewYear = (events[0].getDate() as HDate).getFullYear();

  const days: OmerDayEntry[] = events.map((ev) => {
    const day = ev.omer as number;
    const g = ev.getDate().greg();
    const gMidnight = new Date(g.getFullYear(), g.getMonth(), g.getDate());

    return {
      day,
      hebrewDate: ev.getDate().toString(),
      gregorianDate: g,
      hebrewText: ev.render("he") as string,
      countText: ev.getTodayIs("he") as string,
      sefira: ev.sefira("he") as string,
      isToday: day === currentDay,
      isPast: gMidnight < todayMidnight,
      isFuture: gMidnight > todayMidnight,
    };
  });

  return { hebrewYear, currentDay, isInSeason, startDate, endDate, days };
}

/** Format a Date as DD/MM */
export function formatDayMonth(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
