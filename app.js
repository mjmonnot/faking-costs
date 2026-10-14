(function () {
  "use strict";

  var GRID = null;
  var SDY_FRACTION = 0.4; // SD of job performance in dollars = 40% of salary (Schmidt & Hunter, 1983)

  var els = {
    prev: document.getElementById("prev"),
    prevOut: document.getElementById("prev-out"),
    sr: document.getElementById("sr"),
    srOut: document.getElementById("sr-out"),
    hires: document.getElementById("hires"),
    salary: document.getElementById("salary"),
    outChanged: document.getElementById("out-changed"),
    outChangedN: document.getElementById("out-changed-n"),
    outPerf: document.getElementById("out-perf"),
    outDollars: document.getElementById("out-dollars"),
    outSwap: document.getElementById("out-swap"),
    outSwapN: document.getElementById("out-swap-n"),
    outAI: document.getElementById("out-ai"),
  };

  function ctx() {
    return document.querySelector('input[name="ctx"]:checked').value;
  }

  function dollars(x) {
    if (x >= 1e6) return "$" + (x / 1e6).toFixed(1) + "M";
    // 3 significant figures: these are illustrative, not accounting numbers
    var mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, x))) - 2));
    return "$" + (Math.round(x / mag) * mag).toLocaleString("en-US");
  }

  function update() {
    if (!GRID) return;
    var pf = (parseInt(els.prev.value, 10) / 100).toFixed(2);
    var sr = (parseInt(els.sr.value, 10) / 100).toFixed(2);
    var hires = Math.max(1, parseInt(els.hires.value, 10) || 1);
    var salary = Math.max(0, parseInt(els.salary.value, 10) || 0);
    var cell = GRID[ctx()][pf][sr];

    els.prevOut.textContent = els.prev.value + "%";
    els.srOut.textContent = els.sr.value + "%";

    // hires changed
    var nChanged = Math.round((cell.hires_changed / 100) * hires);
    els.outChanged.textContent = cell.hires_changed.toFixed(0) + "%";
    els.outChangedN.textContent =
      "\u2248 " + nChanged.toLocaleString("en-US") +
      " of your " + hires.toLocaleString("en-US") + " hires each year";

    // performance loss + aggregate dollars
    var sdy = SDY_FRACTION * salary;
    var annual = cell.perf_gap_sd * sdy * hires;
    els.outPerf.textContent = cell.perf_loss.toFixed(0) + "%";
    els.outDollars.textContent =
      "\u2248 " + dollars(annual) + " per year in illustrative lost performance value " +
      "across all " + hires.toLocaleString("en-US") + " hires";

    // per swapped hire
    var perSwap = cell.swap_gap_sd * sdy;
    els.outSwap.textContent = cell.swap_gap_sd.toFixed(2) + " SD";
    els.outSwapN.textContent =
      "\u2248 " + dollars(perSwap) + " per swapped hire per year";

    // AI ratio
    els.outAI.textContent =
      "Adverse-impact ratio: " + cell.ai_honest.toFixed(2) + " under honest responding, " +
      cell.ai_faked.toFixed(2) + " under faking. The statistic never moves in a direction " +
      "that flags the problem \u2014 the damage hides in who gets the job.";
  }

  fetch("grid.json")
    .then(function (r) { return r.json(); })
    .then(function (j) { GRID = j.grid; update(); });

  ["input", "change"].forEach(function (evt) {
    document.querySelectorAll("input").forEach(function (el) {
      el.addEventListener(evt, update);
    });
  });
})();
