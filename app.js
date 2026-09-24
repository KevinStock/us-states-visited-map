(function () {
  "use strict";

  const STORAGE_KEY = "visitedStates";
  const TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

  // Lookup helpers built from STATE_FIPS (defined in states.js)
  const ABBR_TO_FIPS = {};
  const NAME_TO_FIPS = {};
  Object.entries(STATE_FIPS).forEach(([fips, info]) => {
    ABBR_TO_FIPS[info.abbr] = fips;
    NAME_TO_FIPS[info.name.toLowerCase()] = fips;
  });
  const ALL_ABBRS = Object.values(STATE_FIPS).map((s) => s.abbr).sort();

  let visited = loadVisited();

  // ---------- persistence ----------

  function loadVisited() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {
      console.warn("Could not read saved list, using default.", e);
    }
    return new Set(DEFAULT_VISITED);
  }

  function saveVisited() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
  }

  // ---------- mutation ----------

  function resolveAbbr(input) {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const upper = trimmed.toUpperCase();
    if (ABBR_TO_FIPS[upper]) return upper;
    const fips = NAME_TO_FIPS[trimmed.toLowerCase()];
    if (fips) return STATE_FIPS[fips].abbr;
    return null;
  }

  function toggleState(abbr) {
    if (visited.has(abbr)) visited.delete(abbr);
    else visited.add(abbr);
    saveVisited();
    renderAll();
  }

  function setVisitedList(abbrs) {
    visited = new Set(abbrs);
    saveVisited();
    renderAll();
  }

  function selectAll() {
    setVisitedList(ALL_ABBRS);
  }

  function clearAll() {
    setVisitedList([]);
  }

  // ---------- map ----------

  let svg, gStates, path;

  function initMap(topology) {
    const statesGeo = topojson.feature(topology, topology.objects.states);

    const width = 960;
    const height = 600;

    svg = d3
      .select("#map")
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const projection = d3.geoAlbersUsa().fitSize([width, height], statesGeo);
    path = d3.geoPath(projection);

    gStates = svg
      .append("g")
      .selectAll("path")
      .data(statesGeo.features)
      .join("path")
      .attr("d", path)
      .attr("class", "state")
      .attr("data-fips", (d) => d.id)
      .on("click", (event, d) => {
        const info = STATE_FIPS[d.id];
        if (!info) return;
        toggleState(info.abbr);
      })
      .on("mousemove", (event, d) => {
        const info = STATE_FIPS[d.id];
        if (!info) return;
        showTooltip(event, info);
      })
      .on("mouseleave", hideTooltip);

    colorMap();
  }

  function colorMap() {
    if (!gStates) return;
    gStates.classed("visited", (d) => {
      const info = STATE_FIPS[d.id];
      return info ? visited.has(info.abbr) : false;
    });
  }

  function showTooltip(event, info) {
    const tooltip = document.getElementById("tooltip");
    tooltip.textContent = `${info.name}${visited.has(info.abbr) ? " ✓ visited" : ""}`;
    tooltip.classList.remove("hidden");
    const mapRect = document.getElementById("map").getBoundingClientRect();
    tooltip.style.left = event.clientX - mapRect.left + 12 + "px";
    tooltip.style.top = event.clientY - mapRect.top + 12 + "px";
  }

  function hideTooltip() {
    document.getElementById("tooltip").classList.add("hidden");
  }

  // ---------- sidebar UI ----------

  function renderStats() {
    document.getElementById("stats").textContent = `${visited.size} / ${ALL_ABBRS.length} visited`;
    document.getElementById("visited-count").textContent = visited.size;
  }

  function renderVisitedList() {
    const list = document.getElementById("visited-list");
    list.innerHTML = "";
    const sorted = [...visited]
      .map((abbr) => STATE_FIPS[ABBR_TO_FIPS[abbr]])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (sorted.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-msg";
      li.textContent = "No states visited yet.";
      list.appendChild(li);
      return;
    }

    sorted.forEach((info) => {
      const li = document.createElement("li");
      li.className = "visited-chip";
      li.innerHTML = `<span>${info.name}</span>`;
      const removeBtn = document.createElement("button");
      removeBtn.className = "chip-remove";
      removeBtn.textContent = "×";
      removeBtn.setAttribute("aria-label", `Remove ${info.name}`);
      removeBtn.addEventListener("click", () => toggleState(info.abbr));
      li.appendChild(removeBtn);
      list.appendChild(li);
    });
  }

  function renderAll() {
    colorMap();
    renderStats();
    renderVisitedList();
  }

  // ---------- search / autocomplete ----------

  function initSearch() {
    const input = document.getElementById("search-input");
    const listEl = document.getElementById("autocomplete-list");

    function showMatches() {
      const q = input.value.trim().toLowerCase();
      listEl.innerHTML = "";
      if (!q) {
        listEl.classList.add("hidden");
        return;
      }
      const matches = Object.values(STATE_FIPS)
        .filter((info) => info.name.toLowerCase().includes(q) || info.abbr.toLowerCase() === q)
        .slice(0, 8);

      if (matches.length === 0) {
        listEl.classList.add("hidden");
        return;
      }

      matches.forEach((info) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        const isVisited = visited.has(info.abbr);
        item.innerHTML = `<span>${info.name} (${info.abbr})</span><span class="ac-flag">${isVisited ? "Remove" : "Add"}</span>`;
        item.addEventListener("click", () => {
          toggleState(info.abbr);
          input.value = "";
          listEl.classList.add("hidden");
          input.focus();
        });
        listEl.appendChild(item);
      });
      listEl.classList.remove("hidden");
    }

    input.addEventListener("input", showMatches);
    input.addEventListener("focus", showMatches);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = input.value.trim();
        const abbr = resolveAbbr(q);
        if (abbr) {
          toggleState(abbr);
          input.value = "";
          listEl.classList.add("hidden");
        }
      } else if (e.key === "Escape") {
        listEl.classList.add("hidden");
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-wrap")) listEl.classList.add("hidden");
    });
  }

  // ---------- bulk edit ----------

  function initBulkEdit() {
    document.getElementById("bulk-apply").addEventListener("click", () => {
      const raw = document.getElementById("bulk-textarea").value;
      const tokens = raw
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter(Boolean);

      const resolved = [];
      const unresolved = [];
      tokens.forEach((t) => {
        const abbr = resolveAbbr(t);
        if (abbr) resolved.push(abbr);
        else unresolved.push(t);
      });

      setVisitedList(resolved);

      if (unresolved.length) {
        alert(`Applied list. Could not recognize: ${unresolved.join(", ")}`);
      }
    });
  }

  // ---------- image export ----------

  function getCssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function exportMapImage() {
    const svgEl = document.querySelector("#map svg");
    if (!svgEl) return;

    const bg = getCssVar("--bg", "#0f172a");
    const visitedColor = getCssVar("--visited", "#22c55e");
    const unvisitedColor = getCssVar("--unvisited", "#475569");
    const accent = getCssVar("--accent", "#38bdf8");

    const clone = svgEl.cloneNode(true);
    clone.querySelectorAll("path.state").forEach((p) => {
      const isVisited = p.classList.contains("visited");
      p.setAttribute("fill", isVisited ? visitedColor : unvisitedColor);
      p.setAttribute("stroke", bg);
      p.removeAttribute("class");
    });

    const viewBoxAttr = clone.getAttribute("viewBox");
    const [, , vbWidth, vbHeight] = viewBoxAttr.split(" ").map(Number);
    const captionHeight = 40;
    const totalHeight = vbHeight + captionHeight;

    clone.setAttribute("viewBox", `0 0 ${vbWidth} ${totalHeight}`);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const svgNS = "http://www.w3.org/2000/svg";

    const bgRect = document.createElementNS(svgNS, "rect");
    bgRect.setAttribute("x", 0);
    bgRect.setAttribute("y", 0);
    bgRect.setAttribute("width", vbWidth);
    bgRect.setAttribute("height", totalHeight);
    bgRect.setAttribute("fill", bg);
    clone.insertBefore(bgRect, clone.firstChild);

    const mapGroup = clone.querySelector("g");
    if (mapGroup) mapGroup.setAttribute("transform", `translate(0, ${captionHeight})`);

    const caption = document.createElementNS(svgNS, "text");
    caption.setAttribute("x", 16);
    caption.setAttribute("y", captionHeight / 2 + 6);
    caption.setAttribute("font-family", "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif");
    caption.setAttribute("font-size", "18");
    caption.setAttribute("font-weight", "700");
    caption.setAttribute("fill", accent);
    caption.textContent = `${visited.size} / ${ALL_ABBRS.length} states visited`;
    clone.appendChild(caption);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const scale = 2;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = vbWidth * scale;
      canvas.height = totalHeight * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);

      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Could not generate PNG image.");
          return;
        }
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "visited-states-map.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(pngUrl);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      alert("Could not render the map image for export.");
    };
    img.src = svgUrl;
  }

  // ---------- import / export ----------

  function initImportExport() {
    document.getElementById("export-btn").addEventListener("click", () => {
      const data = JSON.stringify([...visited].sort(), null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "visited-states.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    document.getElementById("import-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of state names/abbreviations.");
          const resolved = parsed.map(resolveAbbr).filter(Boolean);
          setVisitedList(resolved);
        } catch (err) {
          alert("Could not import file: " + err.message);
        } finally {
          e.target.value = "";
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("export-image-btn").addEventListener("click", exportMapImage);
  }

  // ---------- confirm modal (native confirm() is unreliable in embedded webviews) ----------

  function showConfirm(message, onConfirm, confirmLabel) {
    const overlay = document.getElementById("confirm-overlay");
    const yesBtn = document.getElementById("confirm-yes");
    const noBtn = document.getElementById("confirm-no");
    document.getElementById("confirm-message").textContent = message;
    yesBtn.textContent = confirmLabel || "Confirm";

    function close() {
      overlay.classList.add("hidden");
      yesBtn.removeEventListener("click", onYes);
      noBtn.removeEventListener("click", close);
    }
    function onYes() {
      close();
      onConfirm();
    }

    yesBtn.addEventListener("click", onYes);
    noBtn.addEventListener("click", close);
    overlay.classList.remove("hidden");
  }

  // ---------- buttons ----------

  function initButtons() {
    document.getElementById("select-all").addEventListener("click", selectAll);
    document.getElementById("clear-all").addEventListener("click", () => {
      if (visited.size === 0) return;
      showConfirm(`Clear all ${visited.size} visited state${visited.size === 1 ? "" : "s"}?`, clearAll, "Clear All");
    });
  }

  // ---------- quick-load preset lists ----------

  function loadPresetList(url, label) {
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Expected a JSON array of state names/abbreviations.");
        const resolved = data.map(resolveAbbr).filter(Boolean);
        const apply = () => setVisitedList(resolved);
        if (visited.size > 0) {
          showConfirm(`Replace the current list with ${label} saved list (${resolved.length} states)?`, apply, "Replace List");
        } else {
          apply();
        }
      })
      .catch((err) => {
        console.error(err);
        alert(`Could not load ${label} list: ${err.message}`);
      });
  }

  function initPresetButtons() {
    document.querySelectorAll("[data-list-url]").forEach((btn) => {
      btn.addEventListener("click", () => {
        loadPresetList(btn.dataset.listUrl, btn.dataset.listLabel);
      });
    });
  }

  // ---------- boot ----------

  d3.json(TOPO_URL)
    .then((topology) => {
      initMap(topology);
      renderAll();
    })
    .catch((err) => {
      console.error(err);
      document.getElementById("map").innerHTML =
        '<p class="error-msg">Could not load map data. Check your internet connection and reload.</p>';
    });

  initSearch();
  initBulkEdit();
  initImportExport();
  initButtons();
  initPresetButtons();
  renderAll();
})();
