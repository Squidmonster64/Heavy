# Workout Logger PWA — Phase 4

Mobile-first, local-first workout logger.

## Phase 4 additions

- Recent Sessions screen for each routine
- Newest-five completed-session display
- Read-only completed session detail view
- Session summary: completed sets, total sets and calculated volume
- Superset grouping preserved in session detail
- Routine cards now show last completed date
- Deleting a routine also removes its retained sessions
- Retention enforcement on app startup as well as workout completion

## Existing functionality retained

- Searchable exercise library
- Custom exercises
- Routine creation, editing, duplication and deletion
- Per-set kilograms and repetitions
- Active workout logging
- Previous-session prefilling
- Autosave and resume unfinished workout
- Completed workout storage
- Five-session retention per routine
- Superset creation and round-based sequencing
- Offline PWA service worker

## Run locally

Use any static file server from this folder.

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

## Notes

No build step is required. The app uses plain ES modules, IndexedDB and static assets.
