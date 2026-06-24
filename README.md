# Single-User Book Planner (GitHub Pages + Cloudflare Worker)

This project is a single-user planning app that works offline and syncs data to JSON files in a private GitHub repository.

## Architecture

- **Frontend**: Vanilla JavaScript app (GitHub Pages)
- **Storage**: IndexedDB local cache for offline support
- **Sync API**: Cloudflare Worker (`/planner` GET + POST)
- **Remote data**: JSON files in a private GitHub repository
- **Security**: GitHub token stored only as a Cloudflare Worker secret

## Frontend features

- Async loading and saving
- Manual **Save Now** button
- Debounced autosave
- Graceful network error handling
- Offline-first behavior with IndexedDB cache
- Automatic sync retry when connection returns

## Configure frontend

Edit `index.html` and set:

```html
<script>
  window.BOOK_PLANNER_API = 'https://your-worker-subdomain.workers.dev';
</script>
```

## Worker setup

See full deployment instructions in:

- `worker/README.md`

## Data files

By default, the Worker stores:

- `planner-data/characters.json`
- `planner-data/chapters.json`
- `planner-data/worldbuilding.json`
- `planner-data/notes.json`
- `planner-data/timeline.json`

The Worker also accepts additional safe file keys and writes them as `<key>.json`.

## Local run

Open `index.html` in your browser.

Without a Worker URL, the app still works locally with IndexedDB offline cache.
