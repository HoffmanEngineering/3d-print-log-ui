---
slug: analytics
title: Analytics & Statistics | 3D Print Log Docs
description: Understand your printing with 3D Print Log analytics — totals, filament usage, print time, cost, and trends across all your prints and printers.
navLabel: Analytics
group: features
order: 50
mode: reference
updated: 2026-08-29
related: [prints]
---

## Analytics

---

Open [Analytics](/analytics) to see what you have printed, how long it took,
what it used, and roughly what it cost. The page is organized into six tabs that
all share one filter bar at the top.

---

### The six tabs

**Overview** is the summary: how many prints you made, how many succeeded, how
much filament and time they used, and a chart of prints over time.

**Activity** is about your printing habits — a calendar of active days, your
current and longest streaks, how long your prints usually take, and which days
and hours you tend to start them.

**Printers** compares your machines side by side: prints, success rate, hours
run, filament used, how busy each one was, and what you have spent maintaining
it.

**Materials** breaks your filament use down by type, brand and color, shows
which spools you are getting through fastest, and estimates how long each one
will last.

**Costs** splits your spending into filament, electricity and maintenance, shows
how much a typical print costs, and how much went on prints that did not work
out.

**Accuracy** compares what your slicer estimated against what actually happened,
so you can see whether a particular printer or material consistently runs long
or short.

---

### The filter bar

Everything on the page responds to the filter bar. Pick one of the date presets
or set a **custom range**, and narrow the results to particular printers,
materials, projects or print statuses. Turn on **compare to previous period** to
see how each figure moved against the period immediately before the one you are
looking at.

Your filters and the tab you are on are stored in the page address, so you can
bookmark a view or send someone the link and they will see the same selection.

---

### Recorded values versus estimates

Every figure prefers what you actually recorded. If a print has a recorded print
time or filament amount, that is what gets used; if it does not, the slicer's
estimate is used instead, and the chart tells you that estimates were involved.

A **0** in a duration or an amount means _not recorded_, not "zero". 3D Print
Log leaves those prints out of the figures that need a real measurement rather
than pretending they took no time and used no plastic.

---

### Prints without a date

A print with no start date cannot be placed on a timeline, so it is left out of
anything with a date on it — the charts over time, the calendar, streaks and the
day and hour breakdown. It still counts towards your all-time totals, and the
page tells you how many prints are in that situation.

---

### How success rate is worked out

Success rate is the share of finished prints that succeeded. Prints still marked
**Pending** or **Printing** are left out of both the top and bottom of that sum,
so the number does not drift around as prints finish. If nothing in the range
has finished yet, the success rate is shown as unknown rather than as 0%.

---

### What counts as waste

**Waste** is the filament and money spent on prints you marked **Failed** or
**Cancelled**. Prints marked **Partial Success** are not counted as waste — you
got something usable out of them, even if it was not perfect. If you want to
look at partial successes on their own, filter by that status.

---

### How costs are valued

Costs are estimates calculated at **today's prices**. Changing a spool's
purchase price, your electricity rate, or a printer's wattage changes what past
prints appear to have cost, because 3D Print Log does not store a price snapshot
with each print.

Only spools priced in the same currency as your display currency are added up. A
spool priced in another currency is left out and counted separately — 3D Print
Log does not convert between currencies, because an exchange rate from an
unknown date would be a guess dressed up as a number.

---

### What to fill in so costs work

If the Costs tab is mostly empty, it is usually because one of these is missing.
The tab links you straight to whichever one it needs.

On each spool, set the **purchase price** and the **initial weight** — the price
alone is not enough, because the cost of a print depends on how much of the
spool it used. On each printer, set the **wattage**. In [Settings](/settings),
set your **electricity rate**, and optionally a **default filament price** that
is used for spools where you never entered one.

---

### Utilization

Utilization is the share of the selected period that a printer was actually
printing. Overlapping prints on the same machine are counted once, so the figure
can never go above 100% — if two prints on one printer overlap, the overlap is
time that machine spent printing, not double the time.

---

### Estimate accuracy

Accuracy compares the actual value against the estimate for the same print. A
result of 1.0 means the estimate was spot on, above 1.0 means it took longer or
used more than predicted, and below 1.0 means it took less.

The figure shown is the **middle** result rather than the average. One print
that ran ten times over — usually because a printer sat paused overnight — would
drag an average badly, while the middle value keeps describing your typical
print. Results that are wildly out are treated as data-entry mistakes and
dropped, and any printer or material with fewer than five prints shows **not
enough data yet** instead of a number that would just be noise.

---

### Burn rate and runway

**Burn rate** is how many grams a day you have been using from a spool over the
last 90 days, and **runway** is roughly how long what is left will last at that
rate. If a spool has not been used recently, or its remaining weight is unknown,
no runway is shown. The estimate is never projected more than a year ahead.

---

### Exporting a chart

Every chart has a download button in its top corner. Choose **Download CSV** for
the numbers behind the chart as a spreadsheet file, or **Download PNG** for a
picture of the chart itself. Both are free and are generated in your browser, so
nothing is sent anywhere.
