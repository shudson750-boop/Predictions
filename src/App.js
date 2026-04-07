import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  pageBg: "#2D5A27",       // forest / hunter green
  navBg: "#1B3D16",        // darker green for nav bar
  navBorder: "#143011",
  widget: "#FFFFFF",       // white widget cards
  widgetBorder: "#D8D8D8",
  calcCard: "#F4F4F4",     // very light gray for inner calc panels
  calcBorder: "#E0E0E0",
  input: "#FAFAFA",
  inputBorder: "#C8C8C8",
  textPrimary: "#111111",  // near-black body text
  textSecond: "#333333",
  textMuted: "#666666",
  textFaint: "#999999",
  teamA: "#C0392B",        // red  — Team A
  teamB: "#1565C0",        // blue — Team B
  live: "#C0392B",
  pinned: "#D4A017",
  alert: "#C0392B",
  btnPrimary: "#2D5A27",   // forest green buttons
  btnPrimaryTxt: "#FFFFFF",
  badge: "#EFEFEF",
  badgeBorder: "#D4D4D4",
  sectionTxt: "#444444",
  divider: "#E2E2E2",
  modalBg: "#FFFFFF",
  modalBorder: "#D8D8D8",
  notifBg: "#FFFBEA",
  notifBorder: "#F0C040",
  notifTxt: "#5C3D00",
  apiBg: "#F4F4F4",
  apiBorder: "#E0E0E0",
  apiTxt: "#666666",
};

// ─── TEAM COLORS ──────────────────────────────────────────────────────────────
// Primary brand color keyed by common team name (case-insensitive lookup via getTeamColor)
const TEAM_COLORS = {
  // Ivy / A-10
  "penn": "#990000", "princeton": "#FF671F", "harvard": "#A51C30", "yale": "#00356B",
  "columbia": "#9BDDFF", "cornell": "#B31B1B", "brown": "#4E3629", "dartmouth": "#00693E",
  "saint louis": "#003DA5", "vcu": "#000000", "dayton": "#CE1141", "rhode island": "#002147",
  "george mason": "#006633", "george washington": "#033A6A", "fordham": "#8B1A1A",
  "richmond": "#990000", "la salle": "#00529B", "massachusetts": "#881124",
  "davidson": "#CC0000", "duquesne": "#002B72",
  // ACC
  "duke": "#003087", "north carolina": "#4B9CD3", "nc state": "#CC0000",
  "virginia": "#232D4B", "virginia tech": "#CF4420", "miami": "#F47321",
  "florida state": "#782F40", "clemson": "#F66733", "louisville": "#AD0000",
  "pittsburgh": "#003594", "wake forest": "#9E7E38", "boston college": "#8A0000",
  "notre dame": "#0C2340", "georgia tech": "#B3A369", "syracuse": "#D44500",
  // Big Ten
  "michigan": "#00274C", "michigan state": "#18453B", "ohio state": "#BB0000",
  "penn state": "#041E42", "indiana": "#990000", "purdue": "#CEB888",
  "iowa": "#FFCD00", "illinois": "#E84A27", "wisconsin": "#C5050C",
  "minnesota": "#7A0019", "nebraska": "#E41C38", "northwestern": "#4E2683",
  "maryland": "#E03A3E", "rutgers": "#CC0033",
  // Big 12
  "kansas": "#0051A5", "kansas state": "#512888", "oklahoma": "#841617",
  "oklahoma state": "#FF7300", "texas": "#BF5700", "texas tech": "#CC0000",
  "baylor": "#154734", "tcu": "#4D1979", "west virginia": "#002855",
  "iowa state": "#C8102E",
  // SEC
  "alabama": "#9E1B32", "auburn": "#0C2340", "georgia": "#BA0C2F",
  "florida": "#0021A5", "tennessee": "#FF8200", "lsu": "#461D7C",
  "kentucky": "#0033A0", "ole miss": "#CE1126", "mississippi": "#CE1126",
  "mississippi state": "#660000", "vanderbilt": "#866D4B", "south carolina": "#73000A",
  "arkansas": "#9D2235", "missouri": "#F1B82D", "texas a&m": "#500000",
  // Big East
  "villanova": "#00205B", "georgetown": "#041E42", "connecticut": "#000E2F",
  "uconn": "#000E2F", "st. john's": "#CC0000", "marquette": "#003366",
  "providence": "#002147", "seton hall": "#004B98", "xavier": "#0C2340",
  "creighton": "#005CA9", "depaul": "#005CB9", "butler": "#13294B",
  // American Athletic
  "cincinnati": "#E00122", "houston": "#C8102E", "south florida": "#006747",
  "ucf": "#BA9B37", "memphis": "#003087", "tulsa": "#002D62",
  "temple": "#9D2235", "east carolina": "#4B1869", "smu": "#0038A8",
  "tulane": "#006747",
  // Sun Belt / C-USA / Southland
  "troy": "#CC0000", "appalachian state": "#000000", "georgia state": "#002857",
  "louisiana": "#C10230", "mcneese": "#006B3F", "sam houston": "#EB6E1F",
  "lamar": "#CC0000", "nicholls": "#CC0000", "northwestern state": "#4F2D7F",
  "middle tennessee": "#003F87", "western kentucky": "#C60C30", "charlotte": "#046A38",
  "fau": "#003366", "north texas": "#00853E", "utsa": "#002A5C",
  "utep": "#FF6600", "louisiana tech": "#002F6C", "rice": "#002469",
  "southern miss": "#FFB300", "uab": "#1E6B24",
  // Mountain West
  "nevada": "#003366", "fresno state": "#CC0000", "new mexico": "#BA0C2F",
  "colorado state": "#1E4D2B", "san diego state": "#C41230", "boise state": "#0033A0",
  "wyoming": "#492F24", "unlv": "#CF0A2C", "utah state": "#00263A",
  "air force": "#003087", "hawaii": "#024731",
  // Pac-12
  "arizona": "#003366", "arizona state": "#8C1D40", "ucla": "#2D68C4",
  "usc": "#990000", "stanford": "#8C1515", "california": "#003262",
  "cal": "#003262", "oregon": "#154733", "oregon state": "#DC4405",
  "washington": "#4B2E83", "washington state": "#981E32",
  "utah": "#CC0000", "colorado": "#CFB87C",
  // NBA
  "lakers": "#552583", "celtics": "#007A33", "warriors": "#1D428A",
  "bulls": "#CE1141", "knicks": "#006BB6", "heat": "#98002E",
  "bucks": "#00471B", "nets": "#000000", "76ers": "#006BB6",
  "raptors": "#CE1141", "cavaliers": "#860038", "pistons": "#C8102E",
  "pacers": "#002D62", "hornets": "#1D1160", "hawks": "#C1D32F",
  "magic": "#0077C0", "wizards": "#002B5C", "spurs": "#C4CED4",
  "mavericks": "#00538C", "rockets": "#CE1141", "thunder": "#007AC1",
  "grizzlies": "#5D76A9", "pelicans": "#0C2340", "clippers": "#C8102E",
  "kings": "#5A2D81", "suns": "#1D1160", "nuggets": "#0E2240",
  "jazz": "#002B5C", "blazers": "#E03A3E", "trail blazers": "#E03A3E",
  "timberwolves": "#0C2340", "wolves": "#0C2340",
  // NHL
  "bruins": "#FFB81C", "sabres": "#003087", "red wings": "#CE1126",
  "canadiens": "#AF1E2D", "senators": "#E31837", "maple leafs": "#003E7E",
  "panthers": "#041E42", "lightning": "#002868", "capitals": "#041E42",
  "hurricanes": "#CC0000", "blue jackets": "#002654", "rangers": "#0038A8",
  "islanders": "#003087", "flyers": "#F74902", "penguins": "#FCB514",
  "blackhawks": "#CF0A2C", "predators": "#FFB81C", "blues": "#002F87",
  "jets": "#041E42", "wild": "#154734", "avalanche": "#6F263D",
  "stars": "#006847", "coyotes": "#8C2633", "kings": "#111111",
  "ducks": "#F47A38", "sharks": "#006D75", "flames": "#C8102E",
  "oilers": "#FF4C00", "canucks": "#00205B", "golden knights": "#B4975A",
  // NFL
  "patriots": "#002244", "bills": "#00338D", "dolphins": "#008E97",
  "jets": "#125740", "ravens": "#241773", "steelers": "#FFB612",
  "browns": "#FF3C00", "bengals": "#FB4F14", "texans": "#03202F",
  "colts": "#002C5F", "jaguars": "#006778", "titans": "#4B92DB",
  "broncos": "#FB4F14", "chiefs": "#E31837", "raiders": "#000000",
  "chargers": "#0080C6", "bears": "#0B162A", "lions": "#0076B6",
  "packers": "#203731", "vikings": "#4F2683", "falcons": "#A71930",
  "panthers": "#0085CA", "saints": "#D3BC8D", "buccaneers": "#D50A0A",
  "giants": "#0B2265", "eagles": "#004C54", "cowboys": "#003594",
  "commanders": "#5A1414", "49ers": "#AA0000", "seahawks": "#002244",
  "rams": "#003594", "cardinals": "#97233F",
};

