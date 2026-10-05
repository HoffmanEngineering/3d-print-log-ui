---
slug: achievements
title: Achievements | 3D Print Log Docs
description: How achievements work in 3D Print Log - the badge categories, streak rules, hidden badges, privacy, and celebration settings.
navLabel: Achievements
group: features
order: 60
mode: explanation
updated: 2026-10-04
related: [prints, printers, slic3r-uploader, cura-plugin]
---

## Achievements {#achievements}

---

Achievements are badges you earn by using 3D Print Log: logging prints, adding printers and
materials, connecting your slicer, and keeping a printing streak going. Your collection lives at
[Achievements](/achievements), and the next badge within reach shows up above your
[Prints](/prints) list.

Badges are never taken away. If you delete prints after earning a badge, you keep it, and its
progress never drops below the tier you earned.

### Categories {#categories}

- **Getting started**: one-time badges for your first printer, first spool, first print, first
  slicer upload, first photo, and a complete profile.
- **Milestones**: tiered badges for prints logged, hours printed, material used, your longest
  print, printers and spools owned, material types, multi-material prints, and projects.
- **Streaks**: printing several days in a row, every week, or many prints in one day.
- **Integrations**: logging prints from Cura, PrusaSlicer, OrcaSlicer, Bambu Studio, Anycubic
  Slicer Next, OctoPrint, Klipper (Moonraker), or your AI assistant.
- **Community and care**: sharing prints publicly, getting comments from other makers, and
  logging printer maintenance.
- **Hidden**: a few surprises. They show as "???" until you earn them.

### Tiers {#tiers}

Tiered badges climb through filament finishes: Bronze PLA, Silver PLA, Gold Silk, Rainbow Silk,
Carbon Fiber, and Glow-in-the-Dark. Each badge shows your progress toward its next tier.

### Streak rules {#streaks}

Streaks count the days (or weeks) you **started** a print, in your own time zone. 3D Print Log
saves your time zone automatically from your browser.

Streaks and the date-based hidden badges wait until your time zone is known, so a late-evening
print is never counted as the next day. If you only log prints through OctoPrint, Klipper or an
API key, open 3D Print Log in your browser once and those badges catch up.

- A print counts toward a streak only if you log it within **48 hours** of starting it.
  Back-filling old prints still counts toward your totals, but not toward streaks or the
  date-based hidden badges.
- **Daily streaks** need at least one print on consecutive days. A streak stays alive until the
  end of the day after your last print.
- **Weekly streaks** need at least one print in consecutive weeks (Monday to Sunday).

### Slicer badges {#slicer-badges}

Slicer badges are earned when a print is created from a slicer upload, through the
[Cura plugin](/docs/cura-plugin) or the [Slicer Uploader](/docs/slic3r-uploader). Entering a
print by hand doesn't count.

### Privacy {#privacy}

Your earned badges appear on your public profile, following your profile's visibility. Turn
**Show my achievements on my profile** off in [Settings](/settings) to hide them. Your progress
toward unearned badges is never shown to anyone else.

### Celebrations {#celebrations}

When you earn a badge, 3D Print Log celebrates it. In [Settings](/settings) you can choose:

- **Full**: a celebration for big moments, like your first print or a Gold Silk tier, and a small
  card for everything else.
- **Quiet**: a small card only.
- **Off**: nothing plays, and new badges wait in your collection and your notifications.

If you have more than one tab open, only one of them celebrates. In the Android app you can also
choose whether earning a badge sends a push notification.
