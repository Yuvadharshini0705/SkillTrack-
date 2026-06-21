// utils/codeChecker.js
// Smart structural code checker — replaces the old token-matching approach.
// Each task can optionally supply `structure_checks` in its content for
// task-specific weighted grading. Falls back to bigram similarity when absent.

// ─── Normalise ────────────────────────────────────────────────────────────────
function normalize(code = "") {
  return code
    .replace(/\/\/.*$/gm, "")          // strip // comments
    .replace(/\/\*[\s\S]*?\*\//g, "")  // strip /* */ comments
    .replace(/#.*$/gm, "")             // strip # comments (Python)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ─── Bigram similarity (fallback) ─────────────────────────────────────────────
function bigramSimilarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;

  const bigrams = (s) => {
    const tokens = s.split(" ").filter((t) => t.length > 2);
    const bg = new Set();
    for (let i = 0; i < tokens.length - 1; i++)
      bg.add(tokens[i] + " " + tokens[i + 1]);
    tokens.forEach((t) => bg.add(t));
    return bg;
  };

  const sa = bigrams(na);
  const sb = bigrams(nb);
  let matched = 0;
  sb.forEach((t) => { if (sa.has(t)) matched++; });
  return sb.size === 0 ? 0 : Math.round((matched / sb.size) * 100);
}

// ─── Generic structure bonus (always applied) ─────────────────────────────────
// Rewards code that at least looks structurally complete, regardless of task.
const GENERIC_CHECKS = [
  { re: /for\s*\(|while\s*\(|\.foreach|\.map\s*\(/, label: "uses a loop or iterator" },
  { re: /return\s+[^;{]+/,                           label: "has a return statement"  },
  { re: /if\s*\(/,                                   label: "has conditional logic"   },
  { re: /function\s+\w+|=>\s*[{(]|=>\s*\w/,         label: "defines a function"      },
];

function genericBonus(code) {
  const ns = normalize(code);
  const hit = GENERIC_CHECKS.filter((c) => c.re.test(ns)).length;
  // max 15 bonus points
  return Math.round((hit / GENERIC_CHECKS.length) * 15);
}

// ─── Core scorer ──────────────────────────────────────────────────────────────
// structureChecks shape: [{ pattern: string, weight: number, hint: string }]
// pattern is a RegExp source string (case-insensitive match against normalised code)
function coreScore(studentCode, solution, structureChecks = []) {
  const ns = normalize(studentCode);
  let baseScore = 0;
  const issues = [];
  const passed_checks = [];

  if (structureChecks.length > 0) {
    // ── Task-specific weighted checks ──────────────────────────────────────
    const totalWeight = structureChecks.reduce((s, c) => s + (c.weight || 1), 0);
    structureChecks.forEach(({ pattern, weight = 1, hint }) => {
      try {
        if (new RegExp(pattern, "i").test(ns)) {
          baseScore += weight;
          passed_checks.push(hint);
        } else {
          issues.push(hint);
        }
      } catch {
        // bad regex — skip silently
      }
    });
    baseScore = Math.round((baseScore / totalWeight) * 100);
  } else {
    // ── Fallback: bigram similarity ────────────────────────────────────────
    baseScore = bigramSimilarity(studentCode, solution);
  }

  const score = Math.min(100, baseScore + genericBonus(studentCode));

  return { score, issues, passed_checks };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check a debug submission.
 * Pass threshold = 80.
 *
 * @param {string}   studentCode
 * @param {string}   solution          – model solution (used for bigram fallback)
 * @param {Array}    structureChecks   – optional task-specific checks from task.content.structure_checks
 */
export function checkDebug(studentCode, solution, structureChecks = []) {
  const { score, issues, passed_checks } = coreScore(studentCode, solution, structureChecks);
  const passed = score >= 80;

  const label =
    score >= 95 ? "Perfect fix! 🎉" :
    score >= 80 ? "Looks correct! ✅" :
    score >= 60 ? "Getting closer — check the hints 🔍" :
    score >= 35 ? "Partially fixed — keep going 🛠" :
                  "Not matching yet — re-read the bug clues 🐛";

  return { score, passed, label, issues, passed_checks };
}

/**
 * Check a coding submission.
 * Pass threshold = 70.
 *
 * @param {string}   studentCode
 * @param {string}   solution
 * @param {Array}    structureChecks
 */
export function checkCoding(studentCode, solution, structureChecks = []) {
  const { score, issues, passed_checks } = coreScore(studentCode, solution, structureChecks);
  const passed = score >= 70;

  const label =
    score >= 95 ? "Excellent solution! 🏆" :
    score >= 70 ? "Great solution! 🎉" :
    score >= 50 ? "Partial match — review the logic 🔍" :
    score >= 25 ? "On the right track — keep going 💪" :
                  "Doesn't match yet — try a different approach 🤔";

  return { score, passed, label, issues, passed_checks };
}