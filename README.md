# US States Visited Map

A single-page, no-build web app that shows a map of the United States and
colors in each state you've visited.

## Running it

Just open [index.html](index.html) in a browser — no build step or server
required (it needs an internet connection the first time it loads, to pull
the map data and D3 from a CDN).

If you'd rather run it from a local server (avoids any `file://` quirks in
some browsers):

```bash
python -m http.server 8000
```

then visit `http://localhost:8000`.

## Changing which states are marked visited

There are four ways to edit the list, all of which stay in sync:

1. **Click a state** on the map to toggle it.
2. **Search box** — start typing a state name or abbreviation, click a
   result (or press Enter) to toggle it.
3. **Bulk edit** — open "Bulk edit list" in the sidebar, paste a
   comma- or newline-separated list of state names/abbreviations, and click
   *Apply List*. This replaces the whole visited list at once — handy for
   pasting in a list from somewhere else.
4. **Import / Export** — export the current list as a JSON file (array of
   abbreviations), or import a JSON file to load a list back in. Useful for
   backing up your list or sharing it.

The list is saved to the browser's `localStorage`, so it persists across
reloads on the same machine/browser. To set a different starting list for a
fresh browser, edit `DEFAULT_VISITED` in [states.js](states.js:53).

## Files

- [index.html](index.html) — page structure
- [style.css](style.css) — styling
- [states.js](states.js) — FIPS-code-to-state lookup table + default list
- [app.js](app.js) — map rendering (D3 + topojson) and all UI logic
