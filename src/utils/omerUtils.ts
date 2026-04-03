import { Event, HebrewCalendar, HDate, OmerEvent, ParshaEvent } from "@hebcal/core";
import { toHebrewNumber } from "@/utils/hebrewNumbers";

export interface OmerDayEntry {
  day: number;
  hebrewDay: string;
  weekdayHebrew: string;
  shabbatReading: string | null;
  hebrewDate: string;
  gregorianDate: string;
  sefira: string;
  countText: string;
  isToday: boolean;
}

export interface OmerBoardData {
  hebrewYear: number;
  currentDay: number | null;
  isInSeason: boolean;
  startGregorian: string;
  endGregorian: string;
  days: OmerDayEntry[];
}

const GREGORIAN_FORMATTER = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const subtractOneDay = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
};

const WEEKDAY_HEBREW = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"];

const getShabbatReading = (date: Date, isIsrael: boolean): string | null => {
  const events = HebrewCalendar.calendar({
    start: date,
    end: date,
    il: isIsrael,
    sedrot: true,
  });

  const parshaEvent = events.find((event): event is ParshaEvent => event instanceof ParshaEvent);
  if (parshaEvent) {
    return parshaEvent.render("he");
  }

  // Fallback for Shabbatot without a regular parsha (e.g., festival readings).
  const holidayEvent = events.find((event: Event) => {
    const title = event.render("he");
    return Boolean(title && title.includes("שבת"));
  });

  return holidayEvent ? holidayEvent.render("he") : "שבת חול המועד פסח";
};

export const getOmerBoardData = (isIsrael: boolean = true): OmerBoardData => {
  const today = new Date();
  const todayIso = toIsoDate(today);
  const hebrewYear = new HDate(today).getFullYear();

  const events = HebrewCalendar.calendar({
    year: hebrewYear,
    isHebrewYear: true,
    il: isIsrael,
    omer: true,
  });

  const omerEvents = events
    .filter((event): event is OmerEvent => event instanceof OmerEvent)
    .sort((a, b) => a.omer - b.omer);

  const days = omerEvents.map((event) => {
    // Omer count is recited at night, so display by the civil evening date.
    const gregDate = subtractOneDay(event.greg());
    const isToday = toIsoDate(gregDate) === todayIso;

    return {
      day: event.omer,
      hebrewDay: toHebrewNumber(event.omer),
      weekdayHebrew: WEEKDAY_HEBREW[gregDate.getDay()] ?? "",
      shabbatReading: gregDate.getDay() === 6 ? getShabbatReading(gregDate, isIsrael) : null,
      hebrewDate: event.getDate().renderGematriya(true, false),
      gregorianDate: GREGORIAN_FORMATTER.format(gregDate),
      sefira: event.sefira("he"),
      countText: event.getTodayIs("he"),
      isToday,
    };
  });

  const currentDay = days.find((day) => day.isToday)?.day ?? null;
  const firstDay = omerEvents[0] ? subtractOneDay(omerEvents[0].greg()) : undefined;
  const lastDay = omerEvents[omerEvents.length - 1]
    ? subtractOneDay(omerEvents[omerEvents.length - 1].greg())
    : undefined;

  return {
    hebrewYear,
    currentDay,
    isInSeason: currentDay !== null,
    startGregorian: firstDay ? GREGORIAN_FORMATTER.format(firstDay) : "",
    endGregorian: lastDay ? GREGORIAN_FORMATTER.format(lastDay) : "",
    days,
  };
};
