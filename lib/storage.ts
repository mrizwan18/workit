/**
 * Data model: date -> { completed, checklist }
 * Streak = consecutive days with completed: true
 * Min 2 checklist items = counts as workout (when using checklist flow)
 */

export type ChecklistKeys = "warmup" | "main" | "accessories" | "stretch";

export interface DayEntry {
  completed: boolean;
  checklist?: Partial<Record<ChecklistKeys, boolean>>;
}

export type WorkoutsData = Record<string, DayEntry>;

const STORAGE_KEY = "before-work-workouts";
const TRACKING_START_KEY = "before-work-tracking-started";
const FORGIVEN_AT_KEY = "before-work-forgiven-at";
const RESETS_KEY = "before-work-resets";

/** Weekend = rest day; no workout required, doesn't count as miss. */
export function isRestDay(dateKey: string): boolean {
  const d = new Date(dateKey + "T12:00:00");
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

function toDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function getTodayKey(): string {
  return toDateKey(new Date());
}

export function getWorkouts(): WorkoutsData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setWorkouts(data: WorkoutsData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Date key when user clicked "Start Improvement" (tracking starts from this day). */
export function getTrackingStartedDate(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TRACKING_START_KEY);
    if (!raw) return null;
    const key = String(raw).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
  } catch {
    return null;
  }
}

export function setTrackingStarted(dateKey: string): void {
  if (typeof window === "undefined") return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
  localStorage.setItem(TRACKING_START_KEY, dateKey);
}

export function getEntry(dateKey: string): DayEntry | undefined {
  return getWorkouts()[dateKey];
}

export function isCompleted(dateKey: string): boolean {
  const entry = getEntry(dateKey);
  if (!entry) return false;
  if (entry.completed) return true;
  const c = entry.checklist;
  if (!c) return false;
  const ticked = [c.warmup, c.main, c.accessories, c.stretch].filter(Boolean).length;
  return ticked >= 2;
}

/** Can only log today. Never yesterday or future. */
export function canLogDate(dateKey: string): boolean {
  const today = getTodayKey();
  return dateKey === today;
}

/** Cannot log twice for the same day. */
export function alreadyLogged(dateKey: string): boolean {
  return isCompleted(dateKey);
}

/** Count consecutive completed days ending today (or yesterday if today not done). Only counts from tracking start date. */
export function getCurrentStreak(): number {
  const today = getTodayKey();
  const startDate = getTrackingStartedDate();
  let d = new Date(today);
  d.setHours(0, 0, 0, 0);
  if (!isCompleted(today)) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (true) {
    const key = toDateKey(d);
    if (startDate && key < startDate) break;
    if (!isCompleted(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Check if user missed yesterday (weekday only; rest days don't count). Only counts if yesterday is on or after tracking start. */
export function missedYesterday(): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const key = toDateKey(yesterday);
  const startDate = getTrackingStartedDate();
  if (startDate && key < startDate) return false;
  if (isRestDay(key)) return false;
  return !isCompleted(key) && key !== getTodayKey();
}

/** No skipping two days in a row: did we miss yesterday (weekday) and not log today yet? */
export function isStreakAtRisk(): boolean {
  const today = getTodayKey();
  if (isCompleted(today)) return false;
  return missedYesterday();
}

export function logWorkoutCompleted(dateKey: string): void {
  if (!canLogDate(dateKey)) return;
  if (alreadyLogged(dateKey)) return;
  const data = getWorkouts();
  data[dateKey] = { completed: true };
  setWorkouts(data);
}

export function logChecklist(dateKey: string, checklist: Record<ChecklistKeys, boolean>): void {
  if (!canLogDate(dateKey)) return;
  const data = getWorkouts();
  const ticked = Object.values(checklist).filter(Boolean).length;
  data[dateKey] = {
    completed: ticked >= 2,
    checklist,
  };
  setWorkouts(data);
}

/** Last date user clicked "I am ashamed"; misses on or before this are forgiven. */
export function getForgivenAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FORGIVEN_AT_KEY);
    if (!raw) return null;
    const key = String(raw).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
  } catch {
    return null;
  }
}

export function setForgivenAt(dateKey: string): void {
  if (typeof window === "undefined") return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
  localStorage.setItem(FORGIVEN_AT_KEY, dateKey);
}

export interface ResetRecord {
  dateKey: string;
  timestamp: number;
}

export function getResets(): ResetRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESETS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function setResets(records: ResetRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RESETS_KEY, JSON.stringify(records));
}

/** Record that user clicked "I am ashamed" today; forgives consecutive misses. */
export function recordReset(): void {
  if (typeof window === "undefined") return;
  const today = getTodayKey();
  setForgivenAt(today);
  const records = getResets();
  records.push({ dateKey: today, timestamp: Date.now() });
  setResets(records);
}

const MAX_DAYS_BACK = 366;

/** Consecutive weekday misses going back from yesterday. Only counts days on or after tracking start. Rest days skipped. Stops at completed day or forgivenAt. */
export function getConsecutiveWeekdayMisses(): number {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const startDate = getTrackingStartedDate();
  const forgivenAt = getForgivenAt();
  let d = new Date(yesterday);
  let count = 0;
  let iterations = 0;
  while (iterations < MAX_DAYS_BACK) {
    iterations++;
    const key = toDateKey(d);
    if (startDate && key < startDate) break;
    if (forgivenAt && key <= forgivenAt) break;
    if (isRestDay(key)) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    if (isCompleted(key)) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

/** Permanent danger: 2+ consecutive weekday misses (only clear via "I am ashamed"). */
export function isPermanentDanger(): boolean {
  return getConsecutiveWeekdayMisses() >= 2;
}

export function getCalendarMonth(year: number, month: number): { dateKey: string; completed: boolean; isToday: boolean }[] {
  const today = getTodayKey();
  const data = getWorkouts();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const out: { dateKey: string; completed: boolean; isToday: boolean }[] = [];
  const d = new Date(first);
  while (d <= last) {
    const key = toDateKey(d);
    const entry = data[key];
    const completed = entry ? isCompleted(key) : false;
    out.push({ dateKey: key, completed, isToday: key === today });
    d.setDate(d.getDate() + 1);
  }
  return out;
}
