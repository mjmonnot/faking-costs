#!/usr/bin/env python3
"""Forest plot of inverse-variance-weighted mean r by stakes group.

Cross-trait descriptive aggregation of Table S2 / table1_meta_by_stakes.csv rows.
Weight: w = N / (1 - r^2)^2  (inverse asymptotic variance of a correlation).
95% CI for the weighted mean: wmean ± 1.96 / sqrt(sum w).
Cross-verified against Alteryx Designer Cloud workflow companion_advanced_showcase.
"""
from __future__ import annotations

import csv
import html
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.lines import Line2D

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "python_verified_with_ci.csv"
OUT_PNG = ROOT / "assets" / "stakes-group-weighted-mean-forest.png"
OUT_SVG = ROOT / "assets" / "stakes-group-weighted-mean-forest.svg"
OUT_INLINE = ROOT / "assets" / "stakes-group-weighted-mean-forest-inline.svg"

INK, GRAY, RED, BLUE, GOLD, BG = (
    "#1f2a36",
    "#5a6572",
    "#c0392b",
    "#2e6f9e",
    "#b98a2f",
    "#faf7f2",
)
GOLD_TEXT = "#8a6420"

plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = [
    "Segoe UI",
    "Helvetica Neue",
    "Helvetica",
    "Arial",
    "DejaVu Sans",
]


def slug(group: str) -> str:
    return (
        group.lower()
        .replace(" ", "-")
        .replace("(", "")
        .replace(")", "")
    )


def marker_for(group: str) -> str:
    if "High stakes" in group:
        return "D"
    if "Military" in group:
        return "s"
    return "o"


def color_for(group: str) -> str:
    if "High stakes" in group:
        return RED
    if "Military" in group:
        return GOLD
    return BLUE


def main() -> None:
    rows = list(csv.DictReader(DATA.open()))
    # Manuscript rank order: rank 1 at top of forest → reverse for matplotlib bottom-up
    rows_plot = sorted(rows, key=lambda r: int(r["OrdinalRanking"]), reverse=True)

    labels = [r["group"] for r in rows_plot]
    means = [float(r["wmean_r"]) for r in rows_plot]
    lo = [float(r["ci95_lo"]) for r in rows_plot]
    hi = [float(r["ci95_hi"]) for r in rows_plot]
    ks = [int(float(r["k_rows"])) for r in rows_plot]

    fig, ax = plt.subplots(figsize=(9.2, 5.4), dpi=160, facecolor=BG)
    ax.set_facecolor("#ffffff")
    y = list(range(len(rows_plot)))

    for i, (lab, m, l, h, k) in enumerate(zip(labels, means, lo, hi, ks)):
        c = color_for(lab)
        mk = marker_for(lab)
        lw = 3.0 if "High stakes" in lab else 2.4
        ax.plot([l, h], [i, i], color=c, lw=lw, solid_capstyle="round", zorder=2)
        ax.plot([l, l], [i - 0.12, i + 0.12], color=c, lw=lw, zorder=2)
        ax.plot([h, h], [i - 0.12, i + 0.12], color=c, lw=lw, zorder=2)
        ax.scatter(
            [m],
            [i],
            s=110,
            color=c,
            marker=mk,
            zorder=3,
            edgecolors="white",
            linewidths=1.2,
        )
        ax.text(
            0.032,
            i,
            f"  {m:+.3f}   k={k}",
            va="center",
            ha="left",
            fontsize=12,
            color=GRAY,
        )

    ax.axvline(0, color="#cfc6b8", lw=1.2, zorder=1)
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=12, color=INK)
    ax.set_xlabel(
        "Inverse-variance-weighted mean observed r (Big Five × GMA)",
        fontsize=12,
        color=INK,
    )
    ax.set_xlim(-0.04, 0.055)
    ax.tick_params(axis="x", colors=GRAY, labelsize=12)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color("#e3dccf")
    ax.spines["bottom"].set_color("#e3dccf")

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
            Line2D(
                [0],
                [0],
                marker="o",
                color="w",
                markerfacecolor=BLUE,
                markersize=9,
                label="Low-stakes (circle)",
            ),
            Line2D(
                [0],
                [0],
                marker="s",
                color="w",
                markerfacecolor=GOLD,
                markersize=9,
                label="Military (square)",
            ),
            Line2D(
                [0],
                [0],
                marker="D",
                color="w",
                markerfacecolor=RED,
                markersize=9,
                label="High-stakes (diamond)",
            ),
        ],
        loc="lower right",
        frameon=False,
        fontsize=12,
    )
    fig.tight_layout()
    fig.savefig(OUT_PNG, bbox_inches="tight", facecolor=BG)
    fig.savefig(OUT_SVG, bbox_inches="tight", facecolor=BG)
    print(f"wrote {OUT_PNG}")
    print(f"wrote {OUT_SVG}")

    # Hand-authored interactive SVG for inlining (data-group sync with table)
    write_inline_svg(rows)
    print(f"wrote {OUT_INLINE}")
    write_mobile_inline_svg(rows)
    print(f"wrote {OUT_INLINE_MOBILE}")


