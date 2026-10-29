(function () {
  "use strict";

  var table = document.getElementById("stakes-rank-table");
  if (!table) return;
  var tbody = table.querySelector("tbody");
  var detail = document.getElementById("row-detail");
  var forest = document.querySelector(".forest-svg");
  var headers = table.querySelectorAll("th.sortable");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rows() {
    return Array.prototype.slice.call(tbody.querySelectorAll("tr"));
  }

  function forestRows() {
    return forest ? Array.prototype.slice.call(forest.querySelectorAll(".forest-row")) : [];
  }

  function clearActive() {
    rows().forEach(function (tr) {
      tr.classList.remove("is-active");
    });
    forestRows().forEach(function (g) {
      g.classList.remove("is-active", "is-dim");
    });
  }

  function setActive(group) {
    if (!group) {
      clearActive();
      return;
    }
    rows().forEach(function (tr) {
      tr.classList.toggle("is-active", tr.getAttribute("data-group") === group);
    });
    var fr = forestRows();
    if (!fr.length) return;
    fr.forEach(function (g) {
      var match = g.getAttribute("data-group") === group;
      g.classList.toggle("is-active", match);
      g.classList.toggle("is-dim", !match);
    });
  }

  function showDetail(tr) {
    if (!detail) return;
    var g = tr.getAttribute("data-group");
    var label = tr.querySelector('[data-col="group"]').textContent;
    detail.hidden = false;
    detail.classList.add("is-open");
    detail.innerHTML =
      "<dl>" +
      "<dt>Group</dt><dd>" +
      label +
      "</dd>" +
      "<dt>k</dt><dd>" +
      tr.getAttribute("data-k") +
      "</dd>" +
      "<dt>se</dt><dd>" +
      tr.getAttribute("data-se") +
      "</dd>" +
      "<dt>Σw</dt><dd>" +
      tr.getAttribute("data-sum-w") +
      "</dd>" +
      "<dt>rank</dt><dd>" +
      tr.getAttribute("data-rank") +
      "</dd>" +
      "</dl>";
    detail.setAttribute("data-group", g);
  }

  function hideDetail() {
    if (!detail) return;
    detail.hidden = true;
    detail.classList.remove("is-open");
    detail.innerHTML = "";
  }

  function sortBy(key, dir) {
    var list = rows();
    list.sort(function (a, b) {
      var av, bv;
      if (key === "group") {
        av = a.querySelector('[data-col="group"]').textContent;
        bv = b.querySelector('[data-col="group"]').textContent;
        return dir * av.localeCompare(bv);
      }
      if (key === "rank" || key === "k") {
        av = parseFloat(a.getAttribute("data-" + (key === "rank" ? "rank" : "k")));
        bv = parseFloat(b.getAttribute("data-" + (key === "rank" ? "rank" : "k")));
      } else if (key === "r") {
        av = parseFloat(a.getAttribute("data-r"));
        bv = parseFloat(b.getAttribute("data-r"));
      } else if (key === "rho") {
        av = parseFloat(a.getAttribute("data-rho"));
        bv = parseFloat(b.getAttribute("data-rho"));
      } else {
        return 0;
      }
      return dir * (av - bv);
    });
    list.forEach(function (tr) {
      tbody.appendChild(tr);
    });
  }

  function updateAriaSort(activeKey, dir) {
    headers.forEach(function (th) {
      var key = th.getAttribute("data-sort");
      var ind = th.querySelector(".sort-ind");
      if (key === activeKey) {
        th.setAttribute("aria-sort", dir > 0 ? "ascending" : "descending");
        if (ind) ind.textContent = dir > 0 ? "▲" : "▼";
      } else {
        th.setAttribute("aria-sort", "none");
        if (ind) ind.textContent = "";
      }
    });
  }

  var currentKey = "rank";
  var currentDir = 1; // ascending = rank 1 first

  function activateSort(key) {
    if (key === currentKey) {
      currentDir = -currentDir;
    } else {
      currentKey = key;
      currentDir = key === "rank" ? 1 : -1; // numeric means: higher first except rank
      if (key === "k") currentDir = 1;
    }
    sortBy(currentKey, currentDir);
    updateAriaSort(currentKey, currentDir);
  }

  headers.forEach(function (th) {
    th.addEventListener("click", function () {
      activateSort(th.getAttribute("data-sort"));
    });
    th.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activateSort(th.getAttribute("data-sort"));
      }
    });
  });

  rows().forEach(function (tr) {
    tr.addEventListener("mouseenter", function () {
      setActive(tr.getAttribute("data-group"));
    });
    tr.addEventListener("mouseleave", function () {
      if (document.activeElement !== tr) clearActive();
    });
    tr.addEventListener("focus", function () {
      setActive(tr.getAttribute("data-group"));
    });
    tr.addEventListener("blur", function () {
      clearActive();
    });
    tr.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (detail && detail.getAttribute("data-group") === tr.getAttribute("data-group") && !detail.hidden) {
          hideDetail();
        } else {
          showDetail(tr);
        }
      }
      if (e.key === "Escape") hideDetail();
    });
    tr.addEventListener("click", function () {
      setActive(tr.getAttribute("data-group"));
      showDetail(tr);
    });
  });

  forestRows().forEach(function (g) {
    g.addEventListener("mouseenter", function () {
      setActive(g.getAttribute("data-group"));
    });
    g.addEventListener("mouseleave", function () {
      clearActive();
    });
    g.addEventListener("click", function () {
      var group = g.getAttribute("data-group");
      var tr = tbody.querySelector('tr[data-group="' + group + '"]');
      if (tr) {
        tr.focus();
        showDetail(tr);
      }
    });
  });

  if (reduceMotion) {
    // no-op: CSS already disables transitions
  }
})();
