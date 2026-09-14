# Training Hub — Usable Alpha

Current alpha acceptance target:

1. Seed a useful training programme and surface it on Today / Program / Library.
2. Keep Intervals.icu credentials server-side and prove authenticated connectivity.
3. Pull recent activities and wellness.
4. Push a planned session using its stable external ID.
5. Push the same session a second time and verify the remote event ID remains stable.
6. Verify at least one execution export end-to-end (Watchletic first).

The production deploy runs migrations, the idempotent seed, and a non-blocking alpha smoke check before starting the web application. Smoke results are also written to SyncLog so the app remains available even when an external integration is unavailable.