def write_inline_svg(rows: list[dict]) -> None:
    """Desktop SVG with one <g data-group> per row; rank 1 at top."""
    rows = sorted(rows, key=lambda r: int(r["OrdinalRanking"]))  # top = rank 1
    W, H = 720, 340
    ml, mr, mt, mb = 210, 90, 36, 48
    plot_w = W - ml - mr
    plot_h = H - mt - mb
    n = len(rows)
    row_h = plot_h / n
    xmin, xmax = -0.04, 0.03

    def xmap(v: float) -> float:
        return ml + (v - xmin) / (xmax - xmin) * plot_w

    def ymap(i: int) -> float:
        return mt + (i + 0.5) * row_h

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'role="img" aria-labelledby="forest-title forest-desc" '
        f'class="forest-svg forest-svg-desktop" '
        f'width="100%" height="auto" focusable="false">',
        '<title id="forest-title">Cross-trait weighted mean r by assessment stakes</title>',
        '<desc id="forest-desc">Forest plot of inverse-variance-weighted mean Big Five '
        "by GMA correlations for six stakes groups. Horizontal bars are 95 percent "
        "confidence intervals. Low-stakes community ranks highest; high-stakes applicants "
        "rank lowest. Circles mark low-stakes, squares military, diamonds high-stakes.</desc>",
        f'<rect width="{W}" height="{H}" fill="{BG}"/>',
        f'<rect x="{ml}" y="{mt}" width="{plot_w}" height="{plot_h}" fill="#ffffff" stroke="#e3dccf"/>',
        f'<text x="{ml}" y="22" font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" '
        f'font-size="15" font-weight="700" fill="{INK}">Cross-trait weighted mean r by assessment stakes</text>',
        f'<line x1="{xmap(0):.2f}" y1="{mt}" x2="{xmap(0):.2f}" y2="{mt+plot_h}" '
        f'stroke="#cfc6b8" stroke-width="1.2"/>',
    ]

    for tick in (-0.03, -0.02, -0.01, 0.0, 0.01, 0.02):
        x = xmap(tick)
        parts.append(
            f'<line x1="{x:.2f}" y1="{mt+plot_h}" x2="{x:.2f}" y2="{mt+plot_h+5}" stroke="{GRAY}" stroke-width="1"/>'
        )
        parts.append(
            f'<text x="{x:.2f}" y="{mt+plot_h+20}" text-anchor="middle" '
            f'font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-size="12" fill="{GRAY}">{tick:+.2f}</text>'
        )
    parts.append(
        f'<text x="{ml + plot_w/2:.1f}" y="{H-8}" text-anchor="middle" '
        f'font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-size="12" fill="{INK}">'
        f"Inverse-variance-weighted mean observed r (Big Five × GMA)</text>"
    )

    for i, r in enumerate(rows):
        g = r["group"]
        sid = slug(g)
        m = float(r["wmean_r"])
        lo = float(r["ci95_lo"])
        hi = float(r["ci95_hi"])
        k = int(float(r["k_rows"]))
        c = color_for(g)
        y = ymap(i)
        x0, x1, xm = xmap(lo), xmap(hi), xmap(m)
        lw = 3.0 if "High stakes" in g else 2.4
        if "High stakes" in g:
            shape = (
                f'<polygon points="{xm:.2f},{y-7:.2f} {xm+7:.2f},{y:.2f} '
                f'{xm:.2f},{y+7:.2f} {xm-7:.2f},{y:.2f}" fill="{c}" stroke="#fff" stroke-width="1.2"/>'
            )
        elif "Military" in g:
            shape = (
                f'<rect x="{xm-6:.2f}" y="{y-6:.2f}" width="12" height="12" '
                f'fill="{c}" stroke="#fff" stroke-width="1.2"/>'
            )
        else:
            shape = (
                f'<circle cx="{xm:.2f}" cy="{y:.2f}" r="6.5" '
                f'fill="{c}" stroke="#fff" stroke-width="1.2"/>'
            )
        label = html.escape(g)
        parts.append(
            f'<g class="forest-row" data-group="{sid}" tabindex="-1">'
            f'<rect class="row-hit" x="0" y="{y - row_h/2:.2f}" width="{W}" height="{row_h:.2f}" '
            f'fill="transparent"/>'
            f'<text x="{ml-10}" y="{y+4:.2f}" text-anchor="end" '
            f'font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-size="12" fill="{INK}">{label}</text>'
            f'<line x1="{x0:.2f}" y1="{y:.2f}" x2="{x1:.2f}" y2="{y:.2f}" stroke="{c}" '
            f'stroke-width="{lw}" stroke-linecap="round"/>'
            f'<line x1="{x0:.2f}" y1="{y-5:.2f}" x2="{x0:.2f}" y2="{y+5:.2f}" stroke="{c}" stroke-width="{lw}"/>'
            f'<line x1="{x1:.2f}" y1="{y-5:.2f}" x2="{x1:.2f}" y2="{y+5:.2f}" stroke="{c}" stroke-width="{lw}"/>'
            f"{shape}"
            f'<text class="row-annot" x="{xmap(0.028):.2f}" y="{y+4:.2f}" '
            f'font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-size="12" fill="{GRAY}">'
            f"{m:+.3f} · k={k}</text>"
            f"</g>"
        )

    ly = mt + 8
    parts.append(
        f'<g class="legend" font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-size="12" fill="{GRAY}">'
        f'<circle cx="{ml+12}" cy="{ly}" r="5" fill="{BLUE}"/><text x="{ml+22}" y="{ly+3}">Low-stakes</text>'
        f'<rect x="{ml+100}" y="{ly-5}" width="10" height="10" fill="{GOLD}"/>'
        f'<text x="{ml+116}" y="{ly+3}">Military</text>'
        f'<polygon points="{ml+185},{ly-6} {ml+192},{ly} {ml+185},{ly+6} {ml+178},{ly}" fill="{RED}"/>'
        f'<text x="{ml+198}" y="{ly+3}">High-stakes</text>'
        f"</g>"
    )
    parts.append("</svg>")
    OUT_INLINE.write_text("\n".join(parts) + "\n")


