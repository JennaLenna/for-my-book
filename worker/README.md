# Cloudflare Worker API

This Worker exposes a single-user API for your frontend:

- `GET /planner` → reads planner JSON files from a private GitHub repository
- `POST /planner` → writes planner JSON files to that repository

## 1) Prerequisites

- Cloudflare account + Workers enabled
- `npm install -g wrangler`
- A private GitHub repository for planner data
- A GitHub Personal Access Token with repo content access

## 2) Configure Worker

From `/worker`:

```bash
wrangler login
wrangler secret put GITHUB_TOKEN
```

Then review `wrangler.toml` variables:

- `ALLOWED_ORIGIN` (set to your GitHub Pages URL)
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `GITHUB_DATA_DIR`

## 3) Deploy

```bash
wrangler deploy
```

Use the returned URL in your frontend as `window.BOOK_PLANNER_API`.

## 4) Expected file layout in GitHub

The Worker reads/writes JSON files under `planner-data/` by default:

- `planner-data/characters.json`
- `planner-data/chapters.json`
- `planner-data/worldbuilding.json`
- `planner-data/notes.json`
- `planner-data/timeline.json`

Each file stores data in this shape:

```json
{
  "content": "...",
  "updatedAt": 1710000000000
}
```
