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

There are five ways to edit the list, all of which stay in sync:

1. **Click a state** on the map to toggle it.
2. **Search box** — start typing a state name or abbreviation, click a
   result (or press Enter) to toggle it.
3. **Quick load a saved list** — one-click buttons that replace the current
   list with a preset from [data/](data/) (see below).
4. **Bulk edit** — open "Bulk edit list" in the sidebar, paste a
   comma- or newline-separated list of state names/abbreviations, and click
   *Apply List*. This replaces the whole visited list at once — handy for
   pasting in a list from somewhere else.
5. **Import / Export** — export the current list as a JSON file (array of
   abbreviations), or import a JSON file to load a list back in. Useful for
   backing up your list or sharing it.

## Preset lists

[data/kevin-visited.json](data/kevin-visited.json) and
[data/family-visited.json](data/family-visited.json) are JSON arrays of
state abbreviations, loaded via the "Quick load a saved list" buttons. To
add another *built-in* preset (bundled in the repo, available to everyone):

1. Drop a new JSON file (array of abbreviations or full names) into `data/`.
2. Add a button in [index.html](index.html) with a `data-list-url` pointing
   at the file and a `data-list-label` for the confirmation message — see
   the existing `#load-kevin-btn` / `#load-family-btn` buttons for the
   pattern. No other wiring is needed.

You can also save your own preset without touching the repo: in
**Import / Export**, click **Save New Preset from File**, pick a JSON file
(array of state names/abbreviations), and give it a name. It's saved to
that browser's `localStorage` and shows up as a chip next to Kevin's/
Family's buttons — click the chip to load it, or the "×" to delete it.
Since it's local storage, it only shows up in the browser it was saved in.

The list is saved to the browser's `localStorage`, so it persists across
reloads on the same machine/browser. To set a different starting list for a
fresh browser, edit `DEFAULT_VISITED` in [states.js](states.js:53).

## Files

- [index.html](index.html) — page structure
- [style.css](style.css) — styling
- [states.js](states.js) — FIPS-code-to-state lookup table + default list
- [app.js](app.js) — map rendering (D3 + topojson) and all UI logic
