/* app.js — UI wiring, animations + optional BYO-key LLM rewrite. Rulesets live in rules.js. */
(() => {
  const $ = (id) => document.getElementById(id);
  const { TARGETS, LINT_RULES, lint, scaffold, llmSystemPrompt } = RulesEngine;

  /* ---------- target pills (synced to hidden <select id="target">) ---------- */
  const targetSel = $("target");
  const pillWrap = $("target-pills");
  Object.entries(TARGETS).forEach(([key, t], i) => {
    const o = document.createElement("option");
    o.value = key; o.textContent = t.label; targetSel.appendChild(o);

    const b = document.createElement("button");
    b.className = "pill";
    b.type = "button";
    b.role = "tab";
    b.textContent = t.label.replace(/\s*\(.*\)/, "");
    b.dataset.value = key;
    b.setAttribute("aria-selected", i === 0 ? "true" : "false");
    b.addEventListener("click", () => selectTarget(key));
    pillWrap.appendChild(b);
  });
  targetSel.value = "claude";

  function selectTarget(key) {
    targetSel.value = key;
    [...pillWrap.children].forEach((p) =>
      p.setAttribute("aria-selected", p.dataset.value === key ? "true" : "false")
    );
    if (!$("results").hidden) analyze(); // live re-analyze when a result is showing
  }

  /* ---------- provider select ---------- */
  const PROVIDERS = {
    anthropic: { label: "Anthropic", model: "claude-opus-4-8" },
    openai: { label: "OpenAI", model: "gpt-5.1" },
    gemini: { label: "Google Gemini", model: "gemini-2.5-flash" },
    perplexity: { label: "Perplexity", model: "sonar" },
    custom: { label: "Custom / OpenAI-compatible (any model)", model: "", base: "https://openrouter.ai/api/v1" },
  };
  const providerSel = $("provider");
  for (const [key, p] of Object.entries(PROVIDERS)) {
    const o = document.createElement("option");
    o.value = key; o.textContent = p.label; providerSel.appendChild(o);
  }
  function loadProviderFields() {
    const p = providerSel.value;
    $("apikey").value = localStorage.getItem("pr_key_" + p) || "";
    $("model").value = localStorage.getItem("pr_model_" + p) || PROVIDERS[p].model;
    const isCustom = p === "custom";
    $("baseurl-field").hidden = !isCustom;
    if (isCustom) $("baseurl").value = localStorage.getItem("pr_base_custom") || PROVIDERS.custom.base;
  }
  providerSel.addEventListener("change", loadProviderFields);
  loadProviderFields();

  /* ---------- live word count ---------- */
  const promptEl = $("prompt");
  promptEl.addEventListener("input", () => {
    const n = promptEl.value.trim().split(/\s+/).filter(Boolean).length;
    $("wordcount").textContent = n + (n === 1 ? " word" : " words");
  });

  /* ---------- analyze ---------- */
  $("analyze").addEventListener("click", analyze);
  promptEl.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") analyze();
  });

  function analyze() {
    const prompt = promptEl.value;
    const target = targetSel.value;
    if (!prompt.trim()) return;

    const findings = lint(target, prompt);
    const sevRank = { high: 0, med: 1, low: 2 };
    findings.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

    renderScore(target, prompt, findings);
    renderFindings(findings, target);
    $("original").value = prompt;
    const words = prompt.trim().split(/\s+/).filter(Boolean).length;
    $("orig-meta").textContent = `${words} words · ${TARGETS[target].label.replace(/\s*\(.*\)/, "")}`;
    $("rewrite").value = scaffold(target, prompt, findings);

    const results = $("results");
    if (results.hidden) {
      results.hidden = false;
      requestAnimationFrame(() => observeReveals(results));
    }
    results.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderFindings(findings, target) {
    const list = $("findings");
    $("findings-count").textContent = findings.length;
    list.innerHTML = "";
    if (findings.length === 0) {
      const li = document.createElement("li");
      li.className = "ok";
      li.innerHTML = `<strong>No issues found by the ${escapeHtml(TARGETS[target].label)} ruleset.</strong> This is a well-formed prompt.`;
      list.appendChild(li);
      return;
    }
    findings.forEach((f, i) => {
      const li = document.createElement("li");
      li.className = "sev-" + f.severity;
      li.style.animationDelay = i * 55 + "ms";
      li.innerHTML =
        `<span class="sev">${f.severity}</span>` +
        `<strong>${escapeHtml(f.message)}</strong>` +
        `${escapeHtml(f.fix)} <a href="${f.doc}" target="_blank" rel="noopener">docs ↗</a>`;
      list.appendChild(li);
    });
  }

  /* score: start at 100, subtract weighted penalties for the target's applicable rules */
  function renderScore(target, prompt, findings) {
    const weight = { high: 22, med: 12, low: 6 };
    let score = 100;
    for (const f of findings) score -= weight[f.severity] || 8;
    score = Math.max(5, Math.min(100, score));

    const ring = $("ring-fill");
    const C = 2 * Math.PI * 52; // 326.7
    ring.style.strokeDashoffset = C * (1 - score / 100);
    const color = score >= 80 ? "var(--accent)" : score >= 55 ? "var(--med)" : "var(--high)";
    ring.style.stroke = color;

    animateNumber($("score-val"), score);
    $("score-caption").textContent =
      findings.length === 0
        ? "Excellent — nothing to fix."
        : score >= 80 ? "Solid, minor tweaks below."
        : score >= 55 ? "Decent — a few gaps to close."
        : "Needs work — see the findings.";
  }

  function animateNumber(el, to) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { el.textContent = to; return; }
    const dur = 800, start = performance.now();
    let done = false;
    const finish = () => { if (!done) { done = true; el.textContent = to; } };
    // safety net: if rAF is throttled (backgrounded tab), still land the value
    const guard = setTimeout(finish, dur + 120);
    (function step(now) {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1 && !done) requestAnimationFrame(step);
      else { clearTimeout(guard); finish(); }
    })(start);
  }

  /* ---------- copy ---------- */
  $("copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("rewrite").value);
    const btn = $("copy");
    const orig = btn.innerHTML;
    btn.innerHTML = "Copied!";
    setTimeout(() => (btn.innerHTML = orig), 1200);
  });

  /* ---------- optional LLM rewrite ---------- */
  $("llm-rewrite").addEventListener("click", async () => {
    const prompt = promptEl.value.trim();
    if (!prompt) return;
    const target = targetSel.value;
    const provider = providerSel.value;
    const key = $("apikey").value.trim();
    const model = $("model").value.trim() || PROVIDERS[provider].model;
    if (!key) return setStatus("Enter an API key first (it stays in your browser).");
    if (provider === "custom" && !model) return setStatus("Enter a model name for your custom endpoint.");

    localStorage.setItem("pr_key_" + provider, key);
    localStorage.setItem("pr_model_" + provider, model);
    if (provider === "custom") localStorage.setItem("pr_base_custom", $("baseurl").value.trim());

    setStatus("Rewriting…");
    $("llm-rewrite").disabled = true;
    try {
      const text = await callProvider(provider, key, model, llmSystemPrompt(target), prompt);
      $("rewrite").value = text.trim();
      setStatus("Done — AI rewrite shown above.");
    } catch (e) {
      setStatus("Error: " + e.message);
    } finally {
      $("llm-rewrite").disabled = false;
    }
  });

  const setStatus = (msg) => ($("llm-status").textContent = msg);

  async function callProvider(provider, key, model, system, user) {
    if (provider === "anthropic") {
      const r = await postJson(
        "https://api.anthropic.com/v1/messages",
        { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        { model, max_tokens: 4096, system, messages: [{ role: "user", content: user }] }
      );
      return r.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    }
    if (provider === "gemini") {
      const r = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {},
        { system_instruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }] }
      );
      return r.candidates[0].content.parts.map((p) => p.text || "").join("");
    }
    /* openai, perplexity, and any OpenAI-compatible endpoint share one shape */
    const url =
      provider === "openai" ? "https://api.openai.com/v1/chat/completions"
      : provider === "perplexity" ? "https://api.perplexity.ai/chat/completions"
      : $("baseurl").value.trim().replace(/\/+$/, "") + "/chat/completions";
    const r = await postJson(url, { Authorization: "Bearer " + key }, {
      model, messages: [{ role: "system", content: system }, { role: "user", content: user }],
    });
    return r.choices[0].message.content;
  }

  async function postJson(url, headers, body) {
    let resp;
    try {
      resp = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    } catch (e) {
      throw new Error("network/CORS blocked — this provider may not allow browser calls (" + e.message + ")");
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
    return resp.json();
  }

  /* ---------- scroll reveals ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.12 }
  );
  function observeReveals(root = document) { root.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el)); }
  observeReveals();

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
