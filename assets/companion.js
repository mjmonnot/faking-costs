/* Shared widgets for the research companion pages.
   Every number a page passes in is a published aggregate from the preprint.
   No data are loaded and nothing is estimated in the browser. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function s(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function num(x, d) {
    d = d == null ? 2 : d;
    var a = Math.abs(x).toFixed(d);
    return (x < 0 && parseFloat(a) !== 0 ? "\u2212" : "") + a;
  }

  function segmented(options, onPick, label) {
    var wrap = h("div", { "class": "seg", role: "group", "aria-label": label || "Choose" });
    options.forEach(function (o, i) {
      var b = h("button", { type: "button", "aria-pressed": i === 0 ? "true" : "false" }, o.label);
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(wrap.children, function (c) {
          c.setAttribute("aria-pressed", c === b ? "true" : "false");
        });
        onPick(o, i);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* ------------------------------------------------------------------
     Interval explorer: one row per published estimate, with its
     interval drawn against zero. Click a row to read it in plain words.
     ------------------------------------------------------------------ */
  function intervals(root, cfg) {
    var groups = cfg.groups || null;
    var group = groups ? groups[0].id : null;
    var selected = null;
    var d = cfg.digits == null ? 2 : cfg.digits;

    root.classList.add("calc");
    var left = h("div", { "class": "controls" });
    var right = h("div", { "class": "results", "aria-live": "polite" });
    root.appendChild(left);
    root.appendChild(right);

    if (groups) {
      left.appendChild(segmented(groups, function (g) {
        group = g.id;
        selected = null;
        render();
      }, cfg.groupLabel));
    }
    var groupNote = h("p", { "class": "control-note" });
    var fig = h("figure", { "class": "chart" });
    var svg = s("svg", { role: "group", "aria-label": cfg.title || "Estimates with intervals" });
    fig.appendChild(svg);
    if (cfg.caption) fig.appendChild(h("figcaption", {}, cfg.caption));
    left.appendChild(fig);
    left.appendChild(groupNote);

    var value = h("span", { "class": "stat-value red" });
    var label = h("span", { "class": "stat-label" });
    var sub = h("span", { "class": "stat-sub" });
    var stat = h("div", { "class": "stat" });
    stat.appendChild(value); stat.appendChild(label); stat.appendChild(sub);
    var reading = h("p", { "class": "reading" });
    var bar = h("div", { "class": "kicker-bar" });
    var barMain = h("p", { "class": "kicker-main" });
    var barSub = h("p", { "class": "kicker-sub" });
    bar.appendChild(barMain); bar.appendChild(barSub);
    var note = h("p", { "class": "dollar-note" });
    right.appendChild(stat); right.appendChild(reading); right.appendChild(bar); right.appendChild(note);

    var W = 560, L = 18, R = 18, T = 30, ROW = 46, B = 46;

    function rows() {
      return cfg.items.filter(function (it) { return !groups || it.group === group; });
    }

    function render() {
      var items = rows();
      var g = groups ? groups.filter(function (x) { return x.id === group; })[0] : cfg;
      var min = g.min != null ? g.min : cfg.min;
      var max = g.max != null ? g.max : cfg.max;
      var ticks = g.ticks || cfg.ticks;
      var predicted = g.predicted !== undefined ? g.predicted : cfg.predicted;
      var axisLabel = g.axisLabel || cfg.axisLabel || "";
      if (!selected || !items.some(function (it) { return it.id === selected; })) selected = items[0].id;

      var H = T + ROW * items.length + B;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var x = function (v) { return L + (W - L - R) * ((v - min) / (max - min)); };
      var bottom = T + ROW * items.length;

      if (predicted) {
        var x0 = predicted.side === "neg" ? x(min) : x(0);
        var x1 = predicted.side === "neg" ? x(0) : x(max);
        svg.appendChild(s("rect", { x: x0, y: T - 8, width: x1 - x0, height: bottom - T + 8, "class": "band" }));
        svg.appendChild(s("text", {
          x: predicted.side === "neg" ? x0 + 6 : x1 - 6, y: T - 14,
          "text-anchor": predicted.side === "neg" ? "start" : "end", "class": "band-label"
        }, predicted.label));
      }

      ticks.forEach(function (t) {
        svg.appendChild(s("line", { x1: x(t), x2: x(t), y1: bottom, y2: bottom + 5, "class": "axis" }));
        svg.appendChild(s("text", { x: x(t), y: bottom + 19, "text-anchor": "middle" }, num(t, g.tickDigits != null ? g.tickDigits : (cfg.tickDigits != null ? cfg.tickDigits : 1))));
      });
      svg.appendChild(s("line", { x1: L, x2: W - R, y1: bottom, y2: bottom, "class": "axis" }));
      if (min < 0 && max > 0) svg.appendChild(s("line", { x1: x(0), x2: x(0), y1: T - 8, y2: bottom, "class": "zero" }));
      svg.appendChild(s("text", { x: (L + W - R) / 2, y: H - 8, "text-anchor": "middle", "class": "lbl" }, axisLabel));

      items.forEach(function (it, i) {
        var top = T + ROW * i;
        var grp = s("g", { "class": "row" + (it.id === selected ? " sel" : "") });
        if (it.id === selected) grp.appendChild(s("rect", { x: 0, y: top - 2, width: W, height: ROW - 2, "class": "row-bg" }));
        grp.appendChild(s("text", { x: L, y: top + 14, "class": "row-label" }, it.short || it.label));
        var lo = Math.max(it.lo, min), hi = Math.min(it.hi, max);
        grp.appendChild(s("line", { x1: x(lo), x2: x(hi), y1: top + 30, y2: top + 30, "class": "ci-line" }));
        grp.appendChild(s("circle", { cx: x(it.est), cy: top + 30, r: it.id === selected ? 6.5 : 5, "class": "ci-dot" }));
        var hit = s("rect", {
          x: 0, y: top - 2, width: W, height: ROW - 2, "class": "row-hit", tabindex: "0", role: "button",
          "aria-label": (it.short || it.label) + ": " + num(it.est, d) + ", 95% interval " + num(it.lo, d) + " to " + num(it.hi, d)
        });
        var pick = function () { selected = it.id; render(); var again = svg.querySelector('[data-id="' + it.id + '"]'); if (again) again.focus(); };
        hit.setAttribute("data-id", it.id);
        hit.addEventListener("click", pick);
        hit.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); }
        });
        grp.appendChild(hit);
        svg.appendChild(grp);
      });

      var cur = items.filter(function (it) { return it.id === selected; })[0];
      var unit = cur.unit != null ? cur.unit : (g.unit != null ? g.unit : (cfg.unit || ""));
      var includes = cur.lo <= 0 && cur.hi >= 0;
      value.textContent = num(cur.est, cur.digits != null ? cur.digits : d) + unit;
      value.className = "stat-value " + (includes ? "ink" : "red");
      label.innerHTML = cur.label;
      sub.innerHTML = (cfg.intervalName || "95% interval") + ": " + num(cur.lo, cur.digits != null ? cur.digits : d) + " to " + num(cur.hi, cur.digits != null ? cur.digits : d) + unit + (cur.extra ? ". " + cur.extra : "");
      reading.innerHTML = cur.reading || "";
      var verdict = cur.verdict || (includes
        ? { muted: true, main: cfg.includesMain || "The interval includes zero.", sub: cfg.includesSub || "The data are compatible with an effect in either direction, or with none." }
        : { muted: false, main: cfg.excludesMain || "The interval excludes zero.", sub: cfg.excludesSub || "The data point in one direction." });
      bar.className = "kicker-bar" + (verdict.muted ? " muted" : "");
      barMain.innerHTML = verdict.main;
      barSub.innerHTML = verdict.sub;
      note.innerHTML = cur.note || cfg.note || "";
      groupNote.innerHTML = (g && g.note) || cfg.hint || "Select a row to read that estimate.";
    }
    render();
  }

  /* ------------------------------------------------------------------
     Icon array: 100 dots, some filled. Optional buttons switch scenario.
     ------------------------------------------------------------------ */
  function iconArray(root, cfg) {
    var holder = h("div", { "class": "arrays" });
    var note = h("p", { "class": "control-note" });
    if (cfg.options.length > 1) {
      root.appendChild(segmented(cfg.options, function (o) { draw(o); }, cfg.label));
    }
    root.appendChild(holder);
    root.appendChild(note);

    function draw(o) {
      holder.innerHTML = "";
      holder.className = "arrays" + (o.panels.length === 1 ? " single" : "");
      o.panels.forEach(function (p) {
        var fig = h("figure", { "class": "icon-figure " + (p.tone || "") });
        var arr = h("div", {
          "class": "icon-array " + (p.tone || ""), role: "img",
          "aria-label": p.filled + " of 100 dots filled: " + p.who + " " + p.text
        });
        for (var i = 0; i < 100; i++) arr.appendChild(h("span", { "class": "dot" + (i < p.filled ? " on" : "") }));
        fig.appendChild(arr);
        fig.appendChild(h("figcaption", {}, '<span class="count">' + p.filled + "</span> of 100 " + p.text + '<span class="who">' + p.who + "</span>"));
        holder.appendChild(fig);
      });
      note.innerHTML = o.note || cfg.note || "";
    }
    draw(cfg.options[0]);
  }

  /* ------------------------------------------------------------------
     Fan chart: a published line (a + b * (x - x0)) for one or more
     series, with a fan from the published interval of the slope b.
     A slider reads the line at a chosen x.
     ------------------------------------------------------------------ */
  function fan(root, cfg) {
    root.classList.add("calc");
    var left = h("div", { "class": "controls" });
    var right = h("div", { "class": "results", "aria-live": "polite" });
    root.appendChild(left); root.appendChild(right);

    var fig = h("figure", { "class": "chart" });
    var svg = s("svg", { viewBox: "0 0 560 340", role: "img", "aria-label": cfg.title });
    fig.appendChild(svg);
    var cap = h("figcaption", {}, cfg.caption || "");
    fig.appendChild(cap);
    left.appendChild(fig);

    var row = h("div", { "class": "slider-row" });
    var id = "fan-" + Math.random().toString(36).slice(2, 8);
    row.appendChild(h("label", { "for": id }, cfg.sliderLabel));
    var input = h("input", { type: "range", id: id, min: cfg.xMin, max: cfg.xMax, step: cfg.xStep, value: cfg.xStart != null ? cfg.xStart : cfg.x0 });
    var out = h("output", { "for": id });
    row.appendChild(input); row.appendChild(out);
    left.appendChild(row);
    if (cfg.sliderNote) left.appendChild(h("p", { "class": "control-note" }, cfg.sliderNote));

    var W = 560, H = 340, L = 54, R = 16, T = 18, B = 46;
    var x = function (v) { return L + (W - L - R) * ((v - cfg.xMin) / (cfg.xMax - cfg.xMin)); };
    var y = function (v) { return T + (H - T - B) * (1 - (v - cfg.yMin) / (cfg.yMax - cfg.yMin)); };
    var at = function (se, b, xv) { return se.a + b * (xv - cfg.x0); };

    function render() {
      var xv = parseFloat(input.value);
      out.textContent = cfg.xFormat(xv);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      cfg.yTicks.forEach(function (t) {
        svg.appendChild(s("line", { x1: L, x2: W - R, y1: y(t), y2: y(t), "class": t === 0 ? "zero" : "grid" }));
        svg.appendChild(s("text", { x: L - 8, y: y(t) + 4, "text-anchor": "end" }, num(t, cfg.yDigits != null ? cfg.yDigits : 1)));
      });
      cfg.xTicks.forEach(function (t) {
        svg.appendChild(s("line", { x1: x(t), x2: x(t), y1: y(cfg.yMin), y2: y(cfg.yMin) + 5, "class": "axis" }));
        svg.appendChild(s("text", { x: x(t), y: y(cfg.yMin) + 19, "text-anchor": "middle" }, cfg.xTickFormat ? cfg.xTickFormat(t) : String(t)));
      });
      svg.appendChild(s("line", { x1: L, x2: L, y1: T, y2: y(cfg.yMin), "class": "axis" }));
      svg.appendChild(s("line", { x1: L, x2: W - R, y1: y(cfg.yMin), y2: y(cfg.yMin), "class": "axis" }));
      svg.appendChild(s("text", { x: (L + W - R) / 2, y: H - 8, "text-anchor": "middle", "class": "lbl" }, cfg.xLabel));
      var ym = (T + y(cfg.yMin)) / 2;
      svg.appendChild(s("text", { x: 14, y: ym, "text-anchor": "middle", "class": "lbl", transform: "rotate(-90 14 " + ym + ")" }, cfg.yLabel));

      var clamp = function (v) { return Math.max(cfg.yMin, Math.min(cfg.yMax, v)); };
      cfg.series.forEach(function (se, i) {
        var pts = [
          [cfg.xMin, at(se, se.bLo, cfg.xMin)], [cfg.x0, se.a], [cfg.xMax, at(se, se.bLo, cfg.xMax)],
          [cfg.xMax, at(se, se.bHi, cfg.xMax)], [cfg.x0, se.a], [cfg.xMin, at(se, se.bHi, cfg.xMin)]
        ].map(function (p) { return x(p[0]) + "," + y(clamp(p[1])); }).join(" ");
        svg.appendChild(s("polygon", { points: pts, "class": "fan", fill: se.color }));
        svg.appendChild(s("line", {
          x1: x(cfg.xMin), y1: y(clamp(at(se, se.b, cfg.xMin))), x2: x(cfg.xMax), y2: y(clamp(at(se, se.b, cfg.xMax))),
          "class": "fan-line", stroke: se.color
        }));
        svg.appendChild(s("circle", { cx: x(xv), cy: y(clamp(at(se, se.b, xv))), r: 5.5, fill: se.color }));
        svg.appendChild(s("line", { x1: L + 12, x2: L + 38, y1: T + 10 + 18 * i, y2: T + 10 + 18 * i, "class": "fan-line", stroke: se.color }));
        svg.appendChild(s("text", { x: L + 44, y: T + 14 + 18 * i }, se.name));
      });
      svg.appendChild(s("line", { x1: x(xv), x2: x(xv), y1: T, y2: y(cfg.yMin), "class": "marker" }));

      right.innerHTML = "";
      cfg.series.forEach(function (se) {
        var v = at(se, se.b, xv);
        var a = at(se, se.bLo, xv), b = at(se, se.bHi, xv);
        var st = h("div", { "class": "stat" });
        var val = h("span", { "class": "stat-value" }, (cfg.signed && v > 0 ? "+" : "") + num(v, 2));
        val.style.color = se.color;
        st.appendChild(val);
        st.appendChild(h("span", { "class": "stat-label" }, se.readLabel));
        st.appendChild(h("span", { "class": "stat-sub" }, cfg.rangeText(Math.min(a, b), Math.max(a, b), xv, se)));
        right.appendChild(st);
      });
      var verdict = cfg.verdict(xv);
      var bar = h("div", { "class": "kicker-bar" + (verdict.muted ? " muted" : "") });
      bar.appendChild(h("p", { "class": "kicker-main" }, verdict.main));
      bar.appendChild(h("p", { "class": "kicker-sub" }, verdict.sub));
      right.appendChild(bar);
      if (cfg.note) right.appendChild(h("p", { "class": "dollar-note" }, cfg.note));
    }
    input.addEventListener("input", render);
    render();
  }

  /* Guess first, then see the published number (Kim et al., 2017).
     cfg = { question, min, max, step, start, format(v), feedback(v) -> html,
             reveal: element shown veiled until the reader guesses, skips, or scrolls to it,
             goLabel, skipLabel, sliderLabel }
     The veiled element keeps its place in the layout, and it clears on its own
     once the reader scrolls to it, so no result depends on a click. */
  function guess(root, cfg) {
    var target = cfg.reveal || null;
    var done = false;
    var id = "guess-" + Math.random().toString(36).slice(2, 8);
    root.classList.add("guess");
    root.appendChild(h("p", { "class": "gq" }, cfg.question));
    var row = h("div", { "class": "slider-row" });
    var input = h("input", { type: "range", min: cfg.min, max: cfg.max, step: cfg.step || 1, value: cfg.start, id: id, "aria-label": cfg.sliderLabel || "Your guess" });
    var out = h("output", { "for": id });
    row.appendChild(input);
    row.appendChild(out);
    root.appendChild(row);
    var actions = h("div", { "class": "guess-actions" });
    var go = h("button", { type: "button", "class": "go" }, cfg.goLabel || "Lock in my guess");
    var skip = h("button", { type: "button", "class": "skip" }, cfg.skipLabel || "Just show me");
    actions.appendChild(go);
    actions.appendChild(skip);
    root.appendChild(actions);
    var fb = h("p", { "class": "feedback", "aria-live": "polite" });
    fb.hidden = true;
    root.appendChild(fb);

    function show() { out.textContent = cfg.format ? cfg.format(+input.value) : String(input.value); }
    function onScroll() {
      if (target && target.getBoundingClientRect().top < window.innerHeight * 0.25) reveal(false);
    }
    function reveal(withGuess) {
      if (done) return;
      done = true;
      if (target) target.classList.remove("veiled");
      window.removeEventListener("scroll", onScroll);
      actions.hidden = true;
      if (withGuess) {
        input.disabled = true;
        fb.innerHTML = cfg.feedback(+input.value);
        fb.hidden = false;
      }
    }
    input.addEventListener("input", show);
    go.addEventListener("click", function () { reveal(true); });
    skip.addEventListener("click", function () { reveal(false); });
    if (target) {
      target.classList.add("veiled");
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    show();
  }

  /* Copy-to-clipboard button. text may be a string or a function. */
  function copy(btn, text) {
    btn.addEventListener("click", function () {
      var t = typeof text === "function" ? text() : text;
      function ok() {
        var old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = old; }, 1600);
      }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = t;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); ok(); } catch (e) { /* leave the text selectable */ }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fallback);
      else fallback();
    });
  }

  window.Companion = { intervals: intervals, iconArray: iconArray, fan: fan, guess: guess, copy: copy, num: num };
})();
