# Workout Logger PWA — Phase 5

Phase 5 completes the local-first workout logger MVP with JSON import/export and final PWA polish.

## Added in Phase 5

- Export one routine from the routine menu
- Export all routines from the Routines screen
- Export routines only, or routines plus retained five-session history
- JSON export envelope with format, schema version, export timestamp and app version
- Import JSON routine files
- Import routine name conflict handling: replace, keep both or cancel
- Imported custom exercise creation when no local match exists
- Exercise matching by stable ID, then normalised name plus equipment
- Five-session history cap enforced during import
- Updated service worker cache version
- iPhone PWA metadata retained: standalone display, safe-area viewport, icons and Apple touch icon

## Retained behaviour from earlier phases

- Searchable local exercise library
- Custom exercises
- Routine builder
- Sets, reps and kilograms
- Active workout logging
- Previous-session prefilling
- Supersets and round sequencing
- Recent Sessions screen
- Read-only session detail
- Local IndexedDB storage
- Offline operation after first load

## Running locally

Use any static web server from this directory.

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

For iPhone testing, serve the folder over HTTPS or deploy to a static host, then open in Safari and choose **Add to Home Screen**.

## Export behaviour

The export buttons create a `.json` file using this envelope:

```json
{
  "format": "workout-pwa-export",
  "schemaVersion": 1,
  "appVersion": "phase-5",
  "exportedAt": "2026-07-21T00:00:00.000Z",
  "includesRecentHistory": true,
  "exercises": [],
  "routines": [],
  "sessions": []
}
```

When recent history is included, no more than five completed sessions per routine are exported.

## Import behaviour

The importer validates:

- export format
- schema version
- routine names
- exercise blocks
- set values

For duplicate routine names, type one of:

- `replace`
- `keep`
- `cancel`

Imported sessions are capped to the newest five per routine.
