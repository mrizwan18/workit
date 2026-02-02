/**
 * High-energy workout tracks. Punjabi entries from:
 * - Hot Hits Punjabi: https://open.spotify.com/playlist/37i9dQZF1DWXVJK4aT7pmk
 * - Desi Hip Hop: https://open.spotify.com/playlist/37i9dQZF1DX2RahGIyQXcJ
 * Each uses a Spotify search URL so the user can open in Spotify.
 */

export interface WorkoutTrack {
  title: string;
  artist: string;
  /** Opens Spotify app/web to this search (track or artist + title). */
  spotifyUrl: string;
}

/** Spotify search URL so user lands on track/search. */
function spotifySearch(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

export const WORKOUT_TRACKS: WorkoutTrack[] = [
  // Hot Hits Punjabi & Desi Hip Hop (playlists linked above)
  { title: "LAAVAN", artist: "Jasmine Sandlas, Mofusion", spotifyUrl: spotifySearch("Jasmine Sandlas LAAVAN") },
  { title: "Boyfriend", artist: "Karan Aujla, Ikky", spotifyUrl: spotifySearch("Karan Aujla Boyfriend") },
  { title: "Supreme", artist: "Shubh", spotifyUrl: spotifySearch("Shubh Supreme") },
  { title: "Haseen", artist: "Talwiinder, NDS, Rippy Grewal", spotifyUrl: spotifySearch("Talwiinder Haseen") },
  { title: "Thodi Si Daaru", artist: "AP Dhillon, Shreya Ghoshal", spotifyUrl: spotifySearch("AP Dhillon Thodi Si Daaru") },
  { title: "Water", artist: "Diljit Dosanjh, MixSingh, Raj Ranjodh", spotifyUrl: spotifySearch("Diljit Dosanjh Water") },
  { title: "Qatal", artist: "Guru Randhawa, Sanjoy, Gill Machhrai", spotifyUrl: spotifySearch("Guru Randhawa Qatal") },
  { title: "Aadat", artist: "Yo Yo Honey Singh, AP Dhillon", spotifyUrl: spotifySearch("Yo Yo Honey Singh Aadat AP Dhillon") },
  { title: "HIM.", artist: "Karan Aujla, Ikky", spotifyUrl: spotifySearch("Karan Aujla HIM") },
  { title: "For A Reason", artist: "Karan Aujla, Ikky", spotifyUrl: spotifySearch("Karan Aujla For A Reason") },
  { title: "Kufar", artist: "Diljit Dosanjh, MixSingh, Raj Ranjodh", spotifyUrl: spotifySearch("Diljit Dosanjh Kufar") },
  { title: "Aura", artist: "Shubh", spotifyUrl: spotifySearch("Shubh Aura") },
  { title: "STFU", artist: "AP Dhillon, Shinda Kahlon", spotifyUrl: spotifySearch("AP Dhillon STFU") },
  { title: "MF Gabhru!", artist: "Karan Aujla, Ikky", spotifyUrl: spotifySearch("Karan Aujla MF Gabhru") },
  { title: "Balenci", artist: "Shubh", spotifyUrl: spotifySearch("Shubh Balenci") },
  { title: "100 Million", artist: "DIVINE, Karan Aujla", spotifyUrl: spotifySearch("DIVINE Karan Aujla 100 Million") },
  { title: "Wavy", artist: "Karan Aujla, Jay Trak", spotifyUrl: spotifySearch("Karan Aujla Wavy") },
  { title: "On Top", artist: "Karan Aujla", spotifyUrl: spotifySearch("Karan Aujla On Top") },
  { title: "Faraar", artist: "Gurinder Gill, Shinda Kahlon, AP Dhillon", spotifyUrl: spotifySearch("AP Dhillon Faraar") },
  { title: "Old Money", artist: "AP Dhillon", spotifyUrl: spotifySearch("AP Dhillon Old Money") },
  { title: "7.7 Magnitude", artist: "Karan Aujla, Ikky", spotifyUrl: spotifySearch("Karan Aujla 7.7 Magnitude") },
  { title: "Not Guilty", artist: "Dhanda Nyoliwala", spotifyUrl: spotifySearch("Dhanda Nyoliwala Not Guilty") },
  { title: "3:59 AM", artist: "DIVINE", spotifyUrl: spotifySearch("DIVINE 3:59 AM") },
  { title: "Brown Munde", artist: "AP Dhillon", spotifyUrl: spotifySearch("AP Dhillon Brown Munde") },
  { title: "Excuses", artist: "AP Dhillon", spotifyUrl: spotifySearch("AP Dhillon Excuses") },
  { title: "Lemonade", artist: "Diljit Dosanjh", spotifyUrl: spotifySearch("Diljit Dosanjh Lemonade") },
  { title: "Proper Patola", artist: "Badshah", spotifyUrl: spotifySearch("Badshah Proper Patola") },
  { title: "Garmi", artist: "Badshah", spotifyUrl: spotifySearch("Badshah Garmi") },
  // Tupac / Eminem
  { title: "California Love", artist: "2Pac", spotifyUrl: spotifySearch("2Pac California Love") },
  { title: "Hit 'Em Up", artist: "2Pac", spotifyUrl: spotifySearch("2Pac Hit Em Up") },
  { title: "All Eyez on Me", artist: "2Pac", spotifyUrl: spotifySearch("2Pac All Eyez on Me") },
  { title: "Lose Yourself", artist: "Eminem", spotifyUrl: spotifySearch("Eminem Lose Yourself") },
  { title: "Till I Collapse", artist: "Eminem", spotifyUrl: spotifySearch("Eminem Till I Collapse") },
  { title: "Not Afraid", artist: "Eminem", spotifyUrl: spotifySearch("Eminem Not Afraid") },
  { title: "Rap God", artist: "Eminem", spotifyUrl: spotifySearch("Eminem Rap God") },
  // More high energy
  { title: "Stronger", artist: "Kanye West", spotifyUrl: spotifySearch("Kanye West Stronger") },
  { title: "Power", artist: "Kanye West", spotifyUrl: spotifySearch("Kanye West Power") },
  { title: "Can't Hold Us", artist: "Macklemore", spotifyUrl: spotifySearch("Macklemore Cant Hold Us") },
  { title: "Thunder", artist: "Imagine Dragons", spotifyUrl: spotifySearch("Imagine Dragons Thunder") },
  { title: "Believer", artist: "Imagine Dragons", spotifyUrl: spotifySearch("Imagine Dragons Believer") },
  { title: "Eye of the Tiger", artist: "Survivor", spotifyUrl: spotifySearch("Survivor Eye of the Tiger") },
  { title: "Lose Control", artist: "Missy Elliott", spotifyUrl: spotifySearch("Missy Elliott Lose Control") },
  { title: "Work It", artist: "Missy Elliott", spotifyUrl: spotifySearch("Missy Elliott Work It") },
];

/** Returns a deterministic track for the day (same day = same track). */
export function getTrackOfTheDay(dateKey?: string): WorkoutTrack {
  const key =
    dateKey ??
    (typeof window !== "undefined"
      ? getTodayKeyClient()
      : new Date().toISOString().slice(0, 10));
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % WORKOUT_TRACKS.length;
  return WORKOUT_TRACKS[index];
}

function getTodayKeyClient(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
