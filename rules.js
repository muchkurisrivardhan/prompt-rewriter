/*
 * rules.js — per-vendor prompting rulesets distilled from official docs.
 * This is the heart of the project. To improve the tool, edit this file.
 *
 * Sources:
 *  Claude:     https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
 *              https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-4-8
 *              https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5
 *              https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-tools
 *  GPT:        https://learn.chatgpt.com/docs/prompting
 *  Gemini:     https://ai.google.dev/gemini-api/docs/prompting-strategies
 *  Perplexity: https://docs.perplexity.ai/docs/agent-api/prompt-guide
 */

const DOCS = {
  claude: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices",
  claudeOpus: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-4-8",
  gpt: "https://learn.chatgpt.com/docs/prompting",
  gemini: "https://ai.google.dev/gemini-api/docs/prompting-strategies",
  perplexity: "https://docs.perplexity.ai/docs/agent-api/prompt-guide",
};

const TARGETS = {
  claude: { label: "Claude (Anthropic)", doc: DOCS.claude },
  gpt: { label: "GPT / ChatGPT (OpenAI)", doc: DOCS.gpt },
  gemini: { label: "Gemini (Google)", doc: DOCS.gemini },
  perplexity: { label: "Perplexity", doc: DOCS.perplexity },
  generic: { label: "Any / other model", doc: DOCS.claude },
};

/* ---------- lint helpers ---------- */
const has = (p, re) => re.test(p);
const wordCount = (p) => p.trim().split(/\s+/).filter(Boolean).length;

/*
 * Each rule: { id, targets: [..] or "all", severity: "high"|"med"|"low",
 *              test(prompt) -> true when the ISSUE IS PRESENT,
 *              message, fix, doc }
 */
