---
slug: email-notifications
title: Email Notifications | 3D Print Log Docs
description: The emails 3D Print Log sends, when each one arrives, and how to turn any of them off from Settings or straight from the email.
navLabel: Email Notifications
group: features
order: 70
mode: reference
updated: 2026-10-05
related: [achievements, analytics, printers]
---

## Email Notifications

3D Print Log sends a small number of emails about your own account activity. Each kind can be
turned off on its own, and none of them are advertising for other companies.

### Where we send them {#address}

We email the address on the account you sign in with. You never type it into 3D Print Log, and
we only email it once your sign-in provider has verified it. Your current address is shown at
the top of the **Email** section in [Settings](/settings).

Before any of these emails start, the app shows you a one-time notice explaining them, with a
link to the settings. Until you have seen that notice, we send none of them.

### What we send {#what-we-send}

| Email | When it arrives |
| --- | --- |
| **Onboarding tips** | A welcome shortly after you sign up, then short tips on days 2, 5 and 10: connecting your printer or slicer so prints log themselves, logging your first print, and what to try next. A tip is skipped if you've already done what it suggests. |
| **Monthly recap** | On the 1st of each month at 9am your time, a summary of the month before: prints, success rate, print time, filament used, your busiest printer and the badges you earned. Only sent if you logged at least one print that month. |
| **Printer stopped reporting** | When a printer that normally logs prints on its own (through OctoPrint, Klipper, a slicer uploader or an API key) has sent nothing for about two weeks, with a link to the setup guide for that connection. |

"Your time" is the time zone in your settings, or US Central time if you haven't set one. We
never send more than one of these emails every few days, apart from the onboarding welcome.

Account and security messages, such as a notice about account deletion, are not covered by
these settings and are always sent.

### Turning emails off {#turning-off}

- **In the app:** open [Settings](/settings) and find **Email**. The top switch turns off
  every email on this page; the switches under it turn off one kind at a time.
- **From an email:** every email has an **Unsubscribe** link that turns off that kind of email
  in one click, without signing in. The **Manage email preferences** link opens all of the
  switches. Your email app may also show its own unsubscribe button next to the sender, which
  does the same thing.

Links in an email are tied to your account. **Unsubscribe** links don't expire. **Manage email
preferences** links expire after 60 days; if one no longer works, sign in and use Settings
instead.

### Privacy {#privacy}

Emails are sent through Amazon Web Services. If an address bounces or someone marks one of our
emails as spam, we stop emailing that address and keep a one-way fingerprint of it so it stays
stopped, even after the account is deleted. The details are in the
[Privacy Policy](/docs/privacy-policy#email).
