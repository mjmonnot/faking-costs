#!/usr/bin/env python3
"""Forest plot of inverse-variance-weighted mean r by stakes group.

Cross-trait descriptive aggregation of Table S2 / table1_meta_by_stakes.csv rows.
Weight: w = N / (1 - r^2)^2  (inverse asymptotic variance of a correlation).
95% CI for the weighted mean: wmean ± 1.96 / sqrt(sum w).
Cross-verified against Alteryx Designer Cloud workflow companion_advanced_showcase.
"""
from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "python_verified_with_ci.csv"
OUT_PNG = ROOT / "assets" / "stakes-group-weighted-mean-forest.png"
OUT_SVG = ROOT / "assets" / "stakes-group-weighted-mean-forest.svg"

INK, GRAY, RED, BLUE, GOLD, BG = (
    "#1f2a36",
    "#5a6572",
    "#c0392b",
    "#2e6f9e",
    "#b98a2f",
    "#faf7f2",
)


def main() -> None:
    rows = list(csv.DictReader(DATA.open()))
    rows = sorted(rows, key=lambda r: int(r["OrdinalRanking"]), reverse=True)

    labels = [r["group"] for r in rows]
    means = [float(r["wmean_r"]) for r in rows]
    lo = [float(r["ci95_lo"]) for r in rows]
    hi = [float(r["ci95_hi"]) for r in rows]
    ranks = [int(r["OrdinalRanking"]) for r in rows]

    fig, ax = plt.subplots(figsize=(10.5, 5.2), dpi=160, facecolor=BG)
    ax.set_facecolor("#ffffff")
    y = list(range(len(rows)))
    colors = [
        RED if "High stakes" in lab else (GOLD if "Military" in lab else BLUE)
        for lab in labels
    ]

    for i, (m, l, h, c) in enumerate(zip(means, lo, hi, colors)):
        ax.plot([l, h], [i, i], color=c, lw=2.4, solid_capstyle="round", zorder=2)
        ax.plot([l, l], [i - 0.12, i + 0.12], color=c, lw=2.0, zorder=2)
        ax.plot([h, h], [i - 0.12, i + 0.12], color=c, lw=2.0, zorder=2)
        ax.scatter([m], [i], s=90, color=c, zorder=3, edgecolors="white", linewidths=1.2)

    ax.axvline(0, color="#cfc6b8", lw=1.2, zorder=1)
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=12, color=INK)
    ax.set_xlabel(
        "Inverse-variance-weighted mean observed r (Big Five × GMA)",
        fontsize=12,
        color=INK,
    )
    ax.set_xlim(-0.04, 0.035)
    ax.tick_params(axis="x", colors=GRAY, labelsize=11)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color("#e3dccf")
    ax.spines["bottom"].set_color("#e3dccf")

    for i, (m, rk) in enumerate(zip(means, ranks)):
        ax.text(
            0.033,
            i,
            f"  {m:+.3f}   rank {rk}",
            va="center",
            ha="left",
            fontsize=11,
            color=GRAY,
        )

    ax.set_title(
        "Cross-trait weighted mean r by assessment stakes",
        fontsize=15,
        color=INK,
        pad=12,
        loc="left",
        fontweight="bold",
    )
    ax.legend(
        handles=[
            mpatches.Patch(color=BLUE, label="Low-stakes contexts"),
            mpatches.Patch(color=GOLD, label="Military (mixed)"),
            mpatches.Patch(color=RED, label="High-stakes applicants"),
        ],
        loc="lower right",
        frameon=False,
        fontsize=10,
    )
    fig.tight_layout()
    fig.savefig(OUT_PNG, bbox_inches="tight", facecolor=BG)
    fig.savefig(OUT_SVG, bbox_inches="tight", facecolor=BG)
    print(f"wrote {OUT_PNG}")
    print(f"wrote {OUT_SVG}")


if __name__ == "__main__":
    main()