const LINT_RULES = [
  {
    id: "too-short",
    targets: "all",
    severity: "high",
    test: (p) => wordCount(p) < 8,
    message: "Prompt is very short and likely underspecified.",
    fix: "State the task, the desired output, and any constraints. Every guide agrees: specific beats vague ('Compare energy efficiency of heat pumps vs HVAC for homes' beats 'which heating is better').",
    doc: DOCS.claude,
  },
  {
    id: "no-output-format",
    targets: "all",
    severity: "high",
    test: (p) => !has(p, /\b(format|json|table|bullet|list|markdown|csv|xml|paragraph|one[- ]sentence|word limit|words?\b.{0,15}(max|limit|under|fewer)|respond with|output|return only)\b/i),
    message: "No explicit output format or length.",
    fix: "Say exactly what the answer should look like: 'Respond as a markdown table', 'Return only valid JSON', 'Summarize in 3 bullet points'. All four vendors list this as a top rule.",
    doc: DOCS.gemini,
  },
  {
    id: "no-role-or-audience",
    targets: ["claude", "gpt", "gemini", "generic"],
    severity: "med",
    test: (p) => !has(p, /\b(you are|act as|as an?|role|audience|for (a|an|my) (beginner|expert|child|student|team|manager|director|engineer|customer|ceo))\b/i),
    message: "No role or audience is set.",
    fix: "Add a role ('You are a senior Python reviewer') or name the audience ('explain for a non-technical manager'). Claude docs: even one sentence of role focuses behavior; OpenAI docs: naming the audience tunes depth and tone.",
    doc: DOCS.claude,
  },
  {
    id: "negative-instructions",
    targets: ["claude", "gemini", "generic"],
    severity: "med",
    test: (p) => has(p, /\b(do not|don'?t|never|avoid|no )\b/i) && !has(p, /\binstead\b/i),
    message: "Contains 'don't / never / avoid' without saying what to do instead.",
    fix: "Tell the model what TO do: instead of 'Do not use markdown', write 'Respond in flowing prose paragraphs'. Positive framing steers better than prohibitions.",
    doc: DOCS.claude,
  },
  {
    id: "aggressive-language",
    targets: ["claude"],
    severity: "med",
    test: (p) => has(p, /\b(CRITICAL|YOU MUST|MANDATORY|ALWAYS!!|IMPORTANT!!)\b/) || has(p, /!{2,}/),
    message: "Aggressive ALL-CAPS 'CRITICAL / YOU MUST' language.",
    fix: "Modern Claude models follow the prompt closely — aggressive language written for older models now over-triggers. 'Use this tool when…' works better than 'CRITICAL: You MUST use this tool'.",
    doc: DOCS.claude,
  },
  {
    id: "no-examples",
    targets: ["claude", "gemini", "generic"],
    severity: "low",
    test: (p) => wordCount(p) > 40 && !has(p, /\b(example|e\.g\.|for instance|such as|like this)\b/i) && !has(p, /<example/i),
    message: "No examples for a non-trivial task.",
    fix: "Add 2–5 varied examples of ideal input→output. Google: 'always include few-shot examples'. Claude: wrap them in <example> tags. Keep formatting consistent across examples.",
    doc: DOCS.gemini,
  },
  {
    id: "no-structure",
    targets: ["claude", "gemini", "gpt", "generic"],
    severity: "med",
    test: (p) => wordCount(p) > 80 && !has(p, /(<\w+>|^#+\s|^\s*[-*]\s|^\s*\d+\.\s|```|---)/m),
    message: "Long prompt with no structure (no tags, headings, or lists).",
    fix: "Separate instructions, context, and input with delimiters — XML tags for Claude (<instructions>, <context>), markdown headings for Gemini/GPT. Mixing them unmarked causes misinterpretation.",
    doc: DOCS.claude,
  },
  {
    id: "vague-verbs",
    targets: ["claude", "generic"],
    severity: "low",
    test: (p) => has(p, /\b(can you|could you|maybe|perhaps|would you mind|suggest some)\b/i),
    message: "Hedged phrasing ('can you…', 'suggest some…').",
    fix: "Modern models follow instructions literally: 'Can you suggest changes?' gets suggestions, not changes. Use direct verbs: 'Change this function to…', 'Write…', 'Fix…'.",
    doc: DOCS.claude,
  },
  {
    id: "ambiguous-scope",
    targets: ["claude", "gpt"],
    severity: "low",
    test: (p) => has(p, /\b(everything|all of it|the whole thing|etc\.?|and so on)\b/i),
    message: "Ambiguous scope ('everything', 'etc.').",
    fix: "State the scope explicitly. Claude Opus 4.8 / Sonnet 5 interpret literally and won't generalize an instruction beyond what you stated: 'Apply this to every section, not just the first one'.",
    doc: DOCS.claudeOpus,
  },
  {
    id: "no-context-why",
    targets: ["claude", "generic"],
    severity: "low",
    test: (p) => wordCount(p) > 25 && !has(p, /\b(because|so that|since|for|in order to|the goal|why|purpose|will be used)\b/i),
    message: "No motivation/context for the task.",
    fix: "Explain WHY: 'never use ellipses because the output is read by a text-to-speech engine'. Claude generalizes from the reason; OpenAI: describe how you'll use the result.",
    doc: DOCS.claude,
  },
  {
    id: "gpt-no-outcome-first",
    targets: ["gpt"],
    severity: "med",
    test: (p) => has(p, /^\s*(first|step 1|start by|begin by)/i),
    message: "Prompt starts with steps instead of the outcome.",
    fix: "OpenAI: 'Start with the result, not a detailed list of steps.' Lead with the deliverable, then constraints, then optional steps.",
    doc: DOCS.gpt,
  },
  {
    id: "gemini-instructions-first-long",
    targets: ["gemini"],
    severity: "med",
    test: (p) => wordCount(p) > 300 && wordCount(p.slice(0, 200)) > 10 && has(p.slice(0, 300), /\b(summarize|analyze|extract|answer|classify|translate|rewrite)\b/i),
    message: "Long input with instructions at the top.",
    fix: "For long inputs Gemini docs say: supply all context FIRST, put the instruction at the very END, and bridge with 'Based on the information above…'. (Claude docs agree: query-at-end improves quality up to 30%.)",
    doc: DOCS.gemini,
  },
  {
    id: "pplx-vague-search",
    targets: ["perplexity"],
    severity: "high",
    test: (p) => wordCount(p) < 15 && !has(p, /\b(20\d\d|latest|specific|compare|vs\.?|versus)\b/i),
    message: "Query too generic for a search-grounded model.",
    fix: "Use the domain vocabulary that would appear on relevant pages, add disambiguating context, and constrain time/region: 'Compare 2025 energy-efficiency ratings of heat pumps vs traditional HVAC for residential use'.",
    doc: DOCS.perplexity,
  },
  {
    id: "pplx-no-count-cap",
    targets: ["perplexity"],
    severity: "med",
    test: (p) =>
      has(p, /\b(list|examples|options|sources|papers|articles|tools|ways)\b/i) &&
      !has(p, /\b(top\s+\d+|\d+\s+(examples?|options?|sources?|papers?|articles?|tools?|ways|items?|results?)|(three|four|five|six|seven|eight|nine|ten)\s+\w)/i),
    message: "Asks for a list without capping the count.",
    fix: "State how many items you want ('list the top 5 …'). Perplexity docs: without a cap the model picks arbitrary lengths.",
    doc: DOCS.perplexity,
  },
  {
    id: "pplx-fewshot",
    targets: ["perplexity"],
    severity: "med",
    test: (p) => has(p, /\b(example|e\.g\.|for instance)\b/i) && wordCount(p) > 150,
    message: "Long few-shot style prompt for a search model.",
    fix: "Perplexity: keep instructions focused — they re-run on every agent turn, so bloat compounds. Don't teach it how to search; move hard constraints (dates, domains) to API parameters.",
    doc: DOCS.perplexity,
  },
  {
    id: "pplx-hallucination-guard",
    targets: ["perplexity"],
    severity: "low",
    test: (p) => !has(p, /\b(if (you can'?t|no|nothing) (find|found)|say so|admit|acknowledge|don'?t speculate|no results)\b/i),
    message: "No 'no results' escape hatch.",
    fix: "Add: 'If searches do not return relevant results, say so explicitly rather than speculating.' This is Perplexity's #1 grounding rule against hallucination.",
    doc: DOCS.perplexity,
  },
];

/* ---------- rewrite scaffolds (rules-based, no API key needed) ---------- */
/* Deterministic: wraps the original prompt in the vendor's preferred structure
 * with TODO placeholders driven by the lint findings. Honest scaffolding, not magic. */
function scaffold(target, prompt, findings) {
  const ids = new Set(findings.map((f) => f.id));
  const todo = (id, text) => (ids.has(id) ? text : "");
  const p = prompt.trim();

  switch (target) {
    case "claude":
      return [
        todo("no-role-or-audience", "You are a [TODO: role, e.g. senior data analyst].\n"),
        "<task>",
        p,
        "</task>",
        todo("no-context-why", "\n<context>\n[TODO: why you need this and how the output will be used]\n</context>"),
        todo("no-examples", "\n<example>\n[TODO: one ideal input → output example; add 2–5 varied ones]\n</example>"),
        "\n<output_format>",
        ids.has("no-output-format")
          ? "[TODO: exact format — e.g. 'a markdown table with columns X, Y' or 'only valid JSON matching {…}']"
          : "(keep your existing format instructions here)",
        "</output_format>",
        "\nBefore you finish, verify your answer meets every requirement above.",
      ].filter(Boolean).join("\n");

    case "gpt":
      return [
        "Goal: " + p.split(/\n/)[0],
        "",
        "Context:",
        todo("no-context-why", "[TODO: background + how you'll use the result, e.g. 'one-page summary for scanning before a meeting']") || "[from your prompt below]",
        p.split(/\n/).slice(1).join("\n"),
        "",
        "Output:",
        ids.has("no-output-format") ? "[TODO: format, length, structure]" : "(your format requirements)",
        todo("no-role-or-audience", "Audience: [TODO: who reads this — engineer, director, customer?]"),
        "",
        "Boundaries:",
        "[TODO: hard constraints that make output unusable if violated — put these EARLY]",
        "",
        "Finally, confirm the output meets every requirement (e.g. 'confirm every action item has an owner and due date').",
      ].filter(Boolean).join("\n");

    case "gemini":
      return [
        "## Context",
        todo("no-context-why", "[TODO: background, reference material, definitions of ambiguous terms]") || "[context / input data goes FIRST for long inputs]",
        "",
        "## Examples",
        ids.has("no-examples") ? "[TODO: 2–5 consistent input→output examples — Google recommends always including them]" : "(your examples)",
        "",
        "## Task",
        "Based on the information above: " + p,
        "",
        "## Output format",
        ids.has("no-output-format") ? "[TODO: exact format + explicit length constraint, e.g. 'a JSON array' / 'summarize in one sentence']" : "(your format requirements)",
      ].join("\n");

    case "perplexity":
      return [
        // ponytail: search prompts should stay short — scaffold trims, not expands
        p,
        todo("pplx-vague-search", "\n[TODO: add domain vocabulary, a year/region, and disambiguation — phrase it like text that would appear on the target page]"),
        todo("pplx-no-count-cap", "\n[TODO: cap the list: 'the top 5 …']"),
        "\nIf searches do not return relevant results after trying alternative phrasings, say so explicitly rather than speculating. If you find related but non-matching results, state the mismatch before answering.",
      ].filter(Boolean).join("\n");

    default: // generic
      return [
        todo("no-role-or-audience", "Role: [TODO: who the model should be] · Audience: [TODO: who reads the output]\n"),
        "### Task",
        p,
        todo("no-context-why", "\n### Context\n[TODO: background and why you need this]"),
        todo("no-examples", "\n### Example\n[TODO: one ideal input → output]"),
        "\n### Output format",
        ids.has("no-output-format") ? "[TODO: exact format and length]" : "(your format requirements)",
      ].filter(Boolean).join("\n");
  }
}

/* ---------- system prompts for the optional BYO-key LLM rewrite ---------- */
const RULESET_TEXT = {
  claude: `Rewrite prompts for Anthropic Claude models. Apply these official rules:
- Be clear, direct, specific. Golden rule: a colleague with no context must be able to follow it.
- Structure with XML tags: <instructions>, <context>, <example>(s), <output_format>. Consistent tag names.
- Set a role in one sentence when useful.
- Give motivation for constraints ("because X") — Claude generalizes from the reason.
- Include 3–5 diverse examples in <example> tags for format-sensitive tasks.
- Long documents FIRST, query/instructions at the END (up to 30% better). For long docs, ask Claude to quote relevant parts first.
- Positive framing: say what to do, not what to avoid.
- Direct action verbs ("Change…", not "Can you suggest…").
- State scope explicitly — modern Claude follows literally, no aggressive CRITICAL/MUST language.
- Add a self-check: "Before you finish, verify your answer against [criteria]."
- Never use assistant prefills; put format requirements in the prompt.`,
  gpt: `Rewrite prompts for OpenAI GPT/ChatGPT models. Apply these official rules:
- Lead with the outcome, not steps.
- Use Goal / Context / Output / Boundaries sections when complexity warrants (only sections that change the response).
- Put hard boundaries EARLY (approval, data preservation, format restrictions); put verification requests at the END.
- Name the audience explicitly (director, engineer, customer).
- Describe how the result will be used ("one-page summary for scanning before a meeting").
- Separate required work from optional polish.
- Request an explicit final check ("confirm every action item has an owner and due date").`,
  gemini: `Rewrite prompts for Google Gemini models. Apply these official rules:
- Clear, specific, direct instructions; no persuasive padding (Gemini 3 prefers precision).
- Always include 2–5 few-shot examples with consistent formatting.
- Explicit constraints on length, style, scope; state what NOT to do alongside what to do.
- Specify output format explicitly (table, JSON, list); completion prefixes help.
- For long inputs: ALL context first, instruction at the very end, bridged with "Based on the information above…".
- Consistent delimiters throughout (XML tags or markdown headings — pick one).
- Break complex tasks into sequential steps; define ambiguous terms.
- Gemini defaults to concise — explicitly request detail or conversational tone if wanted.`,
  perplexity: `Rewrite prompts for Perplexity (search-grounded) models. Apply these official rules:
- Use domain vocabulary that would appear on the relevant web pages; be specific ("Compare energy efficiency ratings of heat pumps vs traditional HVAC for residential use").
- Add disambiguating context for ambiguous terms; constrain time/region where relevant.
- Cap list counts explicitly ("the top 5 …").
- Keep it SHORT and focused — do not add few-shot examples or tool-usage guidance; the agent loop handles search itself.
- Add grounding language: "If searches do not return relevant results after trying alternative phrasings, say so explicitly rather than speculating" and "If you find related but non-matching results, state the mismatch before answering."`,
  generic: `Rewrite prompts using best practices shared by Anthropic, OpenAI, Google, and Perplexity:
- Clear, specific, direct; state the goal first.
- Set role and audience.
- Separate instructions, context, and input with delimiters (markdown headings or XML tags).
- Give context/motivation for constraints.
- Include 2–5 consistent examples for format-sensitive tasks.
- Explicit output format and length.
- Positive framing (what to do, not what to avoid).
- End with a verification request against explicit criteria.`,
};

function lint(target, prompt) {
  return LINT_RULES.filter(
    (r) => (r.targets === "all" || r.targets.includes(target)) && r.test(prompt)
  );
}

function llmSystemPrompt(target) {
  return (
    RULESET_TEXT[target] +
    `\n\nYou will receive a user's prompt. Rewrite it to follow the rules above. Preserve the user's intent and all concrete details exactly — never invent facts, requirements, or data the user didn't give. Where information is genuinely missing (examples, audience, format), insert a short [bracketed placeholder] instead of inventing content. Return ONLY the rewritten prompt, no commentary.`
  );
}

const RulesEngine = { TARGETS, LINT_RULES, lint, scaffold, llmSystemPrompt, DOCS };
if (typeof module !== "undefined") module.exports = RulesEngine;
