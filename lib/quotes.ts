/**
 * Energetic, motivational quotes/lyrics. One per day (deterministic by date).
 */

const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Wake up. Work out. Show up.",
  "Discipline is choosing between what you want now and what you want most.",
  "Strong is the new skinny.",
  "Sweat now, shine later.",
  "Your body can do it. It's your mind you need to convince.",
  "Don't wish for it. Work for it.",
  "Small steps lead to big changes.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "No zero days.",
  "Rise and grind.",
  "Make yourself a priority once in a while.",
  "It never gets easier. You just get stronger.",
  "Good things come to those who sweat.",
  "Be stronger than your excuses.",
  "Train like a beast. Look like a beauty.",
  "The only way to do it is to do it.",
  "You didn't come this far to only come this far.",
  "One more rep. One more day.",
  "Energy and persistence conquer all things.",
  "Do it for the 'I did it' feeling.",
  "Today I will do what others won't, so tomorrow I can do what others can't.",
  "Fitness is not about being better than someone else. It's about being better than you used to be.",
  "Start where you are. Use what you have. Do what you can.",
  "The best project you'll ever work on is you.",
  "Hustle for that muscle.",
  "Fall in love with taking care of your body.",
  "Push yourself because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Work hard in silence. Let success make the noise.",
];

/** Returns a deterministic quote for the given date (same day = same quote). */
export function getQuoteOfTheDay(dateKey?: string): string {
  const key = dateKey ?? (typeof window !== "undefined" ? getTodayKeyClient() : new Date().toISOString().slice(0, 10));
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % QUOTES.length;
  return QUOTES[index];
}

function getTodayKeyClient(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
