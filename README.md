# Prompt Rewriter

Free, open-source prompt rewriter. Paste a prompt, pick the model you'll run it on, and get it **linted and restructured against that vendor's official prompting guide** — Anthropic, OpenAI, Google, and Perplexity.

**No server. No account. No tracking.** It's a static page; everything runs in your browser.

## How it works

1. **Lint** — your prompt is checked against rules distilled from the official docs (missing output format, hedged verbs, aggressive ALL-CAPS language that over-triggers modern Claude, instructions-before-context on long Gemini inputs, uncapped list requests on Perplexity, …). Every finding links to the doc it came from.
2. **Rules-based rewrite (always free)** — your prompt is restructured into the target vendor's preferred shape (XML tags for Claude, Goal/Context/Output/Boundaries for GPT, context-first for Gemini, tight search-shaped queries for Perplexity), with `[TODO]` markers where the guides say something is missing.
3. **AI rewrite (optional, bring your own key)** — your key is kept in localStorage and sent **directly from your browser to the provider**; this site never sees it. Works with Anthropic, OpenAI, Gemini, and Perplexity keys.

## Run it

Open `index.html`. That's it. Or host it anywhere static (GitHub Pages: Settings → Pages → deploy from branch).

## Test

```
node test.js
```

## Contributing

All the knowledge lives in [`rules.js`](rules.js): lint rules, rewrite scaffolds, and the per-vendor system prompts for the AI rewrite. Each rule cites its source doc — PRs that add rules should too.

## Sources

- [Anthropic — Claude prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Anthropic — Prompting Claude Opus 4.8](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-4-8)
- [Anthropic — Prompting Claude Sonnet 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5)
- [Anthropic — Console prompting tools](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-tools)
- [OpenAI — Prompting guide](https://learn.chatgpt.com/docs/prompting)
- [Google — Gemini prompting strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
- [Perplexity — Prompt guide](https://docs.perplexity.ai/docs/agent-api/prompt-guide)

## License

MIT — see [LICENSE](LICENSE).
