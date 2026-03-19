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

// ─── KALSHI API ───────────────────────────────────────────────────────────────
// Your API key is stored in CodeSandbox environment variables as REACT_APP_KALSHI_API_KEY
const KALSHI_KEY = process.env.REACT_APP_KALSHI_API_KEY || "";
const KALSHI_BASE = "https://trading-api.kalshi.com/trade-api/v2";

// Sports series prefixes we care about
const SPORTS_SERIES = ["KXNBAGAME", "KXNFLGAME", "KXNHLGAME", "KXNCAAMBGAME", "KXNCAAFBGAME"];

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

    for (const series of SPORTS_SERIES) {
      let cursor = null;
      do {
        let apiPath = `markets?status=open&limit=100&series_ticker=${encodeURIComponent(series)}`;
        if (cursor) apiPath += `&cursor=${encodeURIComponent(cursor)}`;

        const data = await kalshiRequest(apiPath);
        if (data && data.markets) {
          let markets = data.markets;

          // Filter by search query if provided
          if (query) {
            markets = markets.filter(
              (m) => m.title && m.title.toLowerCase().includes(query.toLowerCase())
            );
          }

          // Filter by expected_expiration_time (actual game schedule)
          // Note: close_time is a far-future safety buffer on Kalshi — don't use it
          markets = markets.filter((m) => {
            const expTime = m.expected_expiration_time
              ? new Date(m.expected_expiration_time)
              : null;
            if (!expTime) return true;
            if (liveOnly) {
              // Live Now: all games expected to end today (or already ended in last 4h)
              const todayEnd = new Date(now);
              todayEnd.setHours(23, 59, 59, 999);
              return (
                expTime >= new Date(now.getTime() - 4 * 3600 * 1000) &&
                expTime <= todayEnd
              );
            } else {
              // Show games expected within the next 7 days
              return expTime <= new Date(now.getTime() + 7 * 24 * 3600 * 1000);
            }
          });

          results.push(...markets);
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
    // Sort by expected game time (soonest first)
    deduped.sort((a, b) => {
      const ta = a.expected_expiration_time ? new Date(a.expected_expiration_time) : Infinity;
      const tb = b.expected_expiration_time ? new Date(b.expected_expiration_time) : Infinity;
      return ta - tb;
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
    clock: "Live",
    pinned: false,
    expanded: false,
    feedExpanded: false,
    completed: false,
    alert: null,
    alertTriggered: false,
    openKalshi: yesPrice,
    kalshi: { yes: yesPrice, no: noPrice },
    history: [{ t: 0, teamA: yesPrice, teamB: noPrice }],
    plays: ["Live play-by-play will appear here as the game progresses"],
    isLive: true,
    ouLine: null,
    currentTotal: 0,
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

function extractESPNInfo(event) {
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
  const score = hasScores
    ? `${awayAbbr} ${awayScore} – ${homeScore} ${homeAbbr}`
    : "—";
  const clock = event.status?.type?.shortDetail || "—";
  const odds  = comp.odds?.[0];
  const ouLine = odds?.overUnder != null ? String(odds.overUnder) : null;
  const currentTotal = hasScores
    ? (parseInt(awayScore, 10) || 0) + (parseInt(homeScore, 10) || 0)
    : 0;
  return { score, clock, ouLine, currentTotal };
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

// ─── SEED DATA (fallback when API unavailable) ────────────────────────────────
let _id = 1;
function makePlays(teamA, teamB) {
  return [
    `Q1 11:42 — ${teamA}: 3-pointer (+3)`,
    `Q1 10:15 — ${teamB}: Layup (+2)`,
    `Q1 8:30 — ${teamA}: Free throws (+2)`,
    `Q2 9:33 — ${teamA}: Layup (+2)`,
    `Q2 7:10 — ${teamB}: Free throw (+1)`,
    `Q3 7:42 — ${teamA}: 3-pointer (+3)`,
    `Q3 5:20 — ${teamB}: Fast break layup (+2)`,
    `Q3 4:22 — ${teamA}: Free throws (+2)`,
  ];
}

function makeGame(overrides = {}) {
  const teamA = overrides.title ? overrides.title.split(" vs ")[0] : "Team A";
  const teamB = overrides.title ? overrides.title.split(" vs ")[1] : "Team B";
  const kalshiYes = +(Math.random() * 0.55 + 0.22).toFixed(3);
  return {
    id: `game-${_id++}`,
    sport: "🏀 NBA",
    title: "Team A vs Team B",
    teamA,
    teamB,
    subtitle: "Live",
    score: "56–51",
    clock: "Q3 4:22",
    pinned: false,
    expanded: false,
    feedExpanded: false,
    completed: false,
    alert: null,
    alertTriggered: false,
    openKalshi: kalshiYes,
    kalshi: { yes: kalshiYes, no: +(1 - kalshiYes).toFixed(3) },
    history: Array.from({ length: 24 }, (_, i) => ({
      t: i,
      teamA: +(kalshiYes + (Math.random() * 0.12 - 0.06)).toFixed(3),
      teamB: +(1 - kalshiYes + (Math.random() * 0.12 - 0.06)).toFixed(3),
    })),
    plays: makePlays(teamA, teamB),
    isLive: false,
    ...overrides,
    teamA,
    teamB,
  };
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
    <div style={{ background: T.calcCard, border: `1px solid ${T.calcBorder}`, borderRadius: 9, marginBottom: 9 }}>

      {/* ── Collapsible header ── */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 13px", cursor: "pointer", userSelect: "none" }}
        onClick={() => setIsOpen((o) => !o)}
      >
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: T.btnPrimary }}>
          ⚖ Kelly Calculator{teamName ? ` · ${teamName}` : ""}
        </span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          <button
            style={{ background: T.badge, border: `1px solid ${T.badgeBorder}`, borderRadius: 5, cursor: "pointer", fontSize: "0.73rem", padding: "2px 9px", color: T.textSecond }}
            onClick={onDuplicate}
          >
            ⧉ Duplicate
          </button>
          {!isOnly && (
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: T.alert }} onClick={onRemove}>
              ✕
            </button>
          )}
          <span style={{ fontSize: "0.68rem", color: T.textMuted, marginLeft: 2, pointerEvents: "none" }}>
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {isOpen && (
        <div style={{ padding: "0 13px 13px" }}>

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
}) {
  const kDiff = game.kalshi.yes - game.openKalshi;
  const arrow = (d) => (d > 0.005 ? "↑" : d < -0.005 ? "↓" : "→");
  const arrowColor = (d) =>
    d > 0.005 ? T.teamA : d < -0.005 ? T.alert : T.textFaint;
  const [calcs, setCalcs] = useState([{ id: 1 }]);
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
              icon: "🔕",
              title: "Set alert",
              action: () => onSetAlert(game.id),
            },
            {
              icon: game.pinned ? "📌" : "📍",
              title: game.pinned ? "Unpin" : "Pin",
              action: () => onTogglePin(game.id),
            },
            {
              icon: "✓",
              title: "Mark completed",
              action: () => onComplete(game.id),
            },
            { icon: "✕", title: "Remove", action: () => onRemove(game.id) },
          ].map(({ icon, title, action }) => (
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
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Title + score */}
      <div
        style={{ cursor: "pointer" }}
        onClick={() => onToggleExpand(game.id)}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: T.textPrimary,
              marginBottom: 4,
            }}
          >
            {game.title}
          </div>
          <span style={{ fontSize: "0.62rem", color: T.textFaint }}>
            {game.expanded ? "▲ less" : "▼ more"}
          </span>
        </div>
        {/* Score + clock + O/U row — all on one line */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          {/* Left: Score + clock */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: "0.68rem", color: T.textMuted, fontWeight: 600 }}>
              Score
            </span>
            <span style={{ fontWeight: 700, color: T.textPrimary }}>
              {game.score !== "—" ? game.score : "—"}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                background: T.badge,
                color: T.btnPrimary,
                padding: "1px 8px",
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              {game.clock}
            </span>
          </div>

          {/* Right: O/U */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.72rem" }}>
            <span style={{ fontSize: "0.68rem", color: T.textMuted, fontWeight: 600 }}>
              O/U
            </span>
            <span
              style={{
                background: T.badge,
                border: `1px solid ${T.badgeBorder}`,
                borderRadius: 4,
                padding: "1px 7px",
                color: game.ouLine ? T.textSecond : T.textFaint,
                fontWeight: 600,
              }}
            >
              {game.ouLine || "—"}
            </span>
            {game.ouLine && game.currentTotal > 0 && (
              <span style={{ color: T.textMuted }}>
                {game.currentTotal} pts ·{" "}
                <span
                  style={{
                    color:
                      game.currentTotal > parseFloat(game.ouLine)
                        ? T.alert
                        : T.teamA,
                    fontWeight: 600,
                  }}
                >
                  {game.currentTotal > parseFloat(game.ouLine)
                    ? "↑ Over"
                    : "↓ Under"}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Compact odds */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            {
              label: game.teamA,
              prob: game.kalshi.yes,
              d: kDiff,
              color: T.teamA,
            },
            {
              label: game.teamB,
              prob: game.kalshi.no,
              d: -kDiff,
              color: T.teamB,
            },
          ].map(({ label, prob, d, color }) => (
            <div
              key={label}
              style={{
                background: T.calcCard,
                border: `1px solid ${T.calcBorder}`,
                borderRadius: 7,
                padding: "7px 11px",
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: "0.65rem",
                  color: T.textMuted,
                  marginBottom: 3,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ color, fontWeight: 800, fontSize: "1rem" }}>
                  {pct(prob)}
                </span>
                <span style={{ fontSize: "0.73rem", color: T.textMuted }}>
                  {toAmerican(prob)}
                </span>
                <span
                  style={{
                    color: arrowColor(d),
                    fontWeight: 700,
                    fontSize: "0.78rem",
                  }}
                >
                  {arrow(d)}
                </span>
              </div>
            </div>
          ))}
          {game.alertTriggered && (
            <div
              style={{
                alignSelf: "center",
                fontSize: "0.71rem",
                color: T.alert,
                background: "#fff0ee",
                border: `1px solid ${T.alert}44`,
                borderRadius: 6,
                padding: "5px 9px",
              }}
            >
              🚨 Alert hit
            </div>
          )}
        </div>
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
              const n = game.history.length;
              // Re-index history sequentially so positions are consistent
              const chartData = game.history.map((h, i) => ({ ...h, t: i }));
              const htX = Math.round((n - 1) / 2);
              const q1X = Math.round((n - 1) / 4);
              const q3X = Math.round(3 * (n - 1) / 4);
              const showQLines = n >= 5 && q1X !== htX && q3X !== htX;
              return (
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 18 }}>
                    <XAxis dataKey="t" hide />
                    <YAxis domain={[0, 1]} hide />
                    <Tooltip
                      formatter={(v, name) => [pct(v), name === "teamA" ? game.teamA : game.teamB]}
                      labelFormatter={() => ""}
                      contentStyle={{ background: T.modalBg, border: `1px solid ${T.modalBorder}`, borderRadius: 6, fontSize: 11, color: T.textPrimary }}
                    />
                    {/* Quarter marks — smaller, no label */}
                    {showQLines && <ReferenceLine x={q1X} stroke={T.divider} strokeWidth={1} strokeDasharray="3 3" />}
                    {showQLines && <ReferenceLine x={q3X} stroke={T.divider} strokeWidth={1} strokeDasharray="3 3" />}
                    {/* Halftime — bold line + label underneath */}
                    {n >= 3 && (
                      <ReferenceLine
                        x={htX}
                        stroke={T.textFaint}
                        strokeWidth={1.5}
                        label={{ value: "Halftime", position: "insideBottom", fontSize: 9, fill: T.textFaint }}
                      />
                    )}
                    <Line type="linear" dataKey="teamA" stroke="none" strokeWidth={0} isAnimationActive={false}
                      dot={(props) => {
                        const { cx, cy, index } = props;
                        const isLast = index === n - 1;
                        if (isLast) return (
                          <g key={`da-${index}`}>
                            <circle cx={cx} cy={cy} r={5} fill={T.teamA} />
                            <circle cx={cx} cy={cy} r={9} fill="none" stroke={T.teamA} strokeWidth={1.5} strokeOpacity={0.5} />
                          </g>
                        );
                        return <circle key={`da-${index}`} cx={cx} cy={cy} r={2.5} fill={T.teamA} fillOpacity={0.75} />;
                      }}
                      activeDot={false}
                    />
                    <Line type="linear" dataKey="teamB" stroke="none" strokeWidth={0} isAnimationActive={false}
                      dot={(props) => {
                        const { cx, cy, index } = props;
                        const isLast = index === n - 1;
                        if (isLast) return (
                          <g key={`db-${index}`}>
                            <circle cx={cx} cy={cy} r={5} fill={T.teamB} />
                            <circle cx={cx} cy={cy} r={9} fill="none" stroke={T.teamB} strokeWidth={1.5} strokeOpacity={0.5} />
                          </g>
                        );
                        return <circle key={`db-${index}`} cx={cx} cy={cy} r={2.5} fill={T.teamB} fillOpacity={0.75} />;
                      }}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
            {/* Time axis labels */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.62rem",
                color: T.textFaint,
                marginTop: 2,
                paddingLeft: 4,
                paddingRight: 4,
              }}
            >
              <span>◄ Game Start</span>
              <span>Now ►</span>
            </div>
            {/* Team legend */}
            <div
              style={{
                display: "flex",
                gap: 16,
                fontSize: "0.68rem",
                justifyContent: "center",
                marginTop: 5,
              }}
            >
              <span style={{ color: T.teamA, fontWeight: 600 }}>
                — {game.teamA}
              </span>
              <span style={{ color: T.teamB, fontWeight: 600 }}>
                — {game.teamB}
              </span>
            </div>
          </div>

          {/* Kelly calculators */}
          <div style={{ borderTop: `1px solid ${T.divider}`, paddingTop: 12 }}>
            {calcs.map((c) => (
              <KellyCalc
                key={c.id}
                teamA={game.teamA}
                teamB={game.teamB}
                teamAProb={game.kalshi.yes}
                teamBProb={game.kalshi.no}
                openKalshiA={game.openKalshi}
                openKalshiB={+(1 - game.openKalshi).toFixed(3)}
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
                color: T.textSecond,
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
  const [confirmGame, setConfirmGame] = useState(null);
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
      const data = await searchKalshiMarkets(query, { liveOnly: liveNowMode });
      if (data === null) {
        setApiError(true);
        setResults([]);
      } else {
        setResults(data.map(kalshiMarketToGame));
      }
      setLoading(false);
    }, query.length > 0 ? 600 : 0);
    return () => clearTimeout(searchRef.current);
  }, [query, refreshKey, liveNowMode]);

  const handleLiveNow = () => {
    setSportFilter("all");
    setQuery("");
    if (liveNowMode) {
      // Already in live mode — just refresh
      setRefreshKey((k) => k + 1);
    } else {
      setLiveNowMode(true);
    }
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

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {filtered.map((g) => {
          const added = dashboardIds.includes(g.id);
          return (
            <div
              key={g.id}
              style={{
                background: T.widget,
                border: `1px solid ${T.widgetBorder}`,
                borderRadius: 10,
                padding: "13px 15px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                boxShadow: "0 1px 4px #0000001a",
              }}
            >
              <div style={{ flex: 1, minWidth: 180 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 7,
                    alignItems: "center",
                    marginBottom: 5,
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
                  <span
                    style={{
                      color: T.live,
                      fontSize: "0.67rem",
                      fontWeight: 700,
                    }}
                  >
                    ● LIVE
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    color: T.textPrimary,
                    marginBottom: 2,
                  }}
                >
                  {g.title}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: T.textMuted,
                    fontFamily: "monospace",
                  }}
                >
                  {g.id}
                </div>
              </div>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                {[
                  {
                    label: `${g.teamA} WIN`,
                    val: g.kalshi.yes,
                    color: T.teamA,
                  },
                  { label: `${g.teamB} WIN`, val: g.kalshi.no, color: T.teamB },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "0.63rem",
                        color: T.textMuted,
                        marginBottom: 2,
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ color, fontWeight: 700 }}>
                      {toAmerican(val)}
                    </div>
                    <div style={{ fontSize: "0.67rem", color: T.textMuted }}>
                      {pct(val)}
                    </div>
                  </div>
                ))}
                <button
                  style={{
                    background: added ? T.badge : T.btnPrimary,
                    border: `1px solid ${added ? T.badgeBorder : T.btnPrimary}`,
                    color: added ? T.textMuted : T.btnPrimaryTxt,
                    padding: "7px 14px",
                    borderRadius: 6,
                    cursor: added ? "default" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    opacity: added ? 0.7 : 1,
                  }}
                  onClick={() => !added && setConfirmGame(g)}
                  disabled={added}
                >
                  {added ? "✓ Added" : "+ Add"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmGame && (
        <ConfirmModal
          game={confirmGame}
          onConfirm={() => {
            onAddGame(confirmGame);
            setConfirmGame(null);
          }}
          onClose={() => setConfirmGame(null)}
        />
      )}
    </div>
  );
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
            const info = extractESPNInfo(ev);
            if (!info) return g;
            return { ...g, score: info.score, clock: info.clock, ouLine: info.ouLine, currentTotal: info.currentTotal };
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
          if (g.completed) return g;
          return {
            ...g,
            history: [
              ...g.history,
              { t: g.history.length, teamA: g.kalshi.yes, teamB: g.kalshi.no },
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
    setGames((p) =>
      p.map((g) => (g.id === id ? { ...g, pinned: !g.pinned } : g))
    );
  const toggleFeed = (id) =>
    setGames((p) =>
      p.map((g) => (g.id === id ? { ...g, feedExpanded: !g.feedExpanded } : g))
    );
  const removeGame = (id) => setGames((p) => p.filter((g) => g.id !== id));
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
      setGames((p) => [
        ...p,
        {
          ...game,
          pinned: true,
          expanded: false,
          feedExpanded: false,
          completed: false,
        },
      ]),
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
    gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
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
            LiveMarkets
          </div>
          <div style={{ fontSize: "0.58rem", color: "#A8D5A2", marginTop: -1 }}>
            Kalshi Sports Tracker
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
            {/* Minimal top bar — just the add button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button
                style={{
                  background: T.btnPrimary,
                  border: "none",
                  color: T.btnPrimaryTxt,
                  padding: "6px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
                onClick={() => setTab("search")}
              >
                + Search Markets
              </button>
            </div>

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
