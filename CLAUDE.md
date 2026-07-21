# Everware site

## Content sync

`public/llms.txt` is a hand-maintained summary of the site for LLM consumers. Its
source of truth is `content/copy.json`. **Whenever `content/copy.json` changes,
update `public/llms.txt` to match** — services, capabilities/tech stack, the "why"
comparison, process steps, and FAQ all mirror sections of that file.

Notes:
- Facts not in `copy.json` (KvK 89042786, email `hallo@everware.nl`, phone
  `073 208 9198`) are verified against the rendered `public/index.html`, not invented.
- Experience is written as "since 2014" — the site auto-increments the year count
  client-side from `data-since="2014"`, so don't hardcode a number in `llms.txt`.
