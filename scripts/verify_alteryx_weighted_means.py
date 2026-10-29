#!/usr/bin/env python3
"""Recompute inverse-variance-weighted means from table1_meta_by_stakes.csv.

Weight: w = N / (1 - r^2)^2
wmean_r   = sum(w * mean_r) / sum(w)          within each stakes group (across Big Five)
wmean_rho = sum(w * rho_corrected) / sum(w)
95% CI for wmean_r: wmean ± 1.96 / sqrt(sum w)
  (valid because Var(r) ≈ (1-r^2)^2 / N, so w is the inverse-variance weight)

Compares against data/alteryx_showcase_output.csv from Designer Cloud job 4995193
(workflow companion_advanced_showcase).
"""
from __future__ import annotations

import csv
import math
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "table1_meta_by_stakes.csv"
AX = ROOT / "data" / "alteryx_showcase_output.csv"
OUT = ROOT / "data" / "python_verified_with_ci.csv"


def main() -> int:
    rows = list(csv.DictReader(SRC.open()))
    by: dict[str, list[tuple[float, float, float]]] = defaultdict(list)
    for r in rows:
        N = float(r["N"])
        mean_r = float(r["mean_r"])
        rho = float(r["rho_corrected"])
        w = N / (1.0 - mean_r**2) ** 2
        by[r["group"]].append((w, mean_r, rho))

    out = []
    for group, items in by.items():
        sw = sum(w for w, _, _ in items)
        wr = sum(w * r for w, r, _ in items) / sw
        wrho = sum(w * rho for w, _, rho in items) / sw
        se = 1.0 / math.sqrt(sw)
        out.append(
            {
                "group": group,
                "wmean_r": wr,
                "wmean_rho_corrected": wrho,
                "se": se,
                "ci95_lo": wr - 1.96 * se,
                "ci95_hi": wr + 1.96 * se,
                "sum_w": sw,
                "k_rows": len(items),
            }
        )
    out.sort(key=lambda d: -d["wmean_r"])
    for i, d in enumerate(out, 1):
        d["OrdinalRanking"] = i

    with OUT.open("w", newline="") as f:
        fields = [
            "group",
            "wmean_r",
            "wmean_rho_corrected",
            "se",
            "ci95_lo",
            "ci95_hi",
            "OrdinalRanking",
            "sum_w",
            "k_rows",
        ]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for d in out:
            w.writerow(d)

    ax = list(csv.DictReader(AX.open()))
    ok = True
    for a in ax:
        m = next(d for d in out if d["group"] == a["group"])
        dr = abs(m["wmean_r"] - float(a["wmean_r"]))
        drho = abs(m["wmean_rho_corrected"] - float(a["wmean_rho_corrected"]))
        rank_ok = str(m["OrdinalRanking"]) == a["OrdinalRanking"].strip()
        if dr > 1e-12 or drho > 1e-12 or not rank_ok:
            print("MISMATCH", a["group"], dr, drho, m["OrdinalRanking"], a["OrdinalRanking"])
            ok = False
        else:
            print("OK", a["group"], f"r={m['wmean_r']:+.6f}", f"rank={m['OrdinalRanking']}")
    print("wrote", OUT)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