OUT_INLINE_MOBILE = ROOT / "assets" / "stakes-group-weighted-mean-forest-inline-mobile.svg"


def write_mobile_inline_svg(rows: list[dict]) -> None:
    """Narrow SVG (~360 wide): label above each CI row; no H-scroll at 360 CSS px."""
    rows = sorted(rows, key=lambda r: int(r["OrdinalRanking"]))
    W = 360
    # Layout: title 36 + legend 28 + 6*(label 18 + bar 28 + gap 8) + axis 44
    row_block = 54  # label line + CI row
    mt = 64  # below title+legend
    mb = 52
    n = len(rows)
    H = mt + n * row_block + mb
    ml, mr = 16, 16
    plot_w = W - ml - mr
    xmin, xmax = -0.04, 0.03
    # font-size 14 so at ~310 CSS px display (360 viewport - padding) → ≥12 CSS px
    FS = 14
    FS_TITLE = 14
    FS_AXIS = 14

    def xmap(v: float) -> float:
        return ml + (v - xmin) / (xmax - xmin) * plot_w

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'role="img" aria-labelledby="forest-title-m forest-desc-m" '
        f'class="forest-svg forest-svg-mobile" '
        f'width="100%" height="auto" focusable="false">',
        '<title id="forest-title-m">Cross-trait weighted mean r by assessment stakes</title>',
        '<desc id="forest-desc-m">Forest plot of inverse-variance-weighted mean Big Five '
        "by GMA correlations for six stakes groups. Each study label sits above its "
        "confidence interval. Circles mark low-stakes, squares military, diamonds high-stakes.</desc>",
        f'<rect width="{W}" height="{H}" fill="{BG}"/>',
        f'<text x="{ml}" y="20" font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" '
        f'font-size="{FS_TITLE}" font-weight="700" fill="{INK}">Cross-trait weighted mean r</text>',
        f'<text x="{ml}" y="38" font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" '
        f'font-size="{FS_TITLE}" font-weight="700" fill="{INK}">by assessment stakes</text>',
        # legend
        f'<g class="legend" font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-size="{FS}" fill="{GRAY}">'
        f'<circle cx="{ml+6}" cy="54" r="5" fill="{BLUE}"/><text x="{ml+16}" y="58">Low-stakes</text>'
        f'<rect x="118" y="49" width="10" height="10" fill="{GOLD}"/>'
        f'<text x="134" y="58">Military</text>'
        f'<polygon points="214,48 221,54 214,60 207,54" fill="{RED}"/>'
        f'<text x="227" y="58">High-stakes</text>'
        f"</g>",
    ]

    plot_top = mt
    plot_bot = mt + n * row_block - 8
    # white plot backdrop spanning CI band area
    parts.append(
        f'<rect x="{ml}" y="{plot_top}" width="{plot_w}" height="{plot_bot - plot_top}" '
        f'fill="#ffffff" stroke="#e3dccf"/>'
    )
    parts.append(
        f'<line x1="{xmap(0):.2f}" y1="{plot_top}" x2="{xmap(0):.2f}" y2="{plot_bot}" '
        f'stroke="#cfc6b8" stroke-width="1.2"/>'
    )

    for i, r in enumerate(rows):
        g = r["group"]
        sid = slug(g)
        m = float(r["wmean_r"])
        lo = float(r["ci95_lo"])
        hi = float(r["ci95_hi"])
        k = int(float(r["k_rows"]))
        c = color_for(g)
        block_y = mt + i * row_block
        label_y = block_y + 16
        bar_y = block_y + 34
        x0, x1, xm = xmap(lo), xmap(hi), xmap(m)
        lw = 3.0 if "High stakes" in g else 2.4
        if "High stakes" in g:
            shape = (
                f'<polygon points="{xm:.2f},{bar_y-7:.2f} {xm+7:.2f},{bar_y:.2f} '
                f'{xm:.2f},{bar_y+7:.2f} {xm-7:.2f},{bar_y:.2f}" fill="{c}" stroke="#fff" stroke-width="1.2"/>'
            )
        elif "Military" in g:
            shape = (
                f'<rect x="{xm-6:.2f}" y="{bar_y-6:.2f}" width="12" height="12" '
                f'fill="{c}" stroke="#fff" stroke-width="1.2"/>'
            )
        else:
            shape = (
                f'<circle cx="{xm:.2f}" cy="{bar_y:.2f}" r="6.5" '
                f'fill="{c}" stroke="#fff" stroke-width="1.2"/>'
            )
        label = html.escape(g)
        parts.append(
            f'<g class="forest-row" data-group="{sid}" tabindex="-1">'
            f'<rect class="row-hit" x="0" y="{block_y:.2f}" width="{W}" height="{row_block:.2f}" '
            f'fill="transparent"/>'
            f'<text x="{ml}" y="{label_y:.2f}" text-anchor="start" '
            f'font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-size="{FS}" fill="{INK}">{label}</text>'
            f'<text class="row-annot" x="{W - mr}" y="{label_y:.2f}" text-anchor="end" '
            f'font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-size="{FS}" fill="{GRAY}">'
            f"{m:+.3f} · k={k}</text>"
            f'<line x1="{x0:.2f}" y1="{bar_y:.2f}" x2="{x1:.2f}" y2="{bar_y:.2f}" stroke="{c}" '
            f'stroke-width="{lw}" stroke-linecap="round"/>'
            f'<line x1="{x0:.2f}" y1="{bar_y-5:.2f}" x2="{x0:.2f}" y2="{bar_y+5:.2f}" stroke="{c}" stroke-width="{lw}"/>'
            f'<line x1="{x1:.2f}" y1="{bar_y-5:.2f}" x2="{x1:.2f}" y2="{bar_y+5:.2f}" stroke="{c}" stroke-width="{lw}"/>'
            f"{shape}"
            f"</g>"
        )

    # x ticks
    for tick in (-0.03, -0.02, -0.01, 0.0, 0.01, 0.02):
        x = xmap(tick)
        parts.append(
            f'<line x1="{x:.2f}" y1="{plot_bot}" x2="{x:.2f}" y2="{plot_bot+5}" stroke="{GRAY}" stroke-width="1"/>'
        )
        parts.append(
            f'<text x="{x:.2f}" y="{plot_bot+20}" text-anchor="middle" '
            f'font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-size="{FS}" fill="{GRAY}">{tick:+.2f}</text>'
        )
    parts.append(
        f'<text x="{W/2:.1f}" y="{H-10}" text-anchor="middle" '
        f'font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" font-size="{FS_AXIS}" fill="{INK}">'
        f"Weighted mean observed r (Big Five × GMA)</text>"
    )
    parts.append("</svg>")
    OUT_INLINE_MOBILE.write_text("\n".join(parts) + "\n")


if __name__ == "__main__":
    main()