/** Returns the primary hex color for a team name (case-insensitive, partial match) */
function getTeamColor(name) {
  if (!name) return "#888888";
  const key = name.toLowerCase().trim();
  if (TEAM_COLORS[key]) return TEAM_COLORS[key];
  // Partial match — find first entry whose key is contained in the name or vice versa
  for (const [k, v] of Object.entries(TEAM_COLORS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return "#888888"; // fallback neutral
}

/** Convert hex color to rgba string with given alpha (0–1) */
function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── KALSHI API ───────────────────────────────────────────────────────────────
// Your API key is stored in CodeSandbox environment variables as REACT_APP_KALSHI_API_KEY
const KALSHI_KEY = process.env.REACT_APP_KALSHI_API_KEY || "";

// NCAAB championship / tournament series tickers to try
const SPORTS_SERIES = [
  "KXNCAAMBCHAMP",
  "KXNCAABCHAMP",
  "KXNCAABTOURN",
  "KXNCAABMM",
  "KXNCAABTOURNAMENT",
  "KXNCAAMBGAME",
];

async function kalshiRequest(path) {
  // Route through our Vercel proxy instead of calling Kalshi directly
  // This avoids CORS issues since the proxy runs server-side
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const res = await fetch(`/api/kalshi?path=${encodeURIComponent(cleanPath)}`);
  if (!res.ok) throw new Error(`Kalshi API error: ${res.status}`);
  return res.json();
}

// Search for sports markets matching a query
// liveOnly: only return games currently in progress (close time within ±4h)
// default: return all of today's games
async function searchKalshiMarkets(query, { liveOnly = false } = {}) {
  try {
    const results = [];
    const now = new Date();

    const applyTimeFilter = (markets) => markets.filter((m) => {
      const expTime = m.expected_expiration_time ? new Date(m.expected_expiration_time) : null;
      if (!expTime) return true;
      if (liveOnly) {
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
        return expTime >= todayStart && expTime <= todayEnd;
      }
      // 2 days in the past (catches in-progress games) to 14 days out
      const pastWindow = new Date(now.getTime() - 2 * 24 * 3600 * 1000);
      return expTime >= pastWindow && expTime <= new Date(now.getTime() + 14 * 24 * 3600 * 1000);
    });

    // Series-based search (known sports series)
    for (const series of SPORTS_SERIES) {
      let cursor = null;
      do {
        let apiPath = `markets?status=open&limit=100&series_ticker=${encodeURIComponent(series)}`;
        if (cursor) apiPath += `&cursor=${encodeURIComponent(cursor)}`;

        const data = await kalshiRequest(apiPath);
        if (data && data.markets) {
          let markets = data.markets;
          if (query) {
            markets = markets.filter(
              (m) => m.title && m.title.toLowerCase().includes(query.toLowerCase())
            );
          }
          results.push(...applyTimeFilter(markets));
        }
        cursor = data?.cursor || null;
      } while (cursor);
    }


    // Deduplicate — group by event_ticker, keep only one market per game
    const seen = {};
    const deduped = [];
    for (const m of results) {
      const key = m.event_ticker || m.ticker;
      if (!seen[key]) {
        seen[key] = true;
        deduped.push(m);
      }
    }
    // Sort by expected game end time ascending (proxy for start time).
    // Tiebreak on open_time: markets for earlier games open earlier.
    deduped.sort((a, b) => {
      const FAR = new Date(8640000000000000);
      const ta = a.expected_expiration_time ? new Date(a.expected_expiration_time) : FAR;
      const tb = b.expected_expiration_time ? new Date(b.expected_expiration_time) : FAR;
      if (ta - tb !== 0) return ta - tb;
      const oa = a.open_time ? new Date(a.open_time) : FAR;
      const ob = b.open_time ? new Date(b.open_time) : FAR;
      return oa - ob;
    });

    return deduped;

  } catch (err) {
    console.error("Search error:", err);
    return null;
  }
}
// Get current odds for a specific market ticker
async function fetchMarketOdds(ticker) {
  try {
    const data = await kalshiRequest(`/markets/${ticker}`);
    const market = data.market || null;
    if (!market) {
      console.warn(`[Kalshi] ${ticker} returned no market object`, data);
    }
    return market;
  } catch (err) {
    console.error(`[Kalshi] fetchMarketOdds failed for ${ticker}:`, err.message);
    return null;
  }
}

// Extract the best YES probability from a Kalshi market object.
// Kalshi returns prices as dollar strings in 0.0–1.0 range (e.g. "0.0300" = 3%)
// using _dollars suffix fields. Priority: midpoint → ask → bid → last → 0.5
function extractYesProb(market) {
  const ask  = parseFloat(market.yes_ask_dollars)   || 0;
  const bid  = parseFloat(market.yes_bid_dollars)   || 0;
  const last = parseFloat(market.last_price_dollars) || 0;
  let prob;
  if (ask > 0 && bid > 0) prob = (ask + bid) / 2;
  else if (ask > 0)        prob = ask;
  else if (bid > 0)        prob = bid;
  else if (last > 0)       prob = last;
  else                     prob = 0.5;
  return +prob.toFixed(3);
}

// Convert Kalshi market data to our app's game format
function kalshiMarketToGame(market) {
  const yesPrice = extractYesProb(market);
  const noPrice = +(1 - yesPrice).toFixed(3);
  const ticker = market.ticker;
  // Restore persisted opening odds (set once at game start, survives page reloads)
  const storedOpen  = localStorage.getItem(`lm_open_${ticker}`);
  const openKalshi  = storedOpen ? parseFloat(storedOpen) : yesPrice;
  const openLocked  = !!storedOpen;
  // Restore persisted team-swap preference
  const swapped = localStorage.getItem(`lm_swap_${ticker}`) === "true";

  // Kalshi titles come in forms like:
  //   "Miami (OH) at SMU Winner"
  //   "Lakers vs Celtics"
  //   "Chiefs at Eagles Winner"
  // Strip trailing " Winner" (case-insensitive), then split on " at " or " vs "
  const raw = (market.title || market.subtitle || "Unknown Market")
    .replace(/\s+winner\??\s*$/i, "")
    .trim();

  let teamA, teamB;
  if (raw.includes(" at ")) {
    const parts = raw.split(" at ");
    teamA = parts[0]?.trim() || "Team A";
    teamB = parts[1]?.trim() || "Team B";
  } else if (raw.includes(" vs ")) {
    const parts = raw.split(" vs ");
    teamA = parts[0]?.trim() || "Team A";
    teamB = parts[1]?.trim() || "Team B";
  } else {
    teamA = raw;
    teamB = "Team B";
  }

  const title = `${teamA} vs ${teamB}`;

  return {
    id: market.ticker,
    ticker: market.ticker,
    sport: detectSport(market.ticker),
    title,
    teamA,
    teamB,
    subtitle: market.subtitle || "",
    score: "—",
    awayLine: null,
    homeLine: null,
    clock: "Live",
    gameSeconds: 0,
    pinned: false,
    expanded: false,
    feedExpanded: false,
    completed: false,
    alert: null,
    alertTriggered: false,
    openKalshi,
    openKalshiLocked: openLocked,
    swapped,
    kalshi: { yes: yesPrice, no: noPrice },
    history: [{ t: 0, teamA: yesPrice, teamB: noPrice }],
    plays: ["Live play-by-play will appear here as the game progresses"],
    isLive: true,
    ouLine: null,
    openOuLine: null,   // frozen on first ESPN value — never updated after set
    manualOuLine: null,  // user-entered O/U override — takes priority over openOuLine
    manualOuLine2: null, // optional second O/U comparison line
    currentTotal: 0,
    ouHistory: [],      // { t: gameSeconds, total: currentTotal } snapshots
  };
}

function detectSport(ticker = "") {
  if (ticker.startsWith("KXNBA"))    return "🏀 NBA";
  if (ticker.startsWith("KXNFL"))    return "🏈 NFL";
  if (ticker.startsWith("KXNHL"))    return "🏒 NHL";
  if (ticker.startsWith("KXNCAAMB")) return "🏀 NCAAB";
  if (ticker.startsWith("KXNCAAFB")) return "🏈 NCAAF";
  return "🏆 Sports";
}

// ─── ESPN LIVE DATA ───────────────────────────────────────────────────────────
const ESPN_URLS = {
  "🏀 NBA":   "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  "🏈 NFL":   "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  "🏒 NHL":   "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
  "🏀 NCAAB": "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard",
  "🏈 NCAAF": "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
};

async function fetchESPNEvents(sport) {
  const url = ESPN_URLS[sport];
  if (!url) return [];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
}

// Returns a Set of lowercased team name variants currently IN PROGRESS per ESPN.
// Used by the Live Now filter to cross-reference Kalshi search results.
async function fetchLiveTeamNames() {
  try {
    const events = await fetchESPNEvents("🏀 NCAAB");
    const names = new Set();
    events.forEach((ev) => {
      const s = ev.status?.type;
      // Only games with a running clock (not scheduled, not final)
      if (!s || s.completed || s.name === "STATUS_SCHEDULED" || s.name === "STATUS_PREGAME") return;
      ev.competitions?.[0]?.competitors?.forEach((c) => {
        [c.team?.displayName, c.team?.shortDisplayName, c.team?.abbreviation, c.team?.name]
          .forEach((n) => { if (n) names.add(n.toLowerCase()); });
      });
    });
    return names;
  } catch {
    return new Set();
  }
}

function matchESPNEvent(events, teamA, teamB) {
  const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ta = norm(teamA);
  const tb = norm(teamB);
  return events.find((ev) => {
    const competitors = ev.competitions?.[0]?.competitors || [];
    const hits = (target) =>
      competitors.some((c) =>
        [c.team.name, c.team.shortDisplayName, c.team.abbreviation, c.team.displayName]
          .map(norm)
          .some((n) => n && (n.includes(target) || target.includes(n)))
      );
    return hits(ta) && hits(tb);
  }) || null;
}

const DOW = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

// Total regulation seconds per sport
function totalGameSecondsForSport(sport) {
  if (sport.includes("NFL") || sport.includes("NCAAF")) return 4 * 15 * 60; // 3600
  if (sport.includes("NBA"))                            return 4 * 12 * 60; // 2880
  if (sport.includes("NHL"))                            return 3 * 20 * 60; // 3600
  return 2 * 20 * 60;                                                        // 2400 (NCAAB / default)
}

// Elapsed game seconds from ESPN period + displayClock
function computeGameElapsed(sport, period, displayClock, isCompleted) {
  const total = totalGameSecondsForSport(sport);
  if (isCompleted) return total;
  if (!period || period < 1) return 0;
  let periodSecs;
  if (sport.includes("NFL") || sport.includes("NCAAF")) periodSecs = 15 * 60;
  else if (sport.includes("NBA"))                        periodSecs = 12 * 60;
  else                                                   periodSecs = 20 * 60; // NCAAB halves & NHL periods
  const parts = (displayClock || "0:00").split(":");
  const remaining = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  return Math.max(0, Math.min((period - 1) * periodSecs + (periodSecs - remaining), total));
}

function extractESPNInfo(event, sport = "") {
  if (!event) return null;
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const competitors = comp.competitors || [];
  const away = competitors.find((c) => c.homeAway === "away");
  const home = competitors.find((c) => c.homeAway === "home");
  const awayAbbr  = away?.team?.abbreviation || "";
  const homeAbbr  = home?.team?.abbreviation || "";
  const awayScore = away?.score ?? null;
  const homeScore = home?.score ?? null;
  const hasScores = awayScore !== null && homeScore !== null;
  // Legacy single-line score (used in notifications)
  const score = hasScores ? `${awayAbbr} ${awayScore} – ${homeScore} ${homeAbbr}` : "—";
  // Two-line score: "TROY - 45" / "NEB  - 23"
  const awayLine = awayAbbr ? `${awayAbbr} - ${hasScores ? awayScore : "—"}` : null;
  const homeLine = homeAbbr ? `${homeAbbr} - ${hasScores ? homeScore : "—"}` : null;

  // ESPN returns times in ET (e.g. "7:30 PM ET", "7:30 PM EDT", "7:30 PM EST").
  // Match all Eastern variants, convert to CT (-1h), format as "THU 3/19 · 7:30".
  const rawClock = event.status?.type?.shortDetail || "—";
  const etMatch = rawClock.match(/^(\d+):(\d+)\s*(AM|PM)\s*E[SD]?T$/i);
  let clock = rawClock;
  if (etMatch) {
    let h = parseInt(etMatch[1], 10);
    const m = etMatch[2];
    const ampm = etMatch[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    h -= 1; // ET → CT
    if (h < 0) h += 24;
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    const timeStr = `${h12}:${m}`;
    // Pull day-of-week + date from the ESPN event timestamp
    const eventDate = event.date ? new Date(event.date) : new Date();
    const dow = DOW[eventDate.getDay()];
    const mo  = eventDate.getMonth() + 1;
    const dy  = eventDate.getDate();
    clock = `${dow} ${mo}/${dy} · ${timeStr}`;
  } else {
    // Strip trailing timezone label from live/final clocks (e.g. "Q3 4:22 ET")
    clock = rawClock.replace(/\s+E[SD]?T$/i, "").replace(/\s+[A-Z]{2,4}$/, "");
  }

  const odds  = comp.odds?.[0];
  const ouLine = odds?.overUnder != null ? String(odds.overUnder) : null;
  const currentTotal = hasScores
    ? (parseInt(awayScore, 10) || 0) + (parseInt(homeScore, 10) || 0)
    : 0;
  const period      = event.status?.period || 0;
  const displayClock = event.status?.displayClock || "";
  const isCompleted  = event.status?.type?.completed || false;
  const gameSeconds  = computeGameElapsed(sport, period, displayClock, isCompleted);
  return { score, awayLine, homeLine, clock, ouLine, currentTotal, gameSeconds };
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const pct = (v, dec = 1) => `${(v * 100).toFixed(dec)}%`;

function toAmerican(impliedProb) {
  if (impliedProb <= 0 || impliedProb >= 1) return "N/A";
  if (impliedProb >= 0.5)
    return `-${Math.round((impliedProb / (1 - impliedProb)) * 100)}`;
  return `+${Math.round(((1 - impliedProb) / impliedProb) * 100)}`;
}

function calcPayout(american, wager) {
  const a = parseFloat(american);
  if (isNaN(a) || wager <= 0) return 0;
  if (a > 0) return wager * (a / 100);
  if (a < 0) return wager * (100 / Math.abs(a));
  return 0;
}

function kellyFraction(p, b) {
  if (b <= 0 || p <= 0 || p >= 1) return 0;
  return Math.max(0, (b * p - (1 - p)) / b);
}

function breakEven(american) {
  const a = parseFloat(american);
  if (isNaN(a)) return null;
  if (a > 0) return 100 / (a + 100);
  if (a < 0) return Math.abs(a) / (Math.abs(a) + 100);
  return null;
}


// ─── KELLY CALCULATOR ─────────────────────────────────────────────────────────
function KellyCalc({ teamA, teamB, teamAProb, teamBProb, openKalshiA, openKalshiB, onDuplicate, onRemove, isOnly }) {
  const [isOpen, setIsOpen]         = useState(false);
  const [selectedTeam, setSelected] = useState("teamA");
  const [wager, setWager]           = useState("");

  // Always Kelly, always $1000 bankroll
  const BANKROLL = 1000;

  // Derived from selected team
  const currentProb = selectedTeam === "teamA" ? teamAProb : teamBProb;
  const openProb    = selectedTeam === "teamA" ? openKalshiA : openKalshiB;
  const teamName    = selectedTeam === "teamA" ? teamA : teamB;

  // Current market American odds string (for payout calculation)
  const oddsStr  = toAmerican(currentProb);
  const w        = parseFloat(wager);
  const aNum     = parseFloat(oddsStr);
  const netOdds  = !isNaN(aNum) ? (aNum > 0 ? aNum / 100 : 100 / Math.abs(aNum)) : 0;
  const payout   = calcPayout(oddsStr, w || 0);
  const beProb   = breakEven(oddsStr);

  // Kelly uses beginning odds as estimated win probability
  const edge         = openProb > 0 && beProb !== null ? openProb - beProb : null;
  const fullKelly    = openProb > 0 && netOdds > 0 ? kellyFraction(openProb, netOdds) : null;
  const halfKelly    = fullKelly !== null ? fullKelly / 2 : null;
  const fullKellyAmt = fullKelly !== null ? fullKelly * BANKROLL : null;
  const halfKellyAmt = halfKelly !== null ? halfKelly * BANKROLL : null;

  let gaugeColor = T.inputBorder, gaugeLabel = "—", gaugeWidth = 0;
  if (fullKellyAmt !== null && !isNaN(w) && w > 0 && fullKellyAmt > 0) {
    const ratio = w / fullKellyAmt;
    gaugeWidth = Math.min(100, ratio * 50);
    if (ratio < 0.5)       { gaugeColor = T.teamB;    gaugeLabel = "Under Kelly"; }
    else if (ratio <= 1.0) { gaugeColor = T.teamA;    gaugeLabel = "Within Kelly ✓"; }
    else if (ratio <= 1.5) { gaugeColor = "#c47f1a";  gaugeLabel = "Over Kelly ⚠"; }
    else                   { gaugeColor = T.alert;    gaugeLabel = "Well Over Kelly ✕"; }
  }

  const inputBase = {
    background: T.input, border: `1px solid ${T.inputBorder}`, borderRadius: 6,
    padding: "6px 8px", color: T.textPrimary, fontSize: "0.8rem",
    width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ marginBottom: 9 }}>

      {/* ── Header — matches play-by-play style ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: T.btnPrimary, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, padding: "4px 0" }}
          onClick={() => setIsOpen((o) => !o)}
        >
          {isOpen ? "▼" : "▶"} {isOpen ? "Hide" : "Show"} Kelly Calculator
        </button>
        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", color: T.textMuted, padding: "2px 5px" }}
            title="Duplicate"
            onClick={onDuplicate}
          >
            ⧉
          </button>
          {!isOnly && (
            <button
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", color: T.textMuted, padding: "2px 5px" }}
              title="Remove"
              onClick={onRemove}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded body ── */}
      {isOpen && (
        <div style={{ background: T.calcCard, border: `1px solid ${T.calcBorder}`, borderRadius: 9, padding: "10px 13px 13px", marginTop: 6 }}>

          {/* 3-col inputs: Team | Beginning Odds | Wager */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>

            {/* Team dropdown */}
            <div>
              <div style={{ fontSize: "0.63rem", color: T.textMuted, marginBottom: 3 }}>Team</div>
              <select
                style={inputBase}
                value={selectedTeam}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="teamA">{teamA} ({pct(teamAProb)})</option>
                <option value="teamB">{teamB} ({pct(teamBProb)})</option>
              </select>
            </div>

            {/* Beginning Odds (read-only) */}
            <div>
              <div style={{ fontSize: "0.63rem", color: T.textMuted, marginBottom: 3 }}>Beginning Odds</div>
              <div
                style={{ background: T.badge, border: `1px solid ${T.badgeBorder}`, borderRadius: 6, padding: "6px 8px", fontSize: "0.8rem", fontWeight: 700, color: T.textPrimary }}
              >
                {pct(openProb)}
              </div>
            </div>

            {/* Wager */}
            <div>
              <div style={{ fontSize: "0.63rem", color: T.textMuted, marginBottom: 3 }}>Wager ($)</div>
              <input style={inputBase} type="number" value={wager} onChange={(e) => setWager(e.target.value)} placeholder="50.00" />
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
            {[
              { label: "Profit on Win",  val: !isNaN(w) && w > 0 ? `+$${payout.toFixed(2)}` : "—",                                   color: payout > 0 && !isNaN(w) && w > 0 ? T.teamA : T.textFaint },
              { label: "Break-even %",   val: beProb !== null ? pct(beProb) : "—",                                                    color: T.textPrimary },
              { label: "Your Edge",      val: edge !== null ? `${edge > 0 ? "+" : ""}${(edge * 100).toFixed(1)}pp` : "—",             color: edge === null ? T.textFaint : edge > 0 ? T.teamA : T.alert },
              { label: "Full Kelly",     val: fullKelly !== null ? pct(fullKelly) : "—",     sub: fullKellyAmt !== null ? `$${fullKellyAmt.toFixed(0)}` : null, color: T.btnPrimary },
              { label: "Half Kelly",     val: halfKelly !== null ? pct(halfKelly) : "—",     sub: halfKellyAmt !== null ? `$${halfKellyAmt.toFixed(0)}` : null, color: T.textSecond },
              { label: "Total Return",   val: !isNaN(w) && w > 0 && payout > 0 ? `$${(w + payout).toFixed(2)}` : "—",               color: T.textPrimary },
            ].map(({ label, val, sub, color }) => (
              <div key={label} style={{ background: T.widget, border: `1px solid ${T.widgetBorder}`, borderRadius: 6, padding: "6px 9px" }}>
                <div style={{ fontSize: "0.62rem", color: T.textMuted, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color }}>
                  {val}
                  {sub && <span style={{ color: T.btnPrimary, fontSize: "0.72rem", marginLeft: 4 }}>({sub})</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Kelly gauge */}
          {fullKellyAmt !== null && !isNaN(w) && w > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: "0.68rem", color: T.textMuted }}>Bet size vs Kelly recommendation</span>
                <span style={{ fontSize: "0.68rem", color: gaugeColor, fontWeight: 700 }}>{gaugeLabel}</span>
              </div>
              <div style={{ background: T.widgetBorder, borderRadius: 4, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${gaugeWidth}%`, background: gaugeColor, height: "100%", borderRadius: 4, transition: "width 0.4s, background 0.4s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: "0.63rem", color: T.textFaint }}>
                <span>0%</span><span>½ Kelly</span><span>Full Kelly</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ALERT MODAL ──────────────────────────────────────────────────────────────
function AlertModal({ game, onSave, onClose }) {
  const [threshold, setThreshold] = useState(
    game.alert ? (game.alert.threshold * 100).toString() : "65"
  );
  const [direction, setDirection] = useState(game.alert?.direction || "above");
  const inputStyle = {
    background: T.input,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 6,
    padding: "7px 9px",
    color: T.textPrimary,
    fontSize: "0.82rem",
    width: "100%",
    boxSizing: "border-box",
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#00000066",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.modalBg,
          border: `1px solid ${T.modalBorder}`,
          borderRadius: 12,
          padding: 24,
          width: 310,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{ fontSize: "0.95rem", color: T.textPrimary, marginBottom: 4 }}
        >
          Set Price Alert
        </h3>
        <p
          style={{ fontSize: "0.72rem", color: T.textMuted, marginBottom: 16 }}
        >
          {game.title}
        </p>
        <div style={{ marginBottom: 11 }}>
          <div
            style={{ fontSize: "0.63rem", color: T.textMuted, marginBottom: 3 }}
          >
            Threshold (%)
          </div>
          <input
            style={inputStyle}
            type="number"
            min="1"
            max="99"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 11 }}>
          <div
            style={{ fontSize: "0.63rem", color: T.textMuted, marginBottom: 3 }}
          >
            Direction
          </div>
          <select
            style={inputStyle}
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="above">Goes above</option>
            <option value="below">Falls below</option>
          </select>
        </div>
        <div
          style={{
            display: "flex",
            gap: 7,
            justifyContent: "flex-end",
            marginTop: 16,
          }}
        >
          <button
            style={{
              background: "transparent",
              border: `1px solid ${T.inputBorder}`,
              color: T.textSecond,
              padding: "7px 13px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          {game.alert && (
            <button
              style={{
                background: "transparent",
                border: `1px solid ${T.alert}66`,
                color: T.alert,
                padding: "7px 13px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
              onClick={() => onSave(null)}
            >
              Remove
            </button>
          )}
          <button
            style={{
              background: T.btnPrimary,
              border: "none",
              color: T.btnPrimaryTxt,
              padding: "7px 15px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
            onClick={() => onSave({ threshold: +threshold / 100, direction })}
          >
            Save Alert
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ game, onConfirm, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#00000066",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.modalBg,
          border: `1px solid ${T.modalBorder}`,
          borderRadius: 12,
          padding: 24,
          width: 320,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: "0.95rem",
            color: T.textPrimary,
            marginBottom: 12,
          }}
        >
          Add to Dashboard?
        </h3>
        <div
          style={{
            background: T.calcCard,
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 16,
            border: `1px solid ${T.calcBorder}`,
          }}
        >
          <div
            style={{ fontWeight: 700, color: T.textPrimary, marginBottom: 2 }}
          >
            {game.title}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: T.textMuted,
              marginBottom: 10,
            }}
          >
            {game.sport} · {game.clock}
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              {
                label: `${game.teamA} WIN`,
                val: game.kalshi.yes,
                color: T.teamA,
              },
              {
                label: `${game.teamB} WIN`,
                val: game.kalshi.no,
                color: T.teamB,
              },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: T.textMuted,
                    marginBottom: 2,
                  }}
                >
                  {label}
                </div>
                <div style={{ color, fontWeight: 700 }}>
                  {toAmerican(val)}{" "}
                  <span style={{ color: T.textMuted, fontSize: "0.72rem" }}>
                    ({pct(val)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
          <button
            style={{
              background: "transparent",
              border: `1px solid ${T.inputBorder}`,
              color: T.textSecond,
              padding: "7px 13px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{
              background: T.btnPrimary,
              border: "none",
              color: T.btnPrimaryTxt,
              padding: "7px 15px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
            onClick={onConfirm}
          >
            + Add to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GAME WIDGET ──────────────────────────────────────────────────────────────
function GameWidget({
  game,
  onToggleExpand,
  onTogglePin,
  onRemove,
  onComplete,
  onSetAlert,
  onToggleFeed,
  onSwap,
  onSetOuLine,
  onSetOuLine2,
}) {
  // Apply swap flag: YES side always stays tied to kalshi.yes/teamA internally;
  // Swap only re-labels the teams (name + color). Probabilities stay in their
  // positions: left box = kalshi.yes (YES side), right box = kalshi.no (NO side).
  const aName  = game.swapped ? game.teamB : game.teamA;
  const bName  = game.swapped ? game.teamA : game.teamB;
  const aProb  = game.kalshi.yes;
  const bProb  = game.kalshi.no;
  const aOpen  = game.openKalshi;
  const bOpen  = +(1 - game.openKalshi).toFixed(3);
  const kDiff  = aProb - aOpen;
  const arrow = (d) => (d > 0.005 ? "↑" : d < -0.005 ? "↓" : "→");
  const arrowColor = (d) =>
    d > 0.005 ? T.teamA : d < -0.005 ? T.alert : T.textFaint;
  const [calcs, setCalcs] = useState([{ id: 1 }]);
  const [ouExpanded, setOuExpanded] = useState(false);
  const [ouInput, setOuInput] = useState(game.manualOuLine || "");
  const [ouInput2, setOuInput2] = useState(game.manualOuLine2 || "");
  const [showOuLine2, setShowOuLine2] = useState(!!game.manualOuLine2);
  const calcIdRef = useRef(2);
  const dupCalc = (id) => {
    const n = calcIdRef.current++;
    setCalcs((c) => {
      const i = c.findIndex((x) => x.id === id);
      const a = [...c];
      a.splice(i + 1, 0, { id: n });
      return a;
    });
  };
  const rmCalc = (id) => setCalcs((c) => c.filter((x) => x.id !== id));

  return (
    <div
      style={{
        background: T.widget,
        border: `1px solid ${
          game.alertTriggered
            ? T.alert
            : game.pinned
            ? T.pinned
            : T.widgetBorder
        }`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 2px 8px #0000001a",
        transition: "border-color .2s",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 9,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              background: T.badge,
              border: `1px solid ${T.badgeBorder}`,
              borderRadius: 5,
              padding: "2px 7px",
              fontSize: "0.7rem",
              color: T.textSecond,
            }}
          >
            {game.sport}
          </span>
          <span style={{ color: T.live, fontSize: "0.67rem", fontWeight: 700 }}>
            ● LIVE
          </span>
          {game.isLive && (
            <span
              style={{
                fontSize: "0.65rem",
                background: "#e8f5ee",
                color: T.teamA,
                border: `1px solid ${T.teamA}44`,
                borderRadius: 4,
                padding: "1px 6px",
                fontWeight: 600,
              }}
            >
              Kalshi
            </span>
          )}
          {game.pinned && <span style={{ fontSize: "0.67rem" }}>📌</span>}
          {game.alert && (
            <span
              style={{
                fontSize: "0.67rem",
                color: game.alertTriggered ? T.alert : T.btnPrimary,
              }}
            >
              🔔
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {[
            {
              icon: "⇄",
              title: "Swap teams (fix mis-labeled odds)",
              action: () => onSwap(game.id),
            },
            {
              icon: "🔕",
              title: "Set alert",
              action: () => onSetAlert(game.id),
            },
            {
              icon: "📌",
              title: game.pinned ? "Unpin" : "Pin",
              style: game.pinned ? {} : { filter: "grayscale(1)", opacity: 0.35 },
              action: () => onTogglePin(game.id),
            },
            {
              icon: "✓",
              title: "Mark completed",
              action: () => onComplete(game.id),
            },
            { icon: "✕", title: "Remove", action: () => onRemove(game.id) },
          ].map(({ icon, title, action, style: extraStyle }) => (
            <button
              key={title}
              title={title}
              onClick={action}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.82rem",
                padding: "3px 6px",
                borderRadius: 4,
                color: T.textMuted,
                ...extraStyle,
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Unified header: [Team A box] [vs + clock] [Team B box] */}
      <div
        style={{ cursor: "pointer", marginBottom: 10 }}
        onClick={() => onToggleExpand(game.id)}
      >
        {/* ▲/▼ hint */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 3 }}>
          <span style={{ fontSize: "0.62rem", color: T.textFaint }}>
            {game.expanded ? "▲ less" : "▼ more"}
          </span>
        </div>

        {(() => {
          const parseScore = (line) => line?.match(/\d+$/)?.[0] ?? "—";
          const parseAbbr  = (line, fallback) => line?.split(" - ")?.[0]?.trim() || fallback;
          const leftLine   = game.swapped ? game.homeLine : game.awayLine;
          const rightLine  = game.swapped ? game.awayLine : game.homeLine;
          const leftScore  = parseScore(leftLine);
          const rightScore = parseScore(rightLine);
          const aAbbr      = parseAbbr(leftLine, aName);
          const bAbbr      = parseAbbr(rightLine, bName);
          const aHex = getTeamColor(aName);
          const bHex = getTeamColor(bName);

          const boxBase = (hex) => ({
            flex: 1, minWidth: 0,
            background: hexToRgba(hex, 0.10),
            border: `1px solid ${hexToRgba(hex, 0.28)}`,
            borderRadius: 7, padding: "8px 10px",
            display: "flex", alignItems: "stretch", gap: 8,
          });

          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

              {/* Team A — name+score LEFT, stats RIGHT */}
              <div style={boxBase(aHex)}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{aAbbr}</span>
                  <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "#000000", lineHeight: 1.1, marginTop: 2 }}>{leftScore}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: aHex, fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.1 }}>{pct(aProb)}</span>
                  <span style={{ fontSize: "0.68rem", color: T.textFaint, marginTop: 2 }}>Open: {pct(aOpen)}</span>
                  <span style={{ fontSize: "0.62rem", color: T.textMuted, marginTop: 1, alignSelf: "flex-start" }}>Current: {toAmerican(aProb)}</span>
                </div>
              </div>

              {/* Center: vs + clock */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: "1.05rem", color: T.textMuted, fontWeight: 700 }}>vs</span>
                <span style={{ fontSize: "0.72rem", background: T.badge, color: T.btnPrimary, padding: "3px 9px", borderRadius: 4, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {game.clock}
                </span>
              </div>

              {/* Team B — stats LEFT, name+score RIGHT (mirror of A) */}
              <div style={boxBase(bHex)}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: bHex, fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.1 }}>{pct(bProb)}</span>
                  <span style={{ fontSize: "0.68rem", color: T.textFaint, marginTop: 2 }}>Open: {pct(bOpen)}</span>
                  <span style={{ fontSize: "0.62rem", color: T.textMuted, marginTop: 1, alignSelf: "flex-end" }}>Current: {toAmerican(bProb)}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bAbbr}</span>
                  <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "#000000", lineHeight: 1.1, marginTop: 2 }}>{rightScore}</span>
                </div>
              </div>

            </div>
          );
        })()}

        {game.alertTriggered && (
          <div style={{ marginTop: 6, fontSize: "0.71rem", color: T.alert, background: "#fff0ee", border: `1px solid ${T.alert}44`, borderRadius: 6, padding: "4px 9px", display: "inline-block" }}>
            🚨 Alert hit
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {game.expanded && (
        <div
          style={{
            marginTop: 14,
            borderTop: `1px solid ${T.divider}`,
            paddingTop: 14,
          }}
        >
          {/* Chart */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: "0.67rem",
                color: T.textMuted,
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Win Probability (Kalshi)
            </div>
            {(() => {
              const dotA = getTeamColor(aName);
              const dotB = getTeamColor(bName);
              const n    = game.history.length;
              // Full regulation duration in seconds (x-axis spans this entire range)
              const totalSecs = totalGameSecondsForSport(game.sport);
              // Static guide lines — always anchored to fixed fractions of game time
              const htX = totalSecs / 2;
              const q1X = totalSecs / 4;
              const q3X = 3 * totalSecs / 4;
              return (
                <>
                  <ResponsiveContainer width="100%" height={165}>
                    {/* history entries use t = actual elapsed game seconds */}
                    <LineChart data={game.history} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <XAxis dataKey="t" hide type="number" domain={[0, totalSecs]} />
                      <YAxis domain={[0, 1]} hide />
                      <Tooltip
                        formatter={(v, name) => [pct(v), name === "teamA" ? aName : bName]}
                        labelFormatter={() => ""}
                        contentStyle={{ background: T.modalBg, border: `1px solid ${T.modalBorder}`, borderRadius: 6, fontSize: 11, color: T.textPrimary }}
                      />
                      {/* Game Start — left edge */}
                      <ReferenceLine x={0} stroke={T.textMuted} strokeWidth={1} />
                      {/* Quarter / half marks — dashed guides */}
                      <ReferenceLine x={q1X} stroke={T.divider} strokeWidth={1} strokeDasharray="3 3" />
                      <ReferenceLine x={q3X} stroke={T.divider} strokeWidth={1} strokeDasharray="3 3" />
                      {/* Halftime — solid, label moved to bottom row below chart */}
                      <ReferenceLine x={htX} stroke={T.textFaint} strokeWidth={1.5} />
                      {/* Game End — right edge */}
                      <ReferenceLine x={totalSecs} stroke={T.textMuted} strokeWidth={1} />
                      <Line type="linear" dataKey="teamA" stroke="none" strokeWidth={0} isAnimationActive={false}
                        dot={(props) => {
                          const { cx, cy, index } = props;
                          const isLast = index === n - 1;
                          if (isLast) return (
                            <g key={`da-${index}`}>
                              <circle cx={cx} cy={cy} r={5} fill={dotA} />
                              <circle cx={cx} cy={cy} r={9} fill="none" stroke={dotA} strokeWidth={1.5} strokeOpacity={0.5} />
                            </g>
                          );
                          return <circle key={`da-${index}`} cx={cx} cy={cy} r={2.5} fill={dotA} fillOpacity={0.75} />;
                        }}
                        activeDot={false}
                      />
                      <Line type="linear" dataKey="teamB" stroke="none" strokeWidth={0} isAnimationActive={false}
                        dot={(props) => {
                          const { cx, cy, index } = props;
                          const isLast = index === n - 1;
                          if (isLast) return (
                            <g key={`db-${index}`}>
                              <circle cx={cx} cy={cy} r={5} fill={dotB} />
                              <circle cx={cx} cy={cy} r={9} fill="none" stroke={dotB} strokeWidth={1.5} strokeOpacity={0.5} />
                            </g>
                          );
                          return <circle key={`db-${index}`} cx={cx} cy={cy} r={2.5} fill={dotB} fillOpacity={0.75} />;
                        }}
                        activeDot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  {/* Bottom labels: Game Start | Halftime (center) | Game End — all on same line */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.62rem", color: T.textFaint, marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>
                    <span>◄ Game Start</span>
                    <span>Halftime</span>
                    <span>Game End ►</span>
                  </div>
                  {/* Team legend */}
                  <div style={{ display: "flex", gap: 16, fontSize: "0.68rem", justifyContent: "center", marginTop: 5 }}>
                    <span style={{ color: dotA, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill={dotA} /></svg>
                      {aName}
                    </span>
                    <span style={{ color: dotB, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill={dotB} /></svg>
                      {bName}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* O/U Tracker — collapsible, always visible */}
          <div style={{ borderTop: `1px solid ${T.divider}`, paddingTop: 12 }}>
            <button
              onClick={() => setOuExpanded((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.7rem",
                color: T.btnPrimary,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 0",
              }}
            >
              {ouExpanded ? "▼" : "▶"} {ouExpanded ? "Hide" : "Show"} O/U
            </button>
            {ouExpanded && (() => {
              // Manual entry takes priority; ESPN value is the fallback
              const effectiveOuLine = game.manualOuLine || game.openOuLine;
              const GOLD = "#F59E0B";
              const HIST_DOT = "#14532d";

              const LINE2_COLOR = "#60a5fa";
              // O/U input row — primary line + optional second comparison line
              const inputRow = (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Primary O/U */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: "0.8rem", color: T.textMuted, fontWeight: 600 }}>O/U Line</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number" step="0.5"
                        placeholder={game.openOuLine || "e.g. 152.5"}
                        value={ouInput}
                        onChange={(e) => setOuInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { onSetOuLine(game.id, e.target.value); e.target.blur(); }
                          if (e.key === "Escape") { setOuInput(game.manualOuLine || ""); e.target.blur(); }
                        }}
                        onBlur={(e) => onSetOuLine(game.id, e.target.value)}
                        style={{ width: "100%", padding: "5px 9px", borderRadius: 5, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: "0.9rem", fontWeight: 600 }}
                      />
                    </div>
                    {game.manualOuLine && <span style={{ fontSize: "0.72rem", color: GOLD, fontWeight: 600 }}>✎ manual</span>}
                    {game.openOuLine && !game.manualOuLine && <span style={{ fontSize: "0.72rem", color: T.textFaint }}>ESPN</span>}
                    {!showOuLine2 && (
                      <button
                        onClick={() => setShowOuLine2(true)}
                        title="Add comparison O/U line"
                        style={{ background: "none", border: "none", cursor: "pointer", color: T.textSecond, fontSize: "0.8rem", fontWeight: 700, padding: "0", textAlign: "left" }}
                      >+ Add compare</button>
                    )}
                  </div>
                  {/* Secondary O/U comparison */}
                  {showOuLine2 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontSize: "0.8rem", color: LINE2_COLOR, fontWeight: 600 }}>Compare</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="number" step="0.5"
                          placeholder="e.g. 158.0"
                          value={ouInput2}
                          onChange={(e) => setOuInput2(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { onSetOuLine2(game.id, e.target.value); e.target.blur(); }
                            if (e.key === "Escape") { setOuInput2(game.manualOuLine2 || ""); e.target.blur(); }
                          }}
                          onBlur={(e) => onSetOuLine2(game.id, e.target.value)}
                          style={{ width: "100%", padding: "5px 9px", borderRadius: 5, border: `1px solid ${LINE2_COLOR}`, background: T.inputBg, color: T.textPrimary, fontSize: "0.9rem", fontWeight: 600 }}
                        />
                        <button
                          onClick={() => { setShowOuLine2(false); setOuInput2(""); onSetOuLine2(game.id, ""); }}
                          title="Remove comparison line"
                          style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint, fontSize: "0.85rem", padding: "0 2px", flexShrink: 0 }}
                        >✕</button>
                      </div>
                    </div>
                  )}
                </div>
              );

              if (!effectiveOuLine) return (
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginTop: 8 }}>
                  <div style={{ flex: 3, fontSize: "0.72rem", color: T.textFaint, paddingTop: 4 }}>
                    Enter the O/U above to see the trend line.
                  </div>
                  <div style={{ flex: 1 }}>{inputRow}</div>
                </div>
              );

              const openOu = parseFloat(effectiveOuLine) || 0;
              const totalSecs = totalGameSecondsForSport(game.sport);
              const htX = totalSecs / 2;
              const q1X = totalSecs / 4;
              const q3X = 3 * totalSecs / 4;
              const n = game.ouHistory.length;
              const ou2 = game.manualOuLine2 ? parseFloat(game.manualOuLine2) : null;
              const seenT = new Set();
              const ouChartData = [
                { t: 0, trend: 0, ...(ou2 != null ? { trend2: 0 } : {}) },
                ...game.ouHistory.map((h, i) => ({
                  t: h.t,
                  total: h.total,
                  isLast: i === n - 1,
                  trend: +(h.t / totalSecs * openOu).toFixed(1),
                  ...(ou2 != null ? { trend2: +(h.t / totalSecs * ou2).toFixed(1) } : {}),
                })),
                { t: totalSecs, trend: openOu, ...(ou2 != null ? { trend2: ou2 } : {}) },
              ]
                .sort((a, b) => a.t - b.t)
                .filter((p) => { if (seenT.has(p.t)) return false; seenT.add(p.t); return true; });
              const latestScore = n > 0 ? game.ouHistory[n - 1].total : 0;
              const yMax = Math.max(
                openOu * 1.15,
                ou2 != null ? ou2 * 1.15 : 0,
                latestScore > 0 ? latestScore * 1.1 : 0
              ) || openOu * 1.15;
              return (
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginTop: 8 }}>
                  {/* Chart — 75% width */}
                  <div style={{ flex: 3, minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={248}>
                      <LineChart data={ouChartData} margin={{ top: 4, right: 30, left: 4, bottom: 4 }}>
                        <XAxis dataKey="t" hide type="number" domain={[0, totalSecs]} />
                        <YAxis hide domain={[0, yMax]} />
                        <Tooltip
                          formatter={(v, name) => name === "total" ? [`${v} pts`, "Score"] : [`${v}`, "O/U Pace"]}
                          labelFormatter={() => ""}
                          contentStyle={{ background: T.modalBg, border: `1px solid ${T.modalBorder}`, borderRadius: 6, fontSize: 11, color: T.textPrimary }}
                        />
                        <ReferenceLine x={0} stroke={T.textMuted} strokeWidth={1} />
                        <ReferenceLine x={q1X} stroke={T.divider} strokeWidth={1} strokeDasharray="3 3" />
                        <ReferenceLine x={htX} stroke={T.textFaint} strokeWidth={1.5} />
                        <ReferenceLine x={q3X} stroke={T.divider} strokeWidth={1} strokeDasharray="3 3" />
                        <ReferenceLine x={totalSecs} stroke={T.textMuted} strokeWidth={1} />
                        <ReferenceLine
                          y={openOu}
                          stroke="transparent"
                          label={{ value: effectiveOuLine, position: "right", fontSize: 9, fill: GOLD, fontWeight: 700 }}
                        />
                        <Line type="linear" dataKey="trend" stroke={GOLD} strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} activeDot={false} />
                        {ou2 != null && <>
                          <ReferenceLine y={ou2} stroke="transparent" label={{ value: game.manualOuLine2, position: "right", fontSize: 9, fill: LINE2_COLOR, fontWeight: 700 }} />
                          <Line type="linear" dataKey="trend2" stroke={LINE2_COLOR} strokeWidth={1.5} strokeDasharray="3 2" dot={false} isAnimationActive={false} activeDot={false} />
                        </>}
                        <Line type="linear" dataKey="total" stroke="none" strokeWidth={0} isAnimationActive={false} connectNulls={false}
                          dot={(props) => {
                            const { cx, cy, payload, index } = props;
                            if (payload.total == null) return <g key={`ou-${index}`} />;
                            if (payload.isLast) return (
                              <g key={`ou-${index}`}>
                                <circle cx={cx} cy={cy} r={5} fill={GOLD} />
                                <circle cx={cx} cy={cy} r={9} fill="none" stroke={GOLD} strokeWidth={1.5} strokeOpacity={0.5} />
                              </g>
                            );
                            return <circle key={`ou-${index}`} cx={cx} cy={cy} r={2.5} fill={HIST_DOT} fillOpacity={0.85} />;
                          }}
                          activeDot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.62rem", color: T.textFaint, marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>
                      <span>◄ Game Start</span>
                      <span>Halftime</span>
                      <span>Game End ►</span>
                    </div>
                  </div>
                  {/* Inputs — 25% width */}
                  <div style={{ flex: 1 }}>{inputRow}</div>
                </div>
              );
            })()}
          </div>

          {/* Kelly calculators */}
          <div style={{ borderTop: `1px solid ${T.divider}`, paddingTop: 12 }}>
            {calcs.map((c) => (
              <KellyCalc
                key={c.id}
                teamA={aName}
                teamB={bName}
                teamAProb={aProb}
                teamBProb={bProb}
                openKalshiA={aOpen}
                openKalshiB={bOpen}
                onDuplicate={() => dupCalc(c.id)}
                onRemove={() => rmCalc(c.id)}
                isOnly={calcs.length === 1}
              />
            ))}
          </div>

          {/* Play-by-play */}
          <div style={{ marginTop: 14, borderTop: `1px solid ${T.divider}`, paddingTop: 12 }}>
            <button
              onClick={() => onToggleFeed(game.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.7rem",
                color: T.btnPrimary,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 0",
              }}
            >
              {game.feedExpanded ? "▼" : "▶"} {game.feedExpanded ? "Hide" : "Show"}{" "}
              Play-by-Play
            </button>
            {game.feedExpanded && (
              <div
                style={{
                  background: T.calcCard,
                  border: `1px solid ${T.calcBorder}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginTop: 6,
                  maxHeight: 160,
                  overflowY: "auto",
                }}
              >
                {[...game.plays].reverse().map((play, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "0.74rem",
                      color: T.textSecond,
                      padding: "4px 0",
                      borderBottom:
                        i < game.plays.length - 1
                          ? `1px solid ${T.divider}`
                          : "none",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span style={{ color: T.textFaint, flexShrink: 0 }}>•</span>
                    <span>{play}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SEARCH TAB ───────────────────────────────────────────────────────────────
function SearchTab({ onAddGame, dashboardIds }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  // confirmGame removed — single-click add
  const [sportFilter, setSportFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [liveNowMode, setLiveNowMode] = useState(false);
  const searchRef = useRef(null);

  // Load today's markets on mount; debounce typed queries by 600ms
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      setLoading(true);
      setApiError(false);
      // When Live Now is active, fetch Kalshi + ESPN in parallel
      const [data, liveNames] = await Promise.all([
        searchKalshiMarkets(query, { liveOnly: liveNowMode }),
        liveNowMode ? fetchLiveTeamNames() : Promise.resolve(null),
      ]);
      if (data === null) {
        setApiError(true);
        setResults([]);
      } else {
        let games = data.map(kalshiMarketToGame);
        // Cross-reference with ESPN: only keep games where at least one team
        // is currently in progress per the live scoreboard
        if (liveNowMode && liveNames && liveNames.size > 0) {
          games = games.filter((g) =>
            liveNames.has(g.teamA.toLowerCase()) || liveNames.has(g.teamB.toLowerCase())
          );
        }
        setResults(games);
      }
      setLoading(false);
    }, query.length > 0 ? 600 : 0);
    return () => clearTimeout(searchRef.current);
  }, [query, refreshKey, liveNowMode]);

  const handleLiveNow = () => {
    setSportFilter("all");
    setQuery("");
    setLiveNowMode((prev) => !prev);
  };

  const sports = ["all", ...new Set(results.map((g) => g.sport))];
  const filtered = results.filter(
    (g) => sportFilter === "all" || g.sport === sportFilter
  );
  const inputStyle = {
    background: T.input,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 7,
    padding: "8px 11px",
    color: T.textPrimary,
    fontSize: "0.82rem",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: T.textPrimary,
            marginBottom: 3,
          }}
        >
          Search Live Markets
        </h2>
        <p style={{ fontSize: "0.73rem", color: T.textMuted }}>
          Searching real Kalshi markets — type a team or sport
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
          placeholder="e.g. Lakers, Chiefs, Yankees…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (liveNowMode) setLiveNowMode(false);
          }}
        />
        <button
          onClick={handleLiveNow}
          style={{
            background: liveNowMode ? T.live : T.badge,
            border: `1px solid ${liveNowMode ? T.live : T.badgeBorder}`,
            color: liveNowMode ? "#fff" : T.textSecond,
            padding: "8px 13px",
            borderRadius: 7,
            cursor: "pointer",
            fontSize: "0.78rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          ● Live Now
        </button>
      </div>

      {results.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 7,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          {sports.map((s) => (
            <button
              key={s}
              style={{
                padding: "5px 12px",
                borderRadius: 14,
                border: `1px solid ${
                  sportFilter === s ? T.btnPrimary : T.badgeBorder
                }`,
                background: sportFilter === s ? T.btnPrimary : T.badge,
                color: sportFilter === s ? T.btnPrimaryTxt : T.textSecond,
                cursor: "pointer",
                fontSize: "0.73rem",
                fontWeight: sportFilter === s ? 600 : 400,
              }}
              onClick={() => setSportFilter(s)}
            >
              {s === "all" ? "All Sports" : s}
            </button>
          ))}
        </div>
      )}

      {/* Status messages */}
      {!KALSHI_KEY && (
        <div
          style={{
            background: "#fff8ee",
            border: `1px solid ${T.notifBorder}`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: "0.78rem",
            color: T.notifTxt,
          }}
        >
          ⚠ No API key found. Add{" "}
          <code
            style={{ background: T.badge, padding: "1px 4px", borderRadius: 3 }}
          >
            REACT_APP_KALSHI_API_KEY
          </code>{" "}
          to your CodeSandbox environment variables.
        </div>
      )}
      {apiError && (
        <div
          style={{
            background: "#fff0ee",
            border: `1px solid ${T.alert}44`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: "0.78rem",
            color: T.alert,
          }}
        >
          ⚠ Could not reach Kalshi API. Check your API key or try again shortly.
        </div>
      )}
      {loading && (
        <div
          style={{ color: T.textMuted, fontSize: "0.82rem", padding: "12px 0" }}
        >
          Searching Kalshi markets…
        </div>
      )}
      {!loading && !apiError && results.length === 0 && query && (
        <div
          style={{ color: T.textMuted, fontSize: "0.82rem", padding: "12px 0" }}
        >
          No markets found for "{query}"
        </div>
      )}
      {!loading && !apiError && results.length === 0 && !query && liveNowMode && (
        <div
          style={{ color: T.textMuted, fontSize: "0.82rem", padding: "12px 0" }}
        >
          No games live right now.
        </div>
      )}
      {!loading && !apiError && results.length === 0 && !query && !liveNowMode && (
        <div
          style={{ color: T.textMuted, fontSize: "0.82rem", padding: "12px 0" }}
        >
          No games scheduled for today. Try searching for a team.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 9 }}>
        {filtered.map((g) => {
          const added = dashboardIds.includes(g.id);
          return (
            <div
              key={g.id}
              style={{
                background: T.widget,
                border: `1px solid ${added ? T.badgeBorder : T.widgetBorder}`,
                borderRadius: 10,
                padding: "12px 13px",
                boxShadow: "0 1px 4px #0000001a",
                display: "flex",
                flexDirection: "column",
                gap: 9,
                opacity: added ? 0.7 : 1,
              }}
            >
              {/* Sport + live badges */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ background: T.badge, border: `1px solid ${T.badgeBorder}`, borderRadius: 5, padding: "2px 7px", fontSize: "0.68rem", color: T.textSecond }}>
                  {g.sport}
                </span>
                <span style={{ color: T.live, fontSize: "0.65rem", fontWeight: 700 }}>● LIVE</span>
              </div>

              {/* Title */}
              <div style={{ fontWeight: 700, fontSize: "0.92rem", color: T.textPrimary, lineHeight: 1.3 }}>
                {g.title}
              </div>

              {/* Odds row */}
              <div style={{ display: "flex", gap: 7 }}>
                {[
                  { label: g.teamA, val: g.kalshi.yes, color: T.teamA },
                  { label: g.teamB, val: g.kalshi.no,  color: T.teamB },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ flex: 1, background: T.calcCard, border: `1px solid ${T.calcBorder}`, borderRadius: 6, padding: "5px 8px" }}>
                    <div style={{ fontSize: "0.6rem", color: T.textMuted, fontWeight: 600, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ color, fontWeight: 800, fontSize: "0.95rem" }}>{pct(val)}</span>
                      <span style={{ fontSize: "0.68rem", color: T.textMuted }}>{toAmerican(val)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <button
                style={{
                  background: added ? T.badge : T.btnPrimary,
                  border: `1px solid ${added ? T.badgeBorder : T.btnPrimary}`,
                  color: added ? T.textMuted : T.btnPrimaryTxt,
                  padding: "6px 0",
                  borderRadius: 6,
                  cursor: added ? "default" : "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  width: "100%",
                }}
                onClick={() => !added && onAddGame(g)}
                disabled={added}
              >
                {added ? "✓ Added" : "+ Add to Dashboard"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PIN PERSISTENCE ──────────────────────────────────────────────────────────
const PINNED_KEY = "dingus_pinned_ids";
function loadPinnedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(PINNED_KEY) || "[]")); }
  catch { return new Set(); }
}
function savePinnedIds(games) {
  try {
    const ids = games.filter((g) => g.pinned).map((g) => g.id);
    localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
  } catch {}
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [games, setGames] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [alertTarget, setAlertTarget] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const tickRef  = useRef(0);
  const gamesRef = useRef([]);
  useEffect(() => { gamesRef.current = games; }, [games]);

  // Poll ESPN every 30s for live scores + O/U line
  useEffect(() => {
    const poll = async () => {
      const cur = gamesRef.current;
      if (!cur.length) return;
      const sports = [...new Set(cur.filter((g) => !g.completed).map((g) => g.sport))];
      for (const sport of sports) {
        const events = await fetchESPNEvents(sport);
        if (!events.length) continue;
        setGames((prev) =>
          prev.map((g) => {
            if (g.sport !== sport || g.completed) return g;
            const ev   = matchESPNEvent(events, g.teamA, g.teamB);
            const info = extractESPNInfo(ev, g.sport);
            if (!info) return g;
            return {
              ...g,
              score: info.score,
              awayLine: info.awayLine,
              homeLine: info.homeLine,
              clock: info.clock,
              ouLine: info.ouLine,
              // openOuLine is set once on first non-null value and never updated again
              openOuLine: g.openOuLine ?? info.ouLine,
              currentTotal: info.currentTotal,
              gameSeconds: info.gameSeconds,
            };
          })
        );
      }
    };
    poll();
    const iv = setInterval(poll, 30000);
    return () => clearInterval(iv);
  }, []); // reads games via gamesRef — no re-registration needed

  // Poll Kalshi every 5 seconds — updates kalshi.yes/no only (no history here)
  // Uses gamesRef to avoid stale closure; dep array is [] so interval never resets
  useEffect(() => {
    const iv = setInterval(async () => {
      // 1. Simulated random walk for demo (non-live) games
      setGames((prev) =>
        prev.map((g) => {
          if (g.isLive || g.completed) return g;
          const nK = Math.max(0.05, Math.min(0.95, g.kalshi.yes + (Math.random() * 0.03 - 0.015)));
          let alertTriggered = g.alertTriggered;
          if (g.alert && !g.alertTriggered) {
            const hit = g.alert.direction === "above" ? nK >= g.alert.threshold : nK <= g.alert.threshold;
            if (hit) {
              alertTriggered = true;
              setNotifications((n) => [{ id: Date.now(), text: `${g.title}: ${g.teamA} WIN crossed ${pct(g.alert.threshold)}` }, ...n.slice(0, 3)]);
            }
          }
          return { ...g, kalshi: { yes: +nK.toFixed(3), no: +(1 - nK).toFixed(3) }, alertTriggered };
        })
      );

      // 2. Fetch fresh Kalshi odds for all live dashboard games
      const liveGames = gamesRef.current.filter((g) => g.isLive && !g.completed);
      for (const g of liveGames) {
        const market = await fetchMarketOdds(g.ticker);
        if (!market) continue;
        const nK = extractYesProb(market);
        setGames((prev) =>
          prev.map((pg) => {
            if (pg.id !== g.id) return pg;
            let alertTriggered = pg.alertTriggered;
            if (pg.alert && !pg.alertTriggered) {
              const hit = pg.alert.direction === "above" ? nK >= pg.alert.threshold : nK <= pg.alert.threshold;
              if (hit) {
                alertTriggered = true;
                setNotifications((n) => [{ id: Date.now(), text: `${pg.title}: ${pg.teamA} WIN crossed ${pct(pg.alert.threshold)}` }, ...n.slice(0, 3)]);
              }
            }
            return { ...pg, kalshi: { yes: +nK.toFixed(3), no: +(1 - nK).toFixed(3) }, alertTriggered };
          })
        );
      }
    }, 5000);
    return () => clearInterval(iv);
  }, []); // gamesRef keeps this fresh without re-registering

  // Snapshot current probabilities into history every 30 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      setGames((prev) =>
        prev.map((g) => {
          // Only snapshot while game is actively in progress.
          // gameSeconds > 0 means ESPN has confirmed the clock is running.
          if (g.completed || !g.gameSeconds || g.gameSeconds <= 0) return g;
          // First time the game goes live: lock in the opening probability so
          // "Open %" never changes and persists across page reloads.
          let openKalshi = g.openKalshi;
          let openKalshiLocked = g.openKalshiLocked;
          if (!openKalshiLocked) {
            openKalshi = g.kalshi.yes;
            openKalshiLocked = true;
            localStorage.setItem(`lm_open_${g.id}`, String(openKalshi));
          }
          return {
            ...g,
            openKalshi,
            openKalshiLocked,
            history: [
              ...g.history,
              { t: g.gameSeconds, teamA: g.kalshi.yes, teamB: g.kalshi.no },
            ],
            ouHistory: [
              ...g.ouHistory,
              { t: g.gameSeconds, total: g.currentTotal },
            ],
          };
        })
      );
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const toggleExpand = (id) =>
    setGames((p) =>
      p.map((g) => (g.id === id ? { ...g, expanded: !g.expanded } : g))
    );
  const togglePin = (id) =>
    setGames((p) => {
      const updated = p.map((g) => (g.id === id ? { ...g, pinned: !g.pinned } : g));
      savePinnedIds(updated);
      return updated;
    });
  const toggleFeed = (id) =>
    setGames((p) =>
      p.map((g) => (g.id === id ? { ...g, feedExpanded: !g.feedExpanded } : g))
    );
  const removeGame = (id) => setGames((p) => p.filter((g) => g.id !== id));
  const setGameOuLine = (id, val) =>
    setGames((p) =>
      p.map((g) => (g.id === id ? { ...g, manualOuLine: val || null } : g))
    );
  const setGameOuLine2 = (id, val) =>
    setGames((p) =>
      p.map((g) => (g.id === id ? { ...g, manualOuLine2: val || null } : g))
    );
  const swapGame = (id) =>
    setGames((p) =>
      p.map((g) => {
        if (g.id !== id) return g;
        const ns = !g.swapped;
        localStorage.setItem(`lm_swap_${g.id}`, String(ns));
        return { ...g, swapped: ns };
      })
    );
  const completeGame = (id) =>
    setGames((p) =>
      p.map((g) =>
        g.id === id
          ? { ...g, completed: true, expanded: false, feedExpanded: false }
          : g
      )
    );
  const addGame = useCallback(
    (game) =>
      setGames((p) => {
        // Default new games to pinned=true unless the user previously unpinned this exact game
        const savedPins = loadPinnedIds();
        // If the game ID has been seen before it will be in the set only if it was pinned;
        // for a brand-new game (never stored) we also default to true.
        const pinned = savedPins.size === 0 || savedPins.has(game.id) ? true : false;
        return [
          ...p,
          { ...game, pinned, expanded: false, feedExpanded: false, completed: false },
        ];
      }),
    []
  );
  const saveAlert = (id, alert) => {
    setGames((p) =>
      p.map((g) => (g.id === id ? { ...g, alert, alertTriggered: false } : g))
    );
    setAlertTarget(null);
  };

  const alertGame = alertTarget
    ? games.find((g) => g.id === alertTarget)
    : null;
  const active = games.filter((g) => !g.completed);
  const completed = games.filter((g) => g.completed);
  const pinned = active.filter((g) => g.pinned);
  const unpinned = active.filter((g) => !g.pinned);

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
    gap: 10,
    alignItems: "start",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.pageBg,
        color: T.textPrimary,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: "14px",
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} button:hover{opacity:0.82} input:focus,select:focus{outline:2px solid ${T.btnPrimary}88!important;outline-offset:0}`}</style>

      {/* Nav */}
      <div
        style={{
          background: T.navBg,
          borderBottom: `1px solid ${T.navBorder}`,
          padding: "0 24px",
          height: 52,
          display: "flex",
          alignItems: "center",
          gap: 20,
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 2px 8px #0000002a",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#FFFFFF" }}>
            Dingus Dashboard
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {[
            ["dashboard", "📊 Dashboard"],
            ["search", "🔍 Search Markets"],
          ].map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? "#00000033" : "none",
                border: "none",
                color: tab === t ? "#FFFFFF" : "#A8D5A2",
                padding: "6px 14px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: tab === t ? 700 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.72rem",
            color: "#FFFFFF",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#f87171",
              display: "inline-block",
              animation: "pulse 1.5s infinite",
            }}
          />
          {KALSHI_KEY ? "Live · Kalshi" : "Demo mode"}
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div
          style={{
            background: T.notifBg,
            borderBottom: `1px solid ${T.notifBorder}`,
            padding: "7px 24px",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                background: "#fff8ee",
                border: `1px solid ${T.notifBorder}`,
                borderLeft: `3px solid ${T.pinned}`,
                borderRadius: 6,
                padding: "4px 11px",
                fontSize: "0.75rem",
                color: T.notifTxt,
              }}
            >
              🔔 {n.text}
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "10px 10px" }}>
        {!KALSHI_KEY && (
          <div
            style={{
              background: "#fff8ee",
              border: `1px solid ${T.notifBorder}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: "0.76rem",
              color: T.notifTxt,
            }}
          >
            <strong>Demo mode</strong> — Add your Kalshi API key as{" "}
            <code
              style={{
                background: T.badge,
                padding: "1px 5px",
                borderRadius: 3,
                fontFamily: "monospace",
              }}
            >
              REACT_APP_KALSHI_API_KEY
            </code>{" "}
            in CodeSandbox environment variables to enable live data.
          </div>
        )}

        {tab === "dashboard" && (
          <div>

            {active.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: T.textMuted }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>📊</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No markets tracked</div>
                <div style={{ fontSize: "0.78rem", marginBottom: 16 }}>
                  Search Kalshi markets to add them to your dashboard
                </div>
                <button
                  style={{ background: T.btnPrimary, border: "none", color: T.btnPrimaryTxt, padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}
                  onClick={() => setTab("search")}
                >
                  Search Markets
                </button>
              </div>
            )}

            {/* Single unified grid — pinned first, then unpinned */}
            {active.length > 0 && (
              <div style={gridStyle}>
                {[...pinned, ...unpinned].map((g) => (
                  <GameWidget
                    key={g.id}
                    game={g}
                    onToggleExpand={toggleExpand}
                    onTogglePin={togglePin}
                    onRemove={removeGame}
                    onComplete={completeGame}
                    onSetAlert={setAlertTarget}
                    onToggleFeed={toggleFeed}
                    onSwap={swapGame}
                    onSetOuLine={setGameOuLine}
                    onSetOuLine2={setGameOuLine2}
                  />
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div
                style={{
                  marginTop: 28,
                  borderTop: `1px solid ${T.divider}`,
                  paddingTop: 18,
                }}
              >
                <button
                  onClick={() => setShowCompleted((s) => !s)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: T.sectionTxt,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    marginBottom: 12,
                  }}
                >
                  {showCompleted ? "▼" : "▶"} Completed ({completed.length})
                </button>
                {showCompleted && (
                  <div style={{ ...gridStyle, opacity: 0.65 }}>
                    {completed.map((g) => (
                      <div
                        key={g.id}
                        style={{
                          background: T.widget,
                          border: `1px solid ${T.widgetBorder}`,
                          borderRadius: 11,
                          padding: "13px 15px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              background: T.badge,
                              border: `1px solid ${T.badgeBorder}`,
                              borderRadius: 5,
                              padding: "2px 7px",
                              fontSize: "0.7rem",
                              color: T.textSecond,
                            }}
                          >
                            {g.sport}
                          </span>
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              color: T.textMuted,
                            }}
                            onClick={() => removeGame(g.id)}
                          >
                            ✕
                          </button>
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            color: T.textPrimary,
                            marginTop: 8,
                          }}
                        >
                          {g.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: T.textMuted,
                            marginTop: 2,
                          }}
                        >
                          Final · {g.score}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "search" && (
          <SearchTab
            onAddGame={addGame}
            dashboardIds={games.map((g) => g.id)}
          />
        )}
      </div>

      {alertGame && (
        <AlertModal
          game={alertGame}
          onSave={(a) => saveAlert(alertGame.id, a)}
          onClose={() => setAlertTarget(null)}
        />
      )}
    </div>
  );
}
