---
slug: release-notes
title: Release Notes | 3D Print Log Docs
description: 'What''s new in 3D Print Log — the latest features, improvements, and fixes shipped to the app, listed by release.'
navLabel: Release Notes
group: about
order: 10
mode: reference
updated: 2026-08-29
related: [about]
---

## Release Notes

---

### 1.49.1 - Push Notification Fixes {#v1.49.1}

Follow-up fixes to the push notifications that shipped in 1.49.0. Tapping a
notification now opens the print it is about, instead of just opening the app to
whatever page you were last on. Turning notifications on from
[Settings](/settings) works on the first tap (it previously took two, even though
the first one had already been granted). Notification timestamps are also correct
now: the notification tray no longer shows a print as finishing years ago, and
times in the app are no longer shifted by your time zone.

#### Full List of Changes:

- **Tapping a notification opens the print** - a tapped print notification now navigates to that print, whether the app was closed or already open, and still does so when the device is offline (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/154" rel="noreferrer noopener" target="_blank" >PR #154</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-app/pull/14" rel="noreferrer noopener" target="_blank" >Android app PR #14</a >)
- **Enabling notifications works on the first tap** - Settings no longer reports notifications as off after you have just allowed them (<a href="https://github.com/HoffmanEngineering/3d-print-log-app/pull/14" rel="noreferrer noopener" target="_blank" >Android app PR #14</a >)
- **Notifications are offered while a print is running** - opening one of your own in-progress prints now offers to enable notifications, rather than leaving Settings as the only way to find the option (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/154" rel="noreferrer noopener" target="_blank" >PR #154</a >)
- **Notification timestamps are correct** - the notification tray no longer shows a just-finished print as years old, and notification times in the app are no longer offset by your time zone (<a href="https://github.com/HoffmanEngineering/3d-print-log-api/pull/108" rel="noreferrer noopener" target="_blank" >API PR #108</a >)

### 1.49.0 - Push Notifications {#v1.49.0}

**Push notifications** have arrived. If you send print events to 3D Print Log
from OctoPrint or Klipper, your phone can now tell you the moment a print
finishes or fails, so you no longer have to keep opening the app to check on a
long job. A new Push notifications section in [Settings](/settings) lets you turn
each notification on or off, and the app asks for permission in context (when
notifications would actually be useful) rather than on the very first launch. The
updated Android app that receives these notifications is rolling out to users
soon.

Printing QR labels got a lot less fiddly. Paper size, label size, columns, and
rows used to be four unrelated choices, and picking a combination that did not
fit produced an overflowing preview and a wasted sheet. Columns and rows are now
worked out from the paper and label size for you, the manual controls moved
behind an Advanced layout toggle, and whatever layout you pick is remembered the
next time you open the dialog.

Documentation pages now end with a **Was this page helpful?** prompt. A thumbs
down opens a box to say what you were actually looking for, which goes straight
into deciding what gets written and rewritten next.

#### Full List of Changes:

- **Push notifications for finished and failed prints** - Print completed and print failed events from your OctoPrint or Klipper webhooks can now be delivered to your phone as push notifications. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/149" rel="noreferrer noopener" target="_blank" >PR #149</a >)
- **Push notification settings** - A Push notifications section in Settings turns Print completed and Print failed on or off individually, and offers an Enable notifications button when the device permission has not been granted yet. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/149" rel="noreferrer noopener" target="_blank" >PR #149</a >)
- **Permission asked in context** - The app explains why notifications are useful and asks for the device permission at a relevant moment instead of at launch, so a hasty "no" does not permanently switch them off. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/149" rel="noreferrer noopener" target="_blank" >PR #149</a >)
- **QR label sheets fit automatically** - Columns and rows are derived from the paper and label size, so the preview and the printed sheet always match. Manual control is still available behind an Advanced layout toggle, clamped to what actually fits. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/135" rel="noreferrer noopener" target="_blank" >PR #135</a >)
- **QR label layout is remembered** - Your paper size, label size, and layout choices carry over to the next time you open the label dialog. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/135" rel="noreferrer noopener" target="_blank" >PR #135</a >)
- **More reliable label printing** - A blocked popup now shows a readable warning instead of a browser alert, and the print window stays open until printing finishes rather than closing early and cancelling the job in some browsers. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/135" rel="noreferrer noopener" target="_blank" >PR #135</a >)
- **Page feedback on documentation** - Every docs page now ends with a "Was this page helpful?" prompt, with a box to explain what you were looking for when a page falls short. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/148" rel="noreferrer noopener" target="_blank" >PR #148</a >)
- **Privacy policy updated** - The [privacy policy](/docs/privacy-policy) now describes the analytics that were already in use, and covers the free text you can send through the new page feedback prompt. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/148" rel="noreferrer noopener" target="_blank" >PR #148</a >)
- **Fixed remaining amounts after a QR scan** - Picking a material by scanning its QR code showed 0g / 0m / 0ml remaining on the print, while picking the same spool from the list showed the real numbers. Both paths now report the same values. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/134" rel="noreferrer noopener" target="_blank" >PR #134</a >)
- **Project housekeeping** - Website and build dependencies were updated, bringing security fixes and performance improvements. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/108" rel="noreferrer noopener" target="_blank" >PR #108</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/111" rel="noreferrer noopener" target="_blank" >PR #111</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/112" rel="noreferrer noopener" target="_blank" >PR #112</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/113" rel="noreferrer noopener" target="_blank" >PR #113</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/114" rel="noreferrer noopener" target="_blank" >PR #114</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/115" rel="noreferrer noopener" target="_blank" >PR #115</a >)

### 1.48.1 - Camera Photos on Mobile {#v1.48.1}

A fix for the mobile app. Adding a photo to a material only ever opened the
gallery, with no way to take a new picture. Both **Add Photo** and the **+**
tile on the photo carousel now offer the camera, matching the Upload Picture
button on a print. The **+** tile on a print's photo carousel offers the camera
now too.

#### Full List of Changes:

- **Take a photo from the camera** - In the mobile app, the material Add Photo button and the + tile on both the material and print photo carousels can now open the camera instead of only the gallery. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/133" rel="noreferrer noopener" target="_blank" >PR #133</a >)

### 1.48.0 - Spool Photos {#v1.48.0}

Materials can now have photos. The new Photos panel lets you add pictures of the
actual spool, reorder them, and star one as the default. That default photo then
shows as a thumbnail beside the material everywhere it is listed, in the table
and in the mobile cards, so you can spot the right roll in a long list without
reading every name.

The rest of the release is fixes. Slicer files that are missing or have invalid
filament measurements no longer record a confident estimate of 0mg; the amount
is simply left empty for you to fill in. The navigation bar has been tidied up
on phones: the links sit to the left, the toolbar keeps a fixed height instead
of growing, the brand no longer shrinks, the Pro button stays in the toolbar,
and "About" no longer appears twice.

#### Full List of Changes:

- **Spool photos** - A Photos panel on the material detail page lets you add, reorder, delete, and set a default picture of the spool. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/126" rel="noreferrer noopener" target="_blank" >PR #126</a >)
- **Photo thumbnails in the material list** - The default photo shows beside each material in both the table and the mobile cards. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/126" rel="noreferrer noopener" target="_blank" >PR #126</a >)
- **No more 0mg filament estimates** - When a sliced file is missing filament diameter or length, or reports an invalid value, the usage estimate is left empty instead of recorded as zero. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/122" rel="noreferrer noopener" target="_blank" >PR #122</a >)
- **Mobile navigation bar layout** - Links are left-justified, the toolbar has a fixed height, the brand no longer shrinks, and the Pro button stays in the toolbar. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/129" rel="noreferrer noopener" target="_blank" >PR #129</a >)
- **Duplicate "About" link** - "About" no longer renders twice in the mobile menu. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/123" rel="noreferrer noopener" target="_blank" >PR #123</a >)
- **Release notes on GitHub** - Each release published on GitHub is now generated from this page, so the notes there match the ones here. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/106" rel="noreferrer noopener" target="_blank" >PR #106</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/118" rel="noreferrer noopener" target="_blank" >PR #118</a >)
- **Project housekeeping** - Dependency updates are now automated, build workflow permissions were tightened, and the README points at GitHub Discussions for questions and ideas. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/107" rel="noreferrer noopener" target="_blank" >PR #107</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/119" rel="noreferrer noopener" target="_blank" >PR #119</a >)

### 1.47.0 - Material Remaining &amp; More Bulk Actions {#v1.47.0}

Saved materials now tell you what is left on the spool. Opening a material shows
a Remaining card beside the form with a bar, the reading in your preferred unit
(975 g of 1,000 g left), and the remaining length, volume, total used and the
number of prints it has been through. Below it, a "Prints using this material"
panel lists the ten most recent prints that consumed it, each with the amount it
used, and links into the filtered print list when there are more. Edit an
adjustment or the nominal weight and the card previews the result before you
save it.

Bulk editing on the print list has grown past status and delete. Select some
prints and the Actions menu can now add them all to a project (typing a new name
creates that project once, not once per print), change their visibility, move
them to a different printer, or set their permissions. The actions are sent in
batches of twenty-five instead of one request per print, so a large selection
finishes in a fraction of the time, a single failure never stops the rest, and
anything that did fail stays selected so you can retry it. On a phone, where the
table and its checkboxes do not render, long-press a print card to start
selecting.

The rest of the release is fixes and groundwork. Switching between All Prints
and Grouped by Project no longer flashes the mobile card list on the way, and is
roughly twice as fast, and displaying two start-date columns together no longer
paints a page of blank rows. Saving a default filament price no longer
overwrites your default diameter, a deleted print comment disappears right away
instead of waiting for a reload, and a failed checkout no longer leaves the
Subscribe buttons stuck. Prints, Materials and Printers now load in the
background just after the app starts (skipped on a slow or metered connection),
so moving between them is instant.

The two headline features here were both asked for by users. If there is
something you would like 3D Print Log to do, [send in feedback](/feedback) and
help shape what comes next.

#### Full List of Changes:

- **Remaining material** - The material detail page now shows how much is left on the spool: a bar, the reading in your preferred unit, and the remaining length, volume, total used and print count. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/91" rel="noreferrer noopener" target="_blank" >PR #91</a >)
- **Prints that used a material** - A panel beside the material form lists the ten most recent prints that consumed it with the amount each one used, and links to the full filtered list when there are more. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/91" rel="noreferrer noopener" target="_blank" >PR #91</a >)
- **Live remaining preview** - Editing an adjustment or the nominal weight previews the new remaining figure before you save, and says so plainly when a change (such as a new density or diameter) cannot be previewed reliably. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/91" rel="noreferrer noopener" target="_blank" >PR #91</a >)
- **Bulk add to project** - Add a whole selection of prints to a project at once. Typing a new name creates that project a single time, rather than one copy per print. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/90" rel="noreferrer noopener" target="_blank" >PR #90</a >)
- **Bulk visibility, printer and permissions** - Three more bulk actions on the print list, alongside the existing set status and delete. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/90" rel="noreferrer noopener" target="_blank" >PR #90</a >)
- **One Actions menu** - The bulk actions now sit behind a single "Actions" button that carries the selected count, so the toolbar no longer pushes Clear off screen on a narrow window. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/90" rel="noreferrer noopener" target="_blank" >PR #90</a >)
- **Faster bulk actions** - Bulk edits are sent in batches of twenty-five instead of one request per print, and prints that fail stay selected for a one-click retry. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/90" rel="noreferrer noopener" target="_blank" >PR #90</a >)
- **Long-press to multi-select on mobile** - Press and hold a print card to enter multi-select, which is the only way into bulk actions at a width where the table does not render. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/103" rel="noreferrer noopener" target="_blank" >PR #103</a >)
- **Clearer bulk editing** - The bulk project dialog explains itself better, the action menus stay pinned, and selecting a row is now separate from opening it. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/103" rel="noreferrer noopener" target="_blank" >PR #103</a >)
- **No more flash when switching views** - Moving between Grouped by Project and All Prints no longer shows the mobile card list for a moment on desktop, and the switch is about twice as fast because only one list is built. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/103" rel="noreferrer noopener" target="_blank" >PR #103</a >)
- **Fixed blank rows with two start-date columns** - Showing Start Date, Start Time or Start Date/Time together used to render a page of empty cells until an unrelated update filled them in. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/103" rel="noreferrer noopener" target="_blank" >PR #103</a >)
- **Fixed "Save as Default Filament Price"** - Saving a default price wrote into your default diameter setting instead, and failed outright if you had no diameter default. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/102" rel="noreferrer noopener" target="_blank" >PR #102</a >)
- **Deleted comments disappear immediately** - A deleted print comment used to stay on screen until the page was reloaded. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/102" rel="noreferrer noopener" target="_blank" >PR #102</a >)
- **Fixed stuck Subscribe buttons** - A failed checkout left both Subscribe buttons disabled and spinning until you reloaded the page. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/102" rel="noreferrer noopener" target="_blank" >PR #102</a >)
- **Faster navigation to the main sections** - Prints, Materials and Printers load in the background shortly after the app starts, so opening them is instant. Preloading is skipped entirely on a slow or data-saving connection. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/96" rel="noreferrer noopener" target="_blank" >PR #96</a >)
- **Stronger security headers** - A Content Security Policy, Permissions-Policy and framing protections now ship with the site. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/95" rel="noreferrer noopener" target="_blank" >PR #95</a >)
- **Stricter type checking** - Angular's strict template checking is on, and the core of the app is now compiled with strict null checks, which catches a class of bug before it can reach you. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/97" rel="noreferrer noopener" target="_blank" >PR #97</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/101" rel="noreferrer noopener" target="_blank" >PR #101</a >)
- **End-to-end tests run on every change** - The browser test suite now runs automatically, and nine previously untested areas (settings, API keys, printer maintenance, print comments, public profiles, G-code import, notifications, subscriptions and the feed) are covered. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/87" rel="noreferrer noopener" target="_blank" >PR #87</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/102" rel="noreferrer noopener" target="_blank" >PR #102</a >)

### 1.46.0 - The New Print Page &amp; Bulk Editing {#v1.46.0}

The print page has been rebuilt. Your photos now lead the page in a proper image
hero, and everything about the print sits beside them in a spec rail: an "At a
glance" panel for the printer, status, times and costs, a Materials panel
showing each filament with its real color, and the project it belongs to as a
link you can follow. Prints without any photos no longer reserve a tall empty
panel, so they read as one clean column instead. Long material names, project
names and display names now wrap instead of spilling out of the panel, the
asterisk markers explain themselves to screen readers, and every action target
is big enough to hit on a phone.

Editing a batch of prints is no longer one menu at a time. The print list now
has checkboxes, and selecting rows brings up an action bar that can set the
status on all of them or delete them in one go. Marking six prints as Success
used to be around eighteen clicks; it is now two. A progress bar tracks the
batch as it runs, a single failure never stops the rest, and anything that did
fail stays selected so you can retry it.

The rest of the release is about not being left staring at a blank or stale
page. Opening a print or loading the list now paints a placeholder of the layout
that is coming rather than leaving the previous page on screen, and those
placeholders only appear if the wait is actually long enough to notice.
Refreshing a list you are already looking at keeps your rows in place instead of
throwing them away. Empty screens tell you which kind of empty you are looking
at: a brand-new account is invited to add a printer or log a first print, while
a search that matched nothing tells you what is filtering it out and offers to
clear it.

#### Full List of Changes:

- **Rebuilt print page** - The print detail page is now an image hero with a spec rail beside it ("At a glance", Materials, legend and actions), with notes, files and comments below. Prints with no images drop the hero and render as a single narrow column. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/81" rel="noreferrer noopener" target="_blank" >PR #81</a >)
- **Project link on prints** - A print that belongs to a project now links straight to it from the spec rail. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/81" rel="noreferrer noopener" target="_blank" >PR #81</a >)
- **Filament colors on the print page** - Each material is shown with an accessible swatch of its actual color. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/81" rel="noreferrer noopener" target="_blank" >PR #81</a >)
- **Print page accessibility and overflow fixes** - Asterisk markers resolve to their legend text for screen readers, action targets meet the 44px minimum, the sticky rail respects reduced-motion, and long material, project and user names wrap instead of overflowing the panel. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/81" rel="noreferrer noopener" target="_blank" >PR #81</a >)
- **Bulk status and delete on the print list** - Select prints with the new checkbox column and use the action bar to set a status on all of them or delete them together, with a confirmation naming the count. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/84" rel="noreferrer noopener" target="_blank" >PR #84</a >)
- **Bulk progress and partial failures** - A progress bar shows "n of N" as the batch runs, one failure never aborts the rest, and the prints that failed stay selected so a retry is one click away. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/84" rel="noreferrer noopener" target="_blank" >PR #84</a >)
- **Loading placeholders for prints** - The print list and print page now paint a skeleton of the layout that is coming instead of leaving the previous page on screen while data loads. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/83" rel="noreferrer noopener" target="_blank" >PR #83</a >)
- **No placeholder flashing on fast loads** - A placeholder only appears if the wait is long enough to notice, and once shown it stays long enough to read, so quick responses no longer flicker. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/83" rel="noreferrer noopener" target="_blank" >PR #83</a >)
- **Refreshing a list keeps your rows** - Changing a filter, sort or page dims the existing rows and shows a progress bar rather than replacing everything you were reading with grey boxes. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/83" rel="noreferrer noopener" target="_blank" >PR #83</a >)
- **Helpful empty states** - Empty print, material and printer lists now tell you which kind of empty they are: a first-run state with the right call to action, or a "nothing matched your filters" state that names the active filters and offers to clear them. The printers list previously rendered nothing at all when empty. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/82" rel="noreferrer noopener" target="_blank" >PR #82</a >)
- **Printerless users are pointed at a printer first** - If you have no printers yet, the print list explains that a printer comes first and offers a single Add printer button, instead of showing a contradictory toast alongside a "try a different search" message. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/82" rel="noreferrer noopener" target="_blank" >PR #82</a >)
- **Public print pages are more robust** - A failed settings, profile or print fetch no longer cancels navigation and bounces logged-out visitors back to the home page. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/81" rel="noreferrer noopener" target="_blank" >PR #81</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/83" rel="noreferrer noopener" target="_blank" >PR #83</a >)
- **Security: access tokens no longer sent to other hosts** - Your API access token is now only attached to requests to the 3D Print Log API. Previously images hosted elsewhere could receive it. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/69" rel="noreferrer noopener" target="_blank" >PR #69</a >)
- **Owner-only data is gated by default** - Filament links and prices on a shared print now default to hidden, so a missed call site cannot expose them to anonymous visitors, and print source links are validated before being rendered. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/81" rel="noreferrer noopener" target="_blank" >PR #81</a >)

### 1.45.0 - The New Analytics Page {#v1.45.0}

Analytics has been rebuilt from the ground up. Instead of a single page of
totals, there are now six tabs (Overview, Activity, Printers, Materials, Costs
and Accuracy) that all share one filter bar, so you can pick a date range,
narrow to particular printers, materials, projects or statuses, and every chart
on every tab follows along. Turn on compare to previous period to see how each
figure moved against the period immediately before it, and because your filters
and tab live in the page address, you can bookmark a view or send someone the
link.

The new tabs answer questions the old page could not. Activity shows a calendar
of your printing days, your current and longest streaks, and which days and
hours you actually start prints. Printers compares your machines side by side on
prints, success rate, hours, filament and maintenance spend. Materials breaks
filament use down by type, brand and color (with the real spool colors in the
charts), shows which spools you are burning through, and estimates how long each
one will last. Costs splits your spending into filament, electricity and
maintenance and shows what a typical print costs and how much went on prints
that did not work out. Accuracy compares your slicer's estimates against what
really happened, so you can see whether a printer or a material consistently
runs long or short.

Every chart can be exported as a CSV or a PNG image, and each tab can export all
of its data at once. Numbers are honest about where they came from: a recorded
value is always preferred over a slicer estimate, the charts tell you when
estimates were involved, and a missing duration or amount is treated as not
recorded rather than as a zero. See [the Analytics
documentation](/docs/analytics) for how success rate, waste and costs are worked
out.

#### Full List of Changes:

- **Redesigned Analytics page** - Six tabs (Overview, Activity, Printers, Materials, Costs and Accuracy) replace the old single-page layout, with all figures aggregated on the server so large print histories stay fast. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/76" rel="noreferrer noopener" target="_blank" >PR #76</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-api/pull/29" rel="noreferrer noopener" target="_blank" >API PR #29</a >)
- **Shared filter bar** - Date presets or a custom range, plus printer, material, project and status filters, a compare to previous period toggle, and a bottom sheet version on phones. Your selection and current tab are stored in the page address so views can be bookmarked and shared. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/76" rel="noreferrer noopener" target="_blank" >PR #76</a >)
- **Activity tab** - A calendar heatmap of active days, current and longest streaks, a print duration histogram, and a weekday-by-hour matrix of when you start prints, with a metric toggle to switch what the calendar is measuring. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/77" rel="noreferrer noopener" target="_blank" >PR #77</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-api/pull/30" rel="noreferrer noopener" target="_blank" >API PR #30</a >)
- **Printers tab** - A sortable comparison table (cards on small screens) covering prints, success rate, hours run, filament used, utilization and maintenance spend per machine. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/77" rel="noreferrer noopener" target="_blank" >PR #77</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-api/pull/30" rel="noreferrer noopener" target="_blank" >API PR #30</a >)
- **Click through to your prints** - Selecting a point on a time chart or calendar opens the print list filtered to exactly that date range. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/77" rel="noreferrer noopener" target="_blank" >PR #77</a >)
- **Materials tab** - Filament use by type, brand and color, your top spools by consumption, and a runway estimate for how long each spool will last. Bars are filled with the spool's actual color, including gradients for multi-color filaments. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/78" rel="noreferrer noopener" target="_blank" >PR #78</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-api/pull/31" rel="noreferrer noopener" target="_blank" >API PR #31</a >)
- **Costs tab** - Spending split into filament, electricity and maintenance, the distribution of what a print costs, how much went to waste, and prompts telling you what to fill in (spool prices, electricity rate, printer wattage) if a figure is missing. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/79" rel="noreferrer noopener" target="_blank" >PR #79</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-api/pull/32" rel="noreferrer noopener" target="_blank" >API PR #32</a >)
- **Accuracy tab** - Estimated versus actual print time and filament on a scatter chart with a reference line, median differences per printer and material, and plain-language callouts describing where your estimates run long or short. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/79" rel="noreferrer noopener" target="_blank" >PR #79</a >, <a href="https://github.com/HoffmanEngineering/3d-print-log-api/pull/32" rel="noreferrer noopener" target="_blank" >API PR #32</a >)
- **Chart and tab export** - Export any chart as a CSV or a theme-matched PNG image, or export everything on the current tab as a CSV in one go. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/79" rel="noreferrer noopener" target="_blank" >PR #79</a >)
- **Clearer notes on where numbers come from** - Charts now say in plain language when estimates were used, when prints were left out for a missing duration, and when a range was shortened to fit your data. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/77" rel="noreferrer noopener" target="_blank" >PR #77</a >)
- **Unpriced costs are no longer shown as zero** - A cost component that could not be priced (a spool with no purchase price, for example) is now distinguishable from a genuine zero, and amounts in another currency are called out instead of being silently added up. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/79" rel="noreferrer noopener" target="_blank" >PR #79</a >)
- **Volume-based filament costing fixed** - Prints that record filament by volume are now costed from that volume instead of a converted weight. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/76" rel="noreferrer noopener" target="_blank" >PR #76</a >)
- **Updated Analytics documentation** - The [Analytics page](/docs/analytics) now explains each tab, how success rate and waste are decided, how costs are valued, and what to fill in so the Costs tab works. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/79" rel="noreferrer noopener" target="_blank" >PR #79</a >)
- **Release notes popup renders correctly again** - The popup you are reading this in appeared unstyled (plain text and a bare button) when it opened straight after signing in.
- **More readable popup text** - Text in confirmation and release note popups is now full-strength instead of the faded grey it used before.

---

### 1.44.0 - Connect an AI Assistant (MCP) {#v1.44.0}

3D Print Log now connects to AI assistants like Claude and ChatGPT. Once
connected, you can ask about your prints, printers, and material inventory in
your own words ("how much blue PLA do I have left?" or "do I have enough for a
300 g model?"), and with your permission the assistant can log and update
prints, organize projects, add printers, and keep your spool inventory current.
The assistant can never delete anything, only ever sees data you created, and
never touches the printer itself. See [Connect an AI Assistant](/docs/mcp) for
setup instructions, and manage or disconnect assistants at any time from your
[Settings](/settings) page.

This release also includes a handful of fixes for filament values, image
uploads, and public print pages.

#### Full List of Changes:

- **Connect an AI Assistant** - Link Claude, Claude Code, or ChatGPT to your account so it can read your prints, printers, and materials, and log or update them on your behalf. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/73" rel="noreferrer noopener" target="_blank" >PR #73</a >)
- **Connected AI Agents settings** - Review which assistants have access and disconnect them at any time from the Settings page. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/73" rel="noreferrer noopener" target="_blank" >PR #73</a >)
- **Empty filament values no longer save as zero** - Leaving nominal weight, length, volume, or an adjustment weight blank now keeps the field empty instead of recording a zero. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/72" rel="noreferrer noopener" target="_blank" >PR #72</a >)
- **Image upload limit fixed** - The per-print image limit is now enforced correctly while uploads are still in progress, and uploads wait until existing files have finished loading. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/70" rel="noreferrer noopener" target="_blank" >PR #70</a >)
- **Private print details kept out of error reports** - Fixed an issue where the full contents of a print could be included in an internal error report if saving failed. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/71" rel="noreferrer noopener" target="_blank" >PR #71</a >)
- **Public prints for logged-out visitors** - Fixed an issue where a public print page could bounce anonymous visitors back to the home page instead of showing the print. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/68" rel="noreferrer noopener" target="_blank" >PR #68</a >)
- **Faster perceived load** - Pages now show a lightweight loading shell while the app starts up. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/67" rel="noreferrer noopener" target="_blank" >PR #67</a >)

---

### 1.43.11 - QR Label Printing Fix {#v1.43.11}

Fixed a bug where the Print QR Labels dialog would get stuck on "Generating QR
codes" and never finish. QR label generation now works again, and if anything
does go wrong the dialog shows a clear message with a retry option instead of
spinning forever.

#### Full List of Changes:

- **QR label generation fixed** - Resolved an issue introduced in 1.43.9 where the QR code library failed to load in production, leaving the Print Labels dialog stuck on the loading spinner.

---

### 1.43.10 - Faster Page Loads {#v1.43.10}

More behind-the-scenes work to speed up the app. The initial download was
slimmed down further by loading large shared interface code only when a page
actually needs it, so the app becomes usable sooner. There are no visible
changes (everything works exactly as before, just faster).

#### Full List of Changes:

- **Smaller initial download** - Heavy shared interface libraries now load on demand with the pages that use them instead of up front, reducing the amount of code the browser processes before the app is ready.

---

### 1.43.9 - Faster Initial Load {#v1.43.9}

The app now starts up faster. Several heavy behind-the-scenes libraries
(analytics and QR code tools) no longer load up front. They now load only when
they are actually needed, which reduces the amount of code the browser has to
download and process before the page becomes usable.

#### Full List of Changes:

- **Deferred analytics loading** - The usage analytics library now loads after the page has finished painting instead of blocking the initial load.
- **On-demand QR code tools** - The QR code scanner and generator libraries now load only when you open the scanner or create a label, keeping them out of the initial download.

---

### 1.43.8 - Faster, More Accessible Homepage {#v1.43.8}

The homepage now loads faster and feels more responsive. Advertising scripts
wait until you start interacting with the page instead of loading up front, the
example images were converted to a lighter format, and retired tracking code was
removed. Together these reduce the time before the page becomes usable.

The pink accent color used for buttons and highlights was deepened so text and
controls meet accessibility contrast guidelines, making them easier to read for
everyone.

#### Full List of Changes:

- **Deferred ad loading** - Advertising scripts now load on your first interaction with the page, which restores the browser's back/forward cache and reduces the time the page is blocked while starting up.
- **Lighter homepage images** - The example screenshots on the homepage are now served in the WebP format for smaller, faster downloads.
- **Improved color contrast** - The accent color was adjusted to meet WCAG 4.5:1 contrast guidelines for better readability and accessibility.
- **Analytics cleanup** - Removed retired Universal Analytics tags and fixed per-page analytics tracking so visit data is recorded correctly.
- **Better AI and search discoverability** - Added an llms.txt file so AI assistants can understand how the site is organized. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/55" rel="noreferrer noopener" target="_blank" >PR #55</a >)

### 1.43.7 - Better Search Engine Understanding {#v1.43.7}

The homepage, slicer guides, and every documentation page now describe
themselves to search engines using structured data. This helps search engines
(and AI assistants) understand what 3D Print Log is and what each page covers,
so the right pages surface when people look for a 3D print tracker or for help
with a specific feature.

#### Full List of Changes:

- **Structured data for prerendered pages** - Added Schema.org structured data (app, organization, documentation articles with breadcrumbs, and slicer how-to guides) to every prerendered page for better search visibility. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/53" rel="noreferrer noopener" target="_blank" >PR #53</a >)

### 1.43.6 - Documentation Pages Load Faster {#v1.43.6}

Every help and documentation page now loads as a fully rendered static page.
This makes the docs open faster and easier for search engines to find, so
answers turn up more readily when you search for how a feature works.

#### Full List of Changes:

- **Prerendered documentation** - All public documentation pages are now prerendered with their own titles, descriptions, and social sharing details for quicker loads and better search visibility. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/51" rel="noreferrer noopener" target="_blank" >PR #51</a >)

### 1.43.5 - Dark Mode Flash Fix {#v1.43.5}

This patch fully removes the brief light-mode flash when opening 3D Print Log
with dark mode enabled. The previous release reduced it; pages now render in
dark from the very first frame with no flicker.

#### Full List of Changes:

- **No dark mode flash** - Your saved theme is now applied before the first frame renders, so dark mode pages no longer flash light on load. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/49" rel="noreferrer noopener" target="_blank" >PR #49</a >)

### 1.43.4 - Dark Mode Flash Fix {#v1.43.4}

This patch fixes a brief flash of light mode when opening 3D Print Log with dark
mode enabled. Your saved theme is now applied before the page first renders, so
dark mode users go straight to dark with no flicker.

#### Full List of Changes:

- **No more dark mode flash** - Pages now apply your saved theme before they first paint, removing the momentary light-mode flash on load (most noticeable on the slicer landing pages). (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/47" rel="noreferrer noopener" target="_blank" >PR #47</a >)

### 1.43.3 - SEO &amp; Sitemap Improvements {#v1.43.3}

This release focuses on search-engine visibility. 3D Print Log now publishes
dedicated landing pages for popular slicers (Cura, PrusaSlicer, Bambu Studio,
OrcaSlicer, and more) that are pre-rendered so search engines can read them
directly.

It also rebuilds how the sitemap is generated, so every public print and profile
page is included and kept up to date daily. There are no changes to the app you
use day to day.

#### Full List of Changes:

- **Slicer landing pages** - New pre-rendered pages for major slicers, with links between them, improving how 3D Print Log appears in search results. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/45" rel="noreferrer noopener" target="_blank" >PR #45</a >)
- **Rebuilt sitemap** - The sitemap is now generated at deploy time and refreshed daily, covering all public print and profile pages. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/45" rel="noreferrer noopener" target="_blank" >PR #45</a >)

### 1.43.2 - Dark Mode Menu &amp; Print View Fixes {#v1.43.2}

This patch fixes a few dark mode display issues. The navigation menu options
(Printers and About), the notification bell icon, and the headings on the home
and documentation pages were showing in a hard-to-read dark color on the dark
toolbar, and now stay white and legible.

It also fixes a broken image icon that could appear on the print view when a
print was uploaded by someone without a profile picture (a default avatar is now
shown instead).

#### Full List of Changes:

- **Readable dark mode menu bar** - The menu buttons (Printers, About), the notification bell, and the home and documentation page headings now stay white on the dark toolbar instead of turning a dark, hard-to-read color. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/43" rel="noreferrer noopener" target="_blank" >PR #43</a >)
- **Default avatar on the print view** - Prints uploaded by users without a profile picture no longer show a broken image icon; a default avatar is shown instead. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/43" rel="noreferrer noopener" target="_blank" >PR #43</a >)

### 1.43.1 - Dark Mode Readability Fixes {#v1.43.1}

This patch improves readability in dark mode. Several spots that showed
hard-to-read dark text on the dark background (such as the material list cards
on mobile and the spool weight calculator dialog) now use theme-aware colors,
and focused input fields use a lighter, more legible blue.

#### Full List of Changes:

- **Readable text on dark surfaces** - Text that was hardcoded to a dark color (including the material card brand and remaining weight, and the spool weight calculator) now follows the active theme, so it stays legible in dark mode. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/41" rel="noreferrer noopener" target="_blank" >PR #41</a >)
- **Lighter focused inputs** - Focused form fields (and other primary accents like buttons and tabs) now use a lighter blue in dark mode, so the focused label and underline are easier to read against the dark background. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/41" rel="noreferrer noopener" target="_blank" >PR #41</a >)

### 1.43.0 - Spool Weight Calculator {#v1.43.0}

This release adds a **Spool Weight Adjustment Calculator** to the material
detail page. Instead of working out a filament adjustment by hand, weigh the
whole spool, enter the measured total, and 3D Print Log calculates the exact
adjustment needed to match what you actually have left (then adds it to your
adjustments, ready to review before you save).

#### Full List of Changes:

- **Spool Weight Adjustment Calculator** - On the [Materials](/materials) detail page, use "Adjust from measured weight" to reconcile your tracked remaining filament with a scale reading. It combines the spool weight and the currently tracked remaining amount into a clear before (tracked) and after (measured) comparison, and adds the resulting adjustment for you. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/39" rel="noreferrer noopener" target="_blank" >PR #39</a >)
- **Works with any tracked unit** - The calculator supports materials tracked by weight, length, or volume, converting your measured weight into the correct adjustment automatically. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/39" rel="noreferrer noopener" target="_blank" >PR #39</a >)

### 1.42.0 - Preferred Filament Units {#v1.42.0}

This release introduces a **Preferred Filament Display Unit** setting, letting
you choose how filament usage appears throughout 3D Print Log (as originally
recorded, in grams, or in meters). Your preference is applied consistently
across the print list, print detail, filament usage summaries, and the edit
print form.

Dates and times throughout the app now use your browser's locale for proper
regional formatting (e.g., MM/DD/YYYY vs. DD/MM/YYYY). Date and time pickers are
also localized, so entering dates feels natural no matter where you are.

#### Full List of Changes:

- **Preferred Filament Display Unit** - A new setting on the [Settings](/settings) page lets you choose how filament usage displays throughout the app: as recorded, in grams, or in meters. The preference is applied across the print list, print detail, filament usage summaries, and the edit print form. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/36" rel="noreferrer noopener" target="_blank" >PR #36</a >)
- **Locale-Aware Date Formatting** - Dates and times are now formatted using your browser's locale via the native `Intl.DateTimeFormat` API, ensuring proper regional display regardless of your location. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/34" rel="noreferrer noopener" target="_blank" >PR #34</a >)
- **Removed moment.js** - The app no longer depends on moment.js, reducing bundle size and replacing it with modern native Date APIs throughout. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/34" rel="noreferrer noopener" target="_blank" >PR #34</a >)
- **Bug Fix: Settings Currency Label** - The electricity rate input label in Settings now correctly reflects the currently selected currency symbol. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/37" rel="noreferrer noopener" target="_blank" >PR #37</a >)

### 1.41.0 - Multi-Color Materials {#v1.41.0}

This release brings **Multi-Color Material Support** to 3D Print Log! Materials
now support color patterns (solid, multi, gradient, and rainbow), finish types
(standard, silk, and matte), and special effects (sparkle, glow-in-the-dark,
translucent, carbon fiber, wood fill, metal fill, fluorescent, and glass fiber).
Filament swatches throughout the app in the materials list, print list, print
detail, and printer pages now render as rich gradient previews that reflect your
filament's actual appearance.

#### Full List of Changes:

- **Multi-Color Material Support** - Materials now support color patterns (solid, multi, gradient, rainbow), finish types (standard, silk, matte), and special effects (sparkle, glow-in-the-dark, translucent, carbon fiber, wood fill, metal fill, fluorescent, glass fiber). Set these on the [Materials](/materials) page when adding or editing a filament. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/32" rel="noreferrer noopener" target="_blank" >PR #32</a >)
- **Gradient Swatches** - Color swatches throughout the app (materials list, print list, printer list, print detail) now render as gradient previews for multi-color filaments, giving you an accurate visual representation of your filament. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/32" rel="noreferrer noopener" target="_blank" >PR #32</a >)
- **Color and Appearance Filters** - The materials page now supports filtering by color pattern, finish type, and effects to help you find the right filament quickly. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/32" rel="noreferrer noopener" target="_blank" >PR #32</a >)
- **Material Icon Updates** - The filament spool and resin bottle icons now render multi-color patterns and effect overlays to visually represent your filament's appearance. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/32" rel="noreferrer noopener" target="_blank" >PR #32</a >)
- **Bug Fix: Project Selector** - Fixed a bug where editing a print with an existing project assigned would not correctly display the selected project in the project selector. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/31" rel="noreferrer noopener" target="_blank" >PR #31</a >)
- **Angular 21 Upgrade** - Upgraded to Angular 21, which includes various performance improvements and security enhancements. (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/29" rel="noreferrer noopener" target="_blank" >PR #29</a >)

### 1.40.0 - Open Source {#v1.40.0}

**3D Print Log is now open source!** After years of requests, the full source
code for both the UI and API are publicly available on GitHub. Whether you want
to self-host, contribute a feature, report a bug, or simply explore how it all
works — you're warmly invited to get involved.

#### Full List of Changes:

- **UI Repository** - The Angular frontend is available at <a href="https://github.com/HoffmanEngineering/3d-print-log-ui" rel="noreferrer noopener" target="_blank" >github.com/HoffmanEngineering/3d-print-log-ui</a >. Contributions, bug reports, and feature requests are welcome!
- **API Repository** - The backend API is available at <a href="https://github.com/HoffmanEngineering/3d-print-log-api" rel="noreferrer noopener" target="_blank" >github.com/HoffmanEngineering/3d-print-log-api</a >. Pull requests and issues are open to the community.
- **How to Contribute** - Open an issue to discuss a feature or bug, then submit a pull request. All skill levels are welcome — from typo fixes to full features.

### 1.39.0 - Electricity Cost Tracking {#v1.39.0}

This release adds **Electricity Cost Tracking**! Set your printer's wattage and
your electricity rate to automatically calculate the electricity cost for every
print. Costs appear in the print list, print view, grouped project view, and are
factored into total cost calculations.

#### Full List of Changes:

- **Printer Wattage** - Set the wattage for each printer on the printer detail page to enable electricity cost calculations.
- **Electricity Rate Setting** - Configure your electricity rate (cost per kWh) in [Settings](/settings) to apply to all cost calculations.
- **Electricity Cost in Print List** - A new electricity cost column in the print list shows the calculated cost for each print.
- **Electricity Cost in Print View** - The print detail page now displays the electricity cost alongside filament and total costs.
- **Electricity Cost in Grouped View** - The grouped project view now includes electricity cost per project.
- **Live Preview** - The print edit and add forms show a live electricity cost preview that updates as you change print duration or printer selection.
- **Per-Printer Project Cost** - Project cost breakdowns now include per-printer electricity cost summaries.

### 1.38.0 - Projects {#v1.38.0}

This release introduces **Projects**! Organize your prints into named projects
with descriptions, statuses, and images. View all prints for a project from a
dedicated project page, assign prints to projects from the edit form, and switch
to the new **Grouped View** in the Print List to see your projects with print
counts and total costs at a glance.

#### Full List of Changes:

- **Projects** - Create and manage projects with names, descriptions, statuses, and default images to organize your prints.
- **Project Detail Page** - Each project has a dedicated page showing project info and all associated prints as cards.
- **Assign Prints to Projects** - Pick a project from the print edit form to associate a print with a project.
- **Project Chips** - Print cards and table rows now show a chip indicating which project they belong to — click it to navigate to the project page.
- **Grouped Print View** - A new view in the [Print List](/prints) groups your prints by project, showing print counts and total costs per project. Expand a project to see individual prints, with a column picker to customize what's shown. Includes a mobile-friendly card layout.
- **Add a Project from Print List** - A new "Add a Project" option in the Print List dropdown menu lets you create projects without leaving the prints page.
- **Public Project Pages** - Public project pages are accessible without signing in, so you can share your projects with others.
- **Performance Improvements** - Filaments are now loaded more efficiently on the Print List page. Other minor query optimizations.

### 1.37.0 - Dark Mode {#v1.37.0}

3D Print Log now supports **Dark Mode**! Head to the [Settings](/settings) page
to choose between **Light**, **Dark**, or **System** theme. System automatically
follows your device's preference. The entire app has been updated with
dark-friendly colors for cards, charts, status badges, filament swatches, and
more.

### 1.36.2 - Updated Printer Makes &amp; Models {#v1.36.2}

This is a maintenance release with an updated list of printer makes and models
available when adding a new printer.

#### Full List of Changes:

- **Updated Printer Makes &amp; Models** - The list of available printer makes and models when adding a new printer has been updated with the latest hardware.

### 1.36.1 - Android App Returns to Google Play {#v1.36.1}

The **3D Print Log Android App** is back on the Google Play Store under a new
listing! If you had the previous version installed, please uninstall it and <a
href="https://play.google.com/store/apps/details?id=com.hoffmanengineering.printlog"
>install the new app</a >. The new app includes a better sign-in experience and
improved camera permission handling for the Material QR Code scanning features.

#### Full List of Changes:

- **Android App Relisted** - The 3D Print Log Android app has been republished on Google Play. Users of the old app should uninstall it and install the new version from the Play Store.
- **Improved Sign-In** - The new app features a smoother, more reliable sign-in experience.
- **Better Camera Permissions** - Camera permission handling has been improved so that Material QR Code scanning works correctly.

### 1.36.0 - Filter Materials by Storage Location {#v1.36.0}

This release adds a **Filter by Storage Location** dropdown to the
[Materials](/materials) page, making it easy to view all filaments in a specific
storage box or shelf at a glance. Pair it with the **Print Labels** button to
quickly print QR labels for everything in a given storage location.

#### Full List of Changes:

- **Filter by Storage Location** - A new single-select dropdown in the Materials filter panel lets you filter your filament list by storage location. Choose a named location, select *Unassigned* to see filaments with no storage location set, or leave it at *No Filter* to see everything.

### 1.35.0 - 3D Print Log Pro {#v1.35.0}

This release introduces <a routerLink="/subscription">**3D Print Log Pro**</a >.
Don't worry, **all functionality in 3D Print Log will always remain free**. Pro
is for those who want an **ad-free experience**, help support the development of
3D Print Log, and get extra cloud storage in return. Pro subscribers get
additional storage for photos and file attachments, letting you store G-code,
project files, or any print-related documents directly against your prints, with
drag-and-drop uploads and configurable download access for viewers. All without
any ads.

#### Full List of Changes:

- **Ad-Free Experience** - Pro subscribers enjoy 3D Print Log with no ads.
- **Additional Cloud Storage** - Pro subscribers get increased photo storage per print, plus the ability to attach files (G-code, project files, etc.) to prints.
- **File Attachments** - Upload files to any print via a drag-and-drop drop zone. A file list is shown on the print detail page, and an *Allow File Downloads* toggle controls whether viewers can download your attached files.
- **3D Print Log Pro Subscription** - New pricing page, Stripe checkout integration, and a subscription management section in Settings. All payments are securely handled through Stripe, a leading payments platform trusted by millions. 3D Print Log will never have access to your sensitive payment information.
- **Pro Badge &amp; Navigation** - A Pro badge and upgrade link appear in the navigation bar for free users.
- **Thumbnail Strip Improvements** - The image thumbnail strip now auto-scrolls to keep the selected image visible, with a polished overflow and scrollbar treatment.
- **Pro Documentation** - A new [Pro subscription documentation page](/documentation/pro) explains the features and how to manage your subscription.

### 1.34.1 - Bug Fixes {#v1.34.1}

This release contains bug fixes for completion date/time entry and the feedback
form.

#### Full List of Changes:

- **Completion Date/Time Fix** - Fixed an issue where manually entering a completion date and time was not saving correctly. Entering the time before the date would cause the time to be lost, and in some cases the completion date could appear as one day earlier than entered due to sub-second precision drift.
- **Feedback Form Fix** - Fixed an issue where submitting feedback was not sending email notifications.

### 1.34.0 - Materials Page Mobile Redesign &amp; Filament Spool Icon {#v1.34.0}

The [Materials page](/filaments) has been redesigned for mobile with a new
card-based layout. Each material card now displays a custom **filament spool
icon** rendered in the material's actual color, giving you an instant visual
reference. Cards with a **bottle** material type automatically show a bottle
icon instead.

The filter bar on the Materials page has also been updated to match the print
list, with a collapsible panel that keeps the interface clean while a badge
shows how many filters are active.

#### Full List of Changes:

- **Mobile Card Layout** - The Materials page now uses a card-based layout on mobile, matching the look and feel of the Print List
- **Filament Spool Icon** - Each material card displays a custom SVG filament spool icon rendered in the material's color
- **Material-Aware Icon** - Materials with a bottle type automatically show a bottle icon instead of a spool
- **Collapsible Filter Panel** - The filter bar on the Materials page now uses the same collapsible panel design as the Print List, with an active filter badge
- **Improved Filament Search Dialog** - The filament search dialog is wider and no longer clips on narrow screens
- **Slicer Integration Snapshot Fix** - Snapshots from slicer integrations now correctly appear when saving a print from the slicer upload form

### 1.33.0 - Material Filters &amp; Improved Filter Bar {#v1.33.0}

You can now filter your [Print List](/prints) by material! Click the new
**Filter by Material** button to search and select one or more filaments. Your
selected materials appear as color-coded chips so you can see your active
filters at a glance — click the **X** on any chip to remove it individually, or
use **Reset Filters** to clear everything at once.

The search and filter bar has also been redesigned to be more responsive on all
screen sizes. All filter controls are now tucked into a collapsible panel that
opens from a **Filters** button, keeping the interface clean while a badge shows
how many filters are active at a glance.

#### Full List of Changes:

- **Filter by Material** - Filter your print list by one or more filaments using the new "Filter by Material" button
- **Multi-Select Material Picker** - Choose multiple filaments at once from the searchable material picker modal
- **Filter Chips** - Active material filters are displayed as color-coded chips for easy visibility and quick removal
- **Collapsible Filter Bar** - Search and filter controls have been redesigned into a cleaner, collapsible panel that works well on mobile and desktop. A badge on the Filters button shows the number of active filters at a glance.
- **QR Label Copies** - In the QR Code Label dialog, you can now print multiple copies of each label. Useful for printing duplicates for each side of a spool.

### 1.32.0 - Multi-Image Support &amp; Accessibility {#v1.32.0}

Prints now support **up to 5 images**! Browse between images using the new
carousel navigation, reorder them with drag-and-drop, and designate one as the
default image shown in your print list. This release also includes **WCAG 2.1 AA
accessibility improvements** to the image carousel and thumbnail strip, making
the image gallery fully keyboard and screen reader accessible.

#### Full List of Changes:

- **Multi-Image Support** - Attach up to 5 images per print, with a thumbnail strip for quick selection
- **Image Carousel Navigation** - Browse images using arrow buttons or swipe gestures on touch devices
- **Drag-and-Drop Reordering** - Drag thumbnails to change the display order of your images
- **Default Image** - Mark any image as the default to control which image appears in the print list and public view
- **Accessibility (WCAG 2.1 AA)** - Carousel and thumbnail strip are now fully keyboard navigable with screen reader announcements for slide position changes

### 1.31.0 - QR Code Labels for Filament Spools {#v1.31.0}

Quickly identify and select your filament spools with the new **QR Code Labels**
feature! Print QR code labels for your filament spools and scan them to
instantly select the filament when adding prints.

Generate labels from the [Materials List](/filament) by selecting one or more
filaments and clicking "Print Labels". Each label includes a QR code along with
the filament's color, name, and material type. When starting a new print, use
the QR scanner to quickly select the correct filament without searching through
your collection.

#### Full List of Changes:

- **QR Code Label Printing** - Generate printable QR code labels for your filament spools from the Materials List
- **Bulk Label Printing** - Select multiple filaments at once using the new multi-select feature to print labels in bulk
- **QR Code Scanner** - Scan filament QR codes when adding prints to quickly select the correct filament

### 1.30.0 - Notifications {#v1.30.0}

Stay informed with the new **Notifications** feature! 3D Print Log will now
notify you about important events related to your prints and account.

Click the bell icon in the navigation bar to view your notifications. You'll
receive notifications for events like print status updates from your connected
printers, comments on your prints, and system announcements.

#### Full List of Changes:

- **Notification Bell** - A new notification bell icon in the navigation bar shows your unread notification count
- **Notification Panel** - Click the bell to view recent notifications with quick actions to mark as read or delete
- **Notification Types** - Receive notifications for print completions, print failures, comments, achievements, and system announcements
- **Notification Center** - View all notifications with filtering options on the dedicated [Notifications](/notifications) page

### 1.29.0 {#v1.29.0}

The <a href="https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader"
rel="noreferrer noopener" target="_blank" >Slic3r Post-Processing Uploader</a >
has been updated to v1.1.0, which adds better multi-material support. Download
the new version today for the latest features.

### 1.28.0 - Slic3r Uploader Released! {#v1.28.0}

Initial release of the <a
href="https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader"
rel="noreferrer noopener" target="_blank" >Slic3r Post-Processing Uploader</a >.
This plugin will automatically send print information when gcode files are
exported. Supports most slicers that are based on Slic3r, including PrusaSlicer,
Bambu Studio, OrcaSlicer, and more.

See the full documentation at [Slic3r Uploader](/docs/slic3r-uploader) for
installation and configuration details.

Windows/Mac/Linux are supported.

### 1.27.1 - Performance Improvement {#v1.27.1}

Updated website dependencies which brings minor bug fixes, security updates and
performance improvements.

### 1.27.0 - Anycubic Slicer Gcode Parser {#v1.27.0}

Added support for the Anycubic Slicer when adding prints from gcode. The parser
will extract the thumbnail, print time, filament usage, and other settings from
the gcode file.

### 1.26.3 - Performance Improvements {#v1.26.3}

Updated website dependencies which brings minor bug fixes and performance
improvements. Technical details: Updated to Angular 18.

### 1.26.2 - Performance Improvements {#v1.26.2}

Updated website dependencies which brings minor bug fixes and performance
improvements.

### 1.26.1 - Added Privacy Policy {#v1.26.1}

Added a Privacy Policy detailing how 3D Print Log collects and uses data. Please
review the [Privacy Policy](/docs/privacy-policy) for more information.

### 1.26.0 - Klipper/Moonraker Integration {#v1.26.0}

3D Print Log now integrates with Klipper/Moonraker. Configure your Klipper
printer to automatically send print information to 3D Print Log, tracking print
time and filament usage. It uses moonraker's built in **notifier** component, so
no additional plugins are required, just a small configuration change.

See the [Klipper Documentation](/docs/klipper) for more information on setting
up the integration.

### 1.25.1 - Bug Fixes and Printer Tooltip {#v1.25.1}

Fixed a display issue with the calendar picker. Added a tooltip to the printer's
make and model.

### 1.25.0 - Support all Materials and Printer Types (Resin, Powder, etc) {#v1.25.0}

3D Print Log now supports all materials and printer types. When adding a new
material, you can select whether the material is filament, resin, powder, or
wire. When adding a new printer, you can select whether the printer is FDM, SLA,
SLS, etc. The printer type will be used to filter your materials, allowing easy
filtering of materials that are compatible with your printer.

In addition to weight, 3D Print Log now supports length and volumetric
measurements for both Materials and Print Material Usage. Easily keep track of
the volume of bottles of resin, or add new filament spools that are measured in
length. No matter how your slicer reports material usage, you can now track it
in 3D Print Log.

#### Full List of Changes:

- **Filament renamed to Materials** - The Filament tab is now the Materials tab
- **Materials Categories** - Materials can now be filament, resin, powder, or wire
- **Materials support length and volume for Initial Amounts** - When adding a new material, you can now specify the initial amount in length or volume, in addition to weight.
- **New Material Settings** - Materials now have new options, depending on the category selected. New options for layer times, melting temperatures, inert gas, and refresh ratios have been added.
- ** Material List Filtered by Category** - The material list can be filtered by the category. When adding a material usage to a Print, the selected printer will determine which materials are displayed.
- **Printer Types** - Printers now have a type selection, allowing you to mark a printer as FDM, SLA, SLS, etc. We tried to set all existing printers to the correct type, but we cannot account for all printers. You made need to change your existing printer types.
- **New Printer Settings** - Printers now have new options, depending on the type selected. New options for bed size, screen resolutions, beam diameter, heated bed and chambers, and more have been added.
- **Security and Performance Improvements** - Updated website dependencies, which bring various bug fixes, security and performance improvements. The website is now running Angular 17.

### 1.24.0 - Bambu Studio, Orca, and Creality Print Gcode Support {#v1.24.0}

Added support for Bambu Studio, Orca, and Creality Print gcode files. Additional
settings will be parsed from the gcode file when adding a print from gcode for
these new slicers.

### 1.23.1 - Delete Printers {#v1.23.1}

Printers can now be deleted. From the Printer List, click the ... menu and
select "Delete". That will display a confirmation screen, and once accepted the
printer and all linked maintenance entries will be deleted. Only printers that
are not used in any prints can be deleted.

### 1.23.0 - Printer Maintenance Log {#v1.23.0}

You can now log maintenance on your printers! This will allow you to track when
you last cleaned your print heads, changed your nozzles, and any other
maintenance task you want. You can also keep track of upcoming maintenance
tasks.

The maintenance log can be found on the [Printer
Maintenance](/printer-maintenance) page.

This is the initial release, with more functionality around maintenance tasks
coming in the future. More analytics, reminders, and task rules are in the
works. If you have any suggestions, please send in a [feedback](/feedback)!

### 1.22.3 - Filament Field Autocomplete {#v1.22.3}

Added autocomplete suggestions to the Filament Detail page. The "Brand",
"Storage Location", and "Purchase Location" fields will now suggest previously
used values.

Authentication sessions are now stored differently by the browser, improving the
experience when opening 3D Print Log in new tabs.

### 1.22.1 - Fix for Safari {#v1.22.1}

Fixed an issue where the filament details page was not navigating correctly when
using the Safari web browser.

### 1.22.0 - Copy Print Image and Reorder Print List Columns {#v1.22.0}

When copying a print, the print image will also be copied. You can remove the
image before saving if you do not want to save the copied image.

Columns on the Print List can now be reordered! From the Print List, click the
Gear Menu -> Change Table Layout, and then either drag-and-drop or use the
arrows to reorder the columns.

#### Full List of Changes:

- **Copy Print Image** - Print images are now included when copying a print
- **Reorder Print List Columns** - Columns can be reordered via the **Gear Icon -> Change Table Layout** menu on the Print List
- **Styling** - Styling across the application have been adjusted to be more accessible and easier to read and navigate
- **Loading Bar** - Added a loading bar to the top to indicate when the application is loading or saving data.
- **Technical Updates** - Updated website dependencies, which bring various bug fixes, security and performance improvements

### 1.21.0 - Filament Defaults and Total Print Costs {#v1.21.0}

You can now set the **Default Filament Diameter** and **Default Filament
Price**. The **Default Filament Diameter** will automatically populate the
diameter when creating a new filament, saving you keystrokes. The **Default
Filament Price** will be used in all cost calculations when the selected
filament doesn't have a price specified.

You can set the defaults in the [Settings Page](/settings), or when changing the
Diameter or Price on the Edit Filament page.

Speaking of cost calculations, the [Print List](/prints) now has a new **Total
Cost** column. This will display the sum of all the filament costs for that
print. The **Filament** column will also display the individual costs for each
different filament used in a print. You can view those new columns on the Print
List by clicking the **Gear Icon**->**Change table layout**, then selecting
**Filament** or **Total Cost**.

#### Full List of Changes:

- **New Default Filament Diameter** - New setting for the default filament diameter
- **New Default Filament Price** - Global filament price used in all cost calculations, if the filament doesn't specify a price.
- **Print List - Add Total Cost Column** - New column which will display the total cost of filament for a print, accessible from the Print List's Gear menu.
- **Print List - Cost added to Filament column** - Filament rows display the cost of the amount of that filament that was used
- **Octoprint Filament Usage Bug Fix** - Prints added through the Octoprint integration will now automatically calculate the weight of filament used, which means costs will now be accurate. This fix was also applied to all old prints.
- **Deactivate Account button disabled** - The "Deactivate Account" button will now be disabled once clicked, preventing confusion on whether or not the deactivation was successful.

### 1.20.0 - Cura Plugin 2.0.5 {#v1.20.0}

The **3D Print Log Uploader Plugin for Cura** has been updated to version 2.0.5.
This version adds a new option "Include Object Details In Notes", which is
enabled by default. This will add the object name, position, and size
information directly within the Notes section went sent to 3D Print Log.

You can install v2.0.5 of the plugin via the <a
href="https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader"
>Ultimaker Cura Marketplace</a > . Alternatively, you can download the <a
href="https://github.com/ChristopherHoffman/3d-print-log-cura-plugin/releases"
>Latest Release from Github</a > and drag/drop into Cura to install.

#### Full List of Changes:

- **Cura Plugin v2.0.5** - Add "Include Object Details In Notes" option.
- **Cura Plugin v2.0.5** - Sends the currently selected machine ID for a future 3D Print Log feature which will automatically select the correct printer.
- **Technical Updates** - Update website dependencies, which bring various bug fixes, security and performance improvements

### 1.19.0 - Filament on Print List and Partial Success Status {#v1.19.0}

<div fxLayout="column">
    <div fxFlex="grow">
      <p>
        The Print List now has two new optional columns: The
        <strong>Filament</strong> column displays detailed information about the
        filament used for the print, including the color, display name, and
        weight used. The <strong>Total Filament (g)</strong> column displays the
        sum of all the weight of filament used. The
        <strong>Total Filament (g)</strong> column is also sortable, so you can
        sort the list by weight to find a past design that uses a specific
        amount of filament.
      </p>
      <p>
        You can view those new columns on the Print List by clicking the
        <strong>Gear Icon</strong>-><strong>Change table layout</strong>, then
        selecting <strong>Filament</strong> or
        <strong>Total Filament (g)</strong>.
      </p>
      <p>
        There is a new <strong>Print Status</strong> for
        <strong>Partial Success</strong>. This can be handy for prints where
        some of the parts succeeded, but some failed. You can select the new
        status when editing a print, or using the
        <strong>Change Print Status</strong> menu option from the Print List.
      </p>
    </div>
    <div fxFlex>
      <img
        class="fade-in"
        style="display: block; max-width: 90%; margin-right: auto"
        alt="The Print List with the new Filament and Total Filament columns."
        src="./assets/release_1-19-0_FilamentPrintList_684039eab.PNG"
      />
    </div>

    <h3 id="v1.18.0">
      1.18.0 - Filament Storage Location and Bed Temperatures
    </h3>
    <p>
      The Filament edit details page contains two new fields:
      <strong>Recommended Bed Temperature</strong> and
      <strong>Storage Location</strong>. If you keep your filament organized in
      boxes/containers/etc, you can now save where the filament is stored so you
      can find it easier.
    </p>
    <p>
      The <strong>Storage Location</strong> is also displayed on the filament
      list, to make it easier to search.
    </p>

    <h3 id="v1.17.2">1.17.2 - Currency Calculation Bug Fix</h3>
    <p>
      Fixed a small bug where sometimes the estimated cost was calculated
      incorrect due to rounding.
    </p>

    <h3 id="v1.17.1">1.17.1 - Cura Plugin 2.0.3</h3>
    <p>
      The <strong>3D Print Log Uploader Plugin for Cura</strong> has been
      updated to version 2.0.3. This version fixes a graphical glitch with the
      Setting Categories in the Settings Dialog window, and allows the window to
      use the current Cura Theme.
    </p>
    <p>
      You can install v2.0.3 of the plugin via the
      <a
        href="https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader"
        >Ultimaker Cura Marketplace</a
      >
      . Alternatively, you can download the
      <a
        href="https://github.com/ChristopherHoffman/3d-print-log-cura-plugin/releases"
        >Latest Release from Github</a
      >
      and drag/drop into Cura to install.
    </p>
    <h4>Full List of Changes:</h4>
    <ul>
      <li><Strong>Cura Plugin v2.0.3</Strong> - Support Cura Themes Layout.</li>
      <li>
        <Strong>Cura Plugin v2.0.3</Strong> - Fix Settings Category Buttons for
        Cura 5. Thank you github user 5axes for the contribution.
      </li>
      <li>
        <Strong>Technical Updates</Strong> - Update website to Angular 14, which
        brings various bug fixes and performance improvements.
      </li>
    </ul>

    <h3 id="v1.17.0">
      1.17.0 - Set Preferred Currency and Show Estimated Filament Costs
    </h3>
    <div fxLayout="column">
      <div fxFlex="grow">
        <p>
          The Edit Print page will now display estimated/actual filament costs.
          When you add the weight or length of filament used, the cost for that
          amount of filament will be displayed.
        </p>
      </div>
      <div fxFlex>
        <img
          class="fade-in"
          style="display: block; max-width: 90%; margin-right: auto"
          alt="The Edit 3D Print page showing the new filament cost."
          src="./assets/release_filament_cost_8b69eeeb49b59.png"
        />
      </div>
      <div fxFlex="grow">
        <p>
          To support the cost calculation, the filament needs to have both an
          Initial Weight and a Purchase Price, from which the price-per-gram
          will be calculated. The Filament's Purchase Price now only accepts
          numbers. Any previously saved "Purchase Price" which was not numeric
          have been moved to a "Purchase Notes" section.
        </p>
        <p>
          You can now set your <strong>Preferred Currency</strong> in the
          Settings page (click User Picture -> Settings). The selected currency
          will be used throughout the application.
        </p>
      </div>

      <h3 id="v1.16.4">1.16.4 - Android App Released!</h3>
      <p>
        3D Print Log now has an Android App! Download the
        <a
          href="https://play.google.com/store/apps/details?id=com.hoffmanengineering.printlog"
          >3D Print Log App from the Google Play Store</a
        >, and start logging your prints and filament usage from your mobile
        device!
      </p>
      <p>
        Since this is the initial release, we would appreciate it if you left a
        review and provided feedback about the app. Thank you!
      </p>
      <p>
        The iOS app is still under development and should be available shortly,
        so keep checking back.
      </p>

      <h3 id="v1.16.3">1.16.3 - Display Name Bug Fix</h3>
      <p>
        Fixed a small bug where new users with long names were receiving errors
        when logging in.
      </p>

      <h3 id="v1.16.2">1.16.2 - Support Cura 5 Beta</h3>
      <p>
        The <strong>3D Print Log Uploader Plugin for Cura</strong> has been
        updated to version 2.0.2. This version adds support for the new Cura 5
        Beta, as well as adding in new settings to control the "Would you like
        to send to 3D Print Log" prompt.
      </p>
      <p>
        You can install v2.0.2 of the plugin via the
        <a
          href="https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader"
          >Ultimaker Cura Marketplace</a
        >
        . Alternatively, you can download the
        <a
          href="https://github.com/ChristopherHoffman/3d-print-log-cura-plugin/releases"
          >Latest Release from Github</a
        >
        and drag/drop into Cura to install.
      </p>

      <h3 id="v1.16.1">1.16.1 - Security Patch</h3>
      <p>Security updates and performance improvements.</p>

      <h3 id="v1.16.0">1.16.0 - Print List Enhancements</h3>
      <p>
        The Print List has been updated to have customizable columns. You can
        select which columns are visible using the new Gear icon
        <mat-icon inline="true">settings</mat-icon> on the Print List page.
      </p>
      <h4>Full List of Changes:</h4>
      <ul>
        <li>
          <Strong>Hide/Show Print List Columns</Strong> - Change which columns
          are visible on the Print List by clicking the Gear Icon -> Change
          Table Layout.
        </li>
        <li>
          <strong>New Print List Columns</strong> - Added new columns to the
          Print List, make them visible by selecting them in the new Change
          Table Layout menu:
          <ul>
            <li>
              <strong>Image (Medium), Image (Large)</strong> - Displays the
              print's image in a medium/large thumbnail.
            </li>
            <li>
              <strong>Start Time, Start Date/Time</strong> - Displays the
              print's start time, or the print's start date and time as a single
              column.
            </li>
            <li>
              <strong>End Date, End Time, End Date/Time</strong> - Displays the
              print's end date, end time, or end date and time (if the print has
              an actual or estimated Print Time)
            </li>
          </ul>
        </li>

        <li>
          <Strong>Items Per Page settings are saved</Strong> - On the Print
          List, Printer List, and Filament List pages, when the
          <strong>Items Per Page</strong> is changed. It is remembered by the
          browser, and will be used when the page is reloaded.
        </li>
      </ul>

      <h3 id="v1.15.2">1.15.2 - Security Patch</h3>
      <p>Security updates and performance improvements.</p>

      <h3 id="v1.15.1">1.15.1 - Print Time Rounding Bug Fix</h3>
      <p>
        Fixed an issue where some print times were adding an extra day due to
        incorrect rounding.
      </p>

      <h3 id="v1.15.0">1.15.0 - Print Start and Completed Times</h3>
      <div fxLayout="column">
        <div fxFlex="grow">
          <p>
            Print times have been overhauled. The Edit Print page can now record
            the start time of the print, and the estimated completed date/time
            will be displayed based on the estimated print time. The actual
            completed date/time can be set, which will automatically calculate
            the actual print time.
          </p>
        </div>
        <div fxFlex>
          <img
            class="fade-in"
            style="display: block; max-width: 90%; margin-right: auto"
            alt="The Edit 3D Print page showing the new Start and Completed date and time fields."
            src="./assets/release_1-15-0_PrintDateTimes_e0cb4d1e406944.png"
          />
        </div>

        <h3 id="v1.14.1">1.14.1 - Performance Improvements</h3>
        <p>Security updates and performance improvements from dependencies.</p>

        <h3 id="v1.14.0">1.14.0 - Gcode Parsing for all Slicers</h3>
        <p>
          3D Print Log now has the ability to add prints from any gcode file.
          Previously only a handful of slicers were supported, but now if a
          supported parser is not available, then the gcode is analyzed to
          determine print information.
        </p>
        <p>
          Find the <strong>Add Print from Gcode</strong> on the
          <strong>Print List</strong>.
        </p>

        <h3 id="v1.13.0">1.13.0 - Favorite Filaments</h3>
        <p>
          As your filament roll collection grows, it can be difficult to find a
          particular roll in your list. Filament can now be marked as a
          "favorite" by clicking on the star in the filament list. The filament
          list can be filtered to only show favorite filament. The filament list
          can also be filtered to only show currently loaded filament.
        </p>
        <h4>Full List of Changes:</h4>
        <ul>
          <li>
            <Strong>Favorite Filaments</Strong> - Click the Star Icon in the
            Filament List to add that roll to your "favorites".
          </li>
          <li>
            Filament List can now be filtered to show only favorite filaments.
          </li>
          <li>
            Filament List can now be filtered to show only currently loaded
            filaments.
          </li>
          <li>
            Filament List More (...) menu includes a "Mark as Empty" option,
            which will automatically set that roll's available filament to 0g
            and set the roll as "inactive".
          </li>
          <li>Loading indicator added to Filament List.</li>
          <li>Improved accessibility on Print List and Filament List pages.</li>
        </ul>

        <h3 id="v1.12.8">1.12.8 - Bug Fixes</h3>
        <p>Fixed an issue with image centering in Chrome browsers.</p>

        <h3 id="v1.12.7">1.12.7 - Loading indicators on Print Search</h3>
        <p>Added loading indicators on the print list search.</p>

        <h3 id="v1.12.6">1.12.6 - Dependency updates and bug fixes.</h3>
        <p>Security updates and performance improvements from dependencies.</p>

        <h3 id="v1.12.5">1.12.5 - Filter Prints/Analytics by Printers</h3>
        <p>
          The Print List and Analytics pages can now be filtered by one or more
          printers.
        </p>

        <h3 id="v1.12.4">1.12.4 - Snapshots from Cura</h3>
        <div fxLayout="column">
          <div fxFlex="grow">
            <p>
              The <strong>3D Print Log Uploader Plugin for Cura</strong> as been
              updated to version 1.2.1. This version adds an "Include Snapshot"
              option which will automatically send a screenshot from Cura as the
              print's image.
            </p>
            <p>
              You can install v1.2.1 of the plugin via the
              <a
                href="https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader"
                >Ultimaker Cura Marketplace</a
              >
              . Alternatively, you can download the
              <a
                href="https://github.com/ChristopherHoffman/3d-print-log-cura-plugin/releases"
                >Latest Release from Github</a
              >
              and drag/drop into Cura to install.
            </p>
            <p>
              This release also fixes a discrepancy between the Total Filament
              Used statistic in Analytics, and the Total Filament Used in your
              Profile. Both are now calculated correctly.
            </p>
          </div>
          <div fxFlex>
            <img
              class="fade-in"
              style="display: block; max-width: 90%; margin-right: auto"
              alt="The Add 3D Print screen with the cura snapshot as the print image."
              src="./assets/release_curasnapshot_40d0a079b.png"
            />
          </div>
        </div>

        <h3 id="v1.12.3">1.12.3 - Printers keep track of Loaded Filament</h3>
        <p>
          Printers now keep track of what filament rolls were last used. These
          are considered the printer's <strong>Loaded Filament</strong>. When
          you start to add a new print, the selected printer's
          <strong>Loaded Filament</strong> will automatically populate. And when
          the new print is saved, it'll automatically add the print's selected
          filament as that printer's currently loaded filament.
        </p>
        <p>
          A printer's currently loaded filament is displayed on the
          <strong>Printer List</strong>, and the filament's current printer is
          displayed on the <strong>Filament List</strong>.
        </p>
        <p>
          See the <a routerLink="/docs/printers">Printer Documentation</a> for
          more information on managing loaded filament.
        </p>
        <h4>Full List of Changes:</h4>
        <ul>
          <li>
            New Prints will automatically populate the
            <strong>Filament Usage</strong> section based on the selected
            printer's <strong>Loaded Filament</strong>.
          </li>
          <li>
            Printer List displays the printer's Loaded Filament.
            <ul>
              <li>
                Printer List contains a ...more menu which allows for quick
                unloading of filament.
              </li>
            </ul>
          </li>
          <li>
            Editing a Printer allows you to manager that printer's
            <strong>Loaded Filament</strong>.
          </li>
          <li>
            Filament List display which printer that filament is currently
            loaded in.
          </li>
          <li>
            Filament List has a new menu option to navigate to the edit page for
            printer it's currently loaded in.
          </li>
          <li>
            Filament List will now display the Inactive badge for inactive
            filament rolls.
          </li>
          <li>
            Searching on the Print List and Filament List has been improved.
            Search will look for words separated by spaces, and search for exact
            text by enclosing words with quotes. Searching for filament material
            type has been added.
          </li>
        </ul>

        <h3 id="v1.12.1">1.12.1 - Ability to Delete Comments</h3>
        <p>
          You can now delete your own comments. The owner of a print can also
          moderate comments on their prints and have the ability to remove
          comments from other users.
        </p>

        <h3 id="v1.12.0">
          1.12.0 - Customize Settings with 3D Print Log Cura Plugin v1.2.0
        </h3>
        <p>
          The <strong>3D Print Log Uploader</strong> plugin for Ultimaker Cura
          has been updated to v1.2.0. You can now select any combination of Cura
          settings to record, so you can log the information that is important
          to you.
        </p>
        <h4>Plugin Changes:</h4>
        <ul>
          <li>
            Customize the list of settings recorded. Settings Menu is accessible
            inside of Cura through Extensions -> 3D Print Log -> Configure
            Settings to Log
          </li>
          <li>Added option to log Cura Profile Name.</li>
          <li>Added option to log selected filament names and materials.</li>
          <li>Added support for Cura 4.9.</li>
        </ul>
        <p>
          You can install v1.2.0 of the plugin via the
          <a
            href="https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader"
            >Ultimaker Cura Marketplace</a
          >
          . Alternatively, you can download the
          <a
            href="https://github.com/ChristopherHoffman/3d-print-log-cura-plugin/releases"
            >Latest Release from Github</a
          >
          and drag/drop into Cura to install.
        </p>

        <h3 id="v1.11.1">1.11.1- Homescreen Icons and Security Updates</h3>
        <p>
          A new homescreen icon was added for IOs/Android homescreen links.
          Website was updated with the latest security patches of dependencies.
        </p>

        <h3 id="v1.11.0">1.11.0- Deleting User Accounts</h3>
        <p>
          You are in control of your data, so now you can choose to delete your
          3D Print Log account and all associated data. If you wish to delete
          your account, you can find the new options under
          <strong>Delete Account</strong> on your
          <a routerLink="/settings">Settings Page</a>. After a 24 hour waiting
          period, your account and all prints, filament, printers, etc, will be
          permanently deleted from the website.
        </p>

        <h3 id="v1.10.0">1.10.0- Duplicate Filaments</h3>
        <p>
          You can now duplicate an existing filament roll. Click the ... menu on
          the
          <a routerLink="/filament">Filament List</a> and select "Duplicate".
        </p>

        <h3 id="v1.9.0">1.9.0- OctoPrint Integration</h3>
        <p>
          3D Print Log now has an OctoPrint Integration! 3D Print Log can
          receive information from Octoprint in order to create and update print
          statuses, print time, and filament usage. It will also save pictures
          from the camera on success/failure. Visit the
          <a routerLink="/docs/octoprint-webhook"
            >3D Print Log OctoPrint Webhook Docs</a
          >
          for information on how to set up the integration.
        </p>

        <h3 id="v1.8.0">
          1.8.0- Filament Measurement by Length and Weight, Gcode File Names
        </h3>
        <h4>Filament Measurement by Length</h4>
        <p>
          Many slicers only report filament used in length, so now Filament
          Usage can now be recorded by Weight (in grams) or by Length (in
          meters). Simply add a Filament Usage to the print, and change the new
          <strong>Measure</strong> dropdown to select the measure type you'd
          like to use.
        </p>
        <p>
          Both options will update the filament roll's Weight Remaining. When
          you change the measurement type, it'll be saved as your default type,
          so future Filament Usage will default to Weight or Length depending on
          the last one you selected.
        </p>
        <h4>Print File Names</h4>
        <p>
          A <strong>File Name</strong> field has been added to the Print, so you
          can record the name of the gcode file generated. This will also be
          useful in the upcoming <strong>Octoprint Integration</strong> (coming
          soon).
        </p>
        <h4>Multiple "Other" Filament Usage now allowed</h4>
        <p>
          Previously you could only have one non-tracked "other" filament
          recorded on a print. Now you can add as many "other" filament usage
          you want.
        </p>

        <h3 id="v1.7.3">1.7.3- Filament Analytics Bug Fix</h3>
        <p>
          Fixed a bug where filament usage was not correctly reported on the
          analytics page.
        </p>

        <h3 id="v1.7.2">
          1.7.2- Remaining Filament Rounding and Security Updates
        </h3>
        <p>
          A minor update which rounds the Filament List's
          <strong>Remaining Filament</strong> column to the nearest gram. The
          websites dependencies were also updated to the latest versions, which
          includes security updates and performance improvements.
        </p>

        <h3 id="v1.7.1">1.7.1- Delete Filament and Filament Search Dialog</h3>
        <p>
          Selecting a roll of filament for a print has now gotten easier. The
          Print's Filament Usage now has a
          <strong>Select Filament</strong> button which will open a filament
          search dialog. This lets you search for a specific roll of filament.
          In addition, you can now delete a filament if it has not been used in
          a Print from the Filament List.
        </p>
        <p>Full list of changes:</p>
        <ul>
          <li>
            Added a new Search Filament dialog in the Edit Print page to make
            selecting filament for a print easier.
          </li>
          <li>
            Added the ability to delete a filament from the Filaments list page.
          </li>
          <li>
            Fixed a bug where the Filament Color was not being saved until it
            was interacted with.
          </li>
          <li>
            Various enhancements to accessibility and keyboard navigation on the
            Filament pages.
          </li>
        </ul>

        <h3 id="v1.7.0">1.7- Filament Roll Tracking 🎉</h3>
        <p>
          Filament tracking is here! Now you can add rolls of filament, and 3D
          Print Log will automatically keep track of how much filament is
          remaining on the roll. See colors, print temperatures, and record
          brand and purchasing information for all your rolls of filament.
        </p>
        <ul>
          <li>
            Added new <a routerLink="/filament">Filament</a> page, where you can
            manage your rolls of filament
          </li>
          <li>
            Updated the <a routerLink="/prints">Print Details</a> page to have a
            <strong>Filament Usage</strong> section for assigning a roll of
            filament to a print.
          </li>
        </ul>
        <p>
          See the <a routerLink="/docs/filaments">Filament Documentation</a> and
          <a routerLink="/docs/prints">Prints Documentation</a> pages for more
          info. <br />Happy Printing!
        </p>

        <h3 id="v1.6.1">1.6.1 - Bug fix: Filament Rounding issue</h3>
        <p>
          Fixed an issue where a print was unable to be saved due to rounding
          issues when converting Estimated/Actual Filament Usage from grams to
          mg.
        </p>

        <h3 id="v1.6">1.6 - New Feature: Add Print From Gcode</h3>
        <p>
          You can now add a print by importing settings from a gcode file. The
          <strong>Add Print From Gcode</strong> option can be found in the
          dropdown next to
          <strong>Add New Print <mat-icon inline>expand_more</mat-icon></strong>
          in the <a routerLink="/prints">Print List</a>. Currently only gcode
          from Prusa Slicer is supported, but more slicers will be supported
          soon. Please <a routerLink="/feedback">Send a Feedback</a> if you are
          willing to share a gcode example file for a slicer that is not yet
          supported.
        </p>

        <h3 id="v1.5.4">1.5.4 - User Profile Print Enhancements</h3>
        <p>
          Added better scrolling behavior when loading prints in a user's
          profile.
        </p>

        <h3 id="v1.5.3">1.5.3 - Cura Plugin Filament Usage Validation</h3>
        <p>
          Fixed an error that prevented prints from saving when Cura sent
          fractional filament usage amounts.
        </p>

        <h3 id="v1.5.2">1.5.2 - Print Form Validation</h3>
        <p>
          You will now see more detailed error messages on the New/Edit Print
          form, if the print you are saving is invalid or missing required
          fields.
        </p>

        <h3 id="v1.5.1">1.5.1 - Bug Fixes</h3>
        <p>
          Fixed a few minor bugs, including an issue where sometimes filament
          usage sent by the Cura plugin was incorrectly reported and prevented
          the print from saving.
        </p>

        <h3 id="v1.5.0">1.5.0 - 3D Print Log Cura Plugin v1.1.0</h3>
        <p>
          The <strong>3D Print Log Uploader</strong> plugin for Ultimaker Cura
          is being updated to v1.1.0.
        </p>
        <ul>
          <li>Added support for Cura 4.8.</li>
          <li>Added support for multiple extruders.</li>
          <li>
            Fixed bug where slicer settings would not correctly log settings the
            user changed without saving the profile.
          </li>
          <li>Plugin will only try and log files that have been sliced.</li>
        </ul>
        <p>
          You can install this plugin via the
          <a
            href="https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader"
            >Ultimaker Cura Marketplace</a
          >
          . Alternatively, you can download the
          <a
            href="https://github.com/ChristopherHoffman/3d-print-log-cura-plugin/releases"
            >Latest Release from Github</a
          >
          and drag/drop into Cura to install.
        </p>

        <h3 id="v1.4.1">1.4.1 - Performance Improvements</h3>
        <p>
          Updated website's dependencies to the latest versions, which includes
          security patches and performance improvements. Thanks for using 3D
          Print Log!
        </p>

        <h3 id="v1.4.0">1.4.0 - CSV Exporting and Release Notes</h3>
        <h4>CSV Exporting</h4>
        <p>
          This is your data, you should be able to use it how you like! Whether
          you want to backup your data to your computer, or import it into a
          spreadsheet for your own analytics, 3D Print Log has you covered. You
          can now export all your prints as a .csv (comma separated values)
          file. Visit your
          <a [routerLink]="['/settings']">Settings</a> and click
          <strong>Export</strong> to save your print report.
        </p>
        <h4>Release Notes</h4>
        <p>
          As you may have noticed, we now have a
          <a [routerLink]="['/docs/release-notes']">Release Notes</a> page. This
          page will document all the changes happening to the application. Check
          back here for information about new features and fixes for 3D Print
          Log.
        </p>

        <h3 id="v1.3.0">1.3.0 - Print List Updates</h3>
        <p>
          This update contains a variety of updates to the
          <a [routerLink]="['/prints']">Prints</a> screen.
        </p>
        <h4>Added Print Time Column</h4>
        <p>
          The Print List now displays the Print Time. It will display the
          <strong>Actual Print Time</strong> if one is saved, otherwise it will
          show the <strong>Estimated Print Time*</strong>, with an * to indicate
          it is estimated.
        </p>
        <h4>Quickly change a Print's Status through the ... menu</h4>
        <p>
          The ... menu on the print list now has a "Change Print Status" option,
          which will let you set a new status for a print without having to
          click into the full edit menu.
        </p>

        <h3 id="v1.2.0">1.2.0 - Deleting Prints, Cura Plugin Documentation</h3>
        <h4>Deleting Prints</h4>
        <p>
          Mistakes happen. Sometimes you add a print multiple times, or forget
          that you already added a specific print. In v1.2.0, you can delete a
          print (and all it's related images and comments) from the ... menu on
          the
          <a [routerLink]="['/prints']">Print List</a>. Selecting the
          <strong>Delete</strong> option will ask for confirmation, and once
          confirmed it will be deleted permanently.
        </p>
        <h4>Cura Plugin Documentation</h4>
        <p>
          <a routerLink="/docs/cura-plugin">Documentation is now available</a>
          for the Cura Plugin. 🎉
        </p>

        <h3 id="v1.1.0">1.1.0 - Cura Plugin and Print Comments</h3>
        <h4>Cura Plugin Now Available 🎉</h4>
        <p>
          The <strong>3D Print Log Uploader</strong> plugin for Ultimaker Cura
          lets you add new prints directly from Cura.
        </p>
        <p>
          You can install this plugin via the
          <a
            href="https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader"
            >Ultimaker Cura Marketplace</a
          >. Alternatively, you can download the
          <a
            href="https://github.com/ChristopherHoffman/3d-print-log-cura-plugin/releases"
            >Latest Release from Github</a
          >
          and drag/drop into Cura to install.
        </p>
        <h4>Print Comments</h4>
        <p>
          Users can now leave comments on 3D Prints. You can control whether or
          not comments are allowed when editing a print. Public prints will
          allow for comments by any 3D Print Log user, while private prints will
          only let you leave comments. If you share your print with other users,
          this is a great way to have a conversation about the print.
        </p>
      </div>
    </div>
  </div>
