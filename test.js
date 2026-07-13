/* Minimal self-check: node test.js */
const R = require("./rules.js");
const assert = require("assert");

const ids = (target, p) => R.lint(target, p).map((f) => f.id);

// short vague prompt trips the basics
let f = ids("claude", "make my site faster");
assert(f.includes("too-short"), "short prompt should flag too-short");
assert(f.includes("no-output-format"), "should flag missing output format");

// hedged phrasing
assert(ids("claude", "can you suggest some improvements to this function please, thanks a lot friend").includes("vague-verbs"));

// aggressive language only flags for claude
assert(ids("claude", "CRITICAL: YOU MUST always use the search tool for every single query you receive").includes("aggressive-language"));
assert(!ids("gpt", "CRITICAL: YOU MUST always use the search tool for every single query you receive").includes("aggressive-language"));

// a well-formed prompt is mostly clean
const good = `You are a senior Python reviewer. Review the code in <code> tags because we ship it to production tomorrow.
<code>def add(a,b): return a+b</code>
For example, flag missing type hints like this: "add() lacks annotations".
Respond as a markdown table with columns issue, severity, fix. If in doubt about intent, list the top 3 interpretations instead of guessing.`;
assert.strictEqual(ids("claude", good).filter((i) => i !== "negative-instructions").length, 0, "good prompt should be clean, got: " + ids("claude", good));

// perplexity rules
assert(ids("perplexity", "best heating?").includes("pplx-vague-search"));
assert(ids("perplexity", "Compare 2025 energy efficiency ratings of heat pumps vs traditional HVAC for residential use in Germany; list sources. If searches find nothing relevant, say so.").includes("pplx-no-count-cap"));

// scaffold embeds original prompt and TODOs for findings
const p = "make my site faster";
const s = R.scaffold("claude", p, R.lint("claude", p));
assert(s.includes(p) && s.includes("[TODO"), "scaffold should embed prompt and TODOs");
assert(R.scaffold("gemini", p, R.lint("gemini", p)).includes("Based on the information above"));

// system prompts exist for every target
for (const t of Object.keys(R.TARGETS)) {
  assert(R.llmSystemPrompt(t).length > 200, "missing ruleset text for " + t);
}

console.log("all checks passed");
