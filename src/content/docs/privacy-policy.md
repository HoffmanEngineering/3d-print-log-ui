---
slug: privacy-policy
title: Privacy Policy | 3D Print Log Docs
description: How 3D Print Log collects, uses, and protects your data. Read the full privacy policy for the 3D Print Log web and mobile apps.
navLabel: Privacy Policy
group: about
order: 30
mode: reference
updated: 2026-10-10
related: [about, contact, terms-of-service]
---

# Privacy Policy for 3D Print Log

Last Updated: Oct 10, 2026

At 3D Print Log, accessible from https://www.3dprintlog.com, one of our main
priorities is the privacy of our visitors. This Privacy Policy document describes
the types of information that are collected and recorded by 3D Print Log and how
we use it.

3D Print Log is operated by **Hoffman Technologies, LLC**, a Florida limited liability company,
which is responsible for the personal data described here.

If you have additional questions or require more information about our Privacy
Policy, do not hesitate to [contact us](/docs/contact).

## Information in Your Account {#account-data}

When you create an account and use 3D Print Log, we store:

- **Account details:** your email address and whether it has been verified, copied from our
  sign-in provider, and any display name, bio, profile picture or cover image you add.
- **Your print records:** prints, printers, materials, projects, maintenance entries, notes,
  comments, photos and attached files, and the slicer details that integrations send with a print.
- **Settings:** your preferences, such as currency and electricity rate.
- **Subscription status:** if you subscribe to Pro, your Stripe customer and subscription
  identifiers and whether your subscription is active. Your card details go to Stripe and never
  reach us.
- **Devices and integrations:** push notification tokens for the Android app, API keys you create
  (we store only a one-way hash of each key), and which AI assistants you have connected.
- **Feedback** you send us, including through an AI assistant.

We use this information to provide the service: to show you your records, calculate material
usage, costs and statistics, sync your devices and integrations, send the email described below,
process your subscription, and answer support requests. We do not sell it.

Prints, projects and profiles are private unless you choose to make them public. Public items can
be seen by anyone, including search engines.

## Service Providers {#service-providers}

We use these companies to run 3D Print Log. Each processes personal data only to provide its part
of the service:

| Provider | What it does | Data it handles |
| --- | --- | --- |
| Okta (Auth0) | Sign-in | Email address, password or social sign-in details, sign-in records |
| Microsoft Azure | Hosting, database, file storage, Application Insights | Everything in your account, plus usage and error data |
| Stripe | Pro subscription payments | Payment details, email address, subscription status |
| Amazon Web Services (SES) | Sending email | Email address and message content |
| Google (Firebase Cloud Messaging) | Android push notifications | Device token and notification content |
| Google (Analytics, AdSense) | Site analytics and ads | Usage data and cookies, as described below |

## AI Assistants {#ai-assistants}

You can connect AI assistants, such as Claude (by Anthropic) and ChatGPT (by OpenAI), to your
account through our MCP connector. Nothing is shared until you connect one and sign in to approve
it.

- **What the assistant can see:** the records in your own account (prints, printers, materials,
  projects and statistics), when it calls a tool to answer your request. It cannot see other
  users' private data.
- **What it can change:** it can create and update prints, printers, materials and projects, and
  send us feedback, when you ask it to. It cannot delete anything.
- **Where that data goes:** information an assistant reads from your account is sent to the
  company that provides the assistant, and is handled under that company's terms and privacy
  policy, not ours.
- **Disconnecting:** you can review and disconnect connected assistants at any time in
  [Settings](/settings), under **Connected AI Agents**. Disconnecting revokes their access
  immediately.

## Keeping and Deleting Your Data {#retention}

We keep your account data for as long as your account exists.

- **Deleting your account:** you can deactivate your account in [Settings](/settings). All of your
  data, including photos and files, is deleted 24 hours after deactivation, and your sign-in
  account is removed from Auth0.
- **Exceptions:** the email suppression fingerprint described below, and records Stripe must keep
  about past payments under its own legal obligations.
- **Analytics data** is kept for the default retention periods of Google Analytics and Azure
  Application Insights.

## Your Choices and Rights {#your-rights}

- **See and correct** your data in the app at any time.
- **Export** your prints as a CSV file from [Settings](/settings).
- **Delete** individual records in the app, or your whole account as described above.
- **Turn off email** by type in Settings or from any email.
- **Disconnect** AI assistants and revoke API keys in Settings.

For anything else, including a copy of your data or a question about how it is used, email
[hello@3dprintlog.com](mailto:hello@3dprintlog.com). Depending on where you live, you may have
further rights under local law, such as the right to object to processing or to complain to a data
protection authority.

## Log Files

3D Print Log follows a standard procedure of using log files. These files log
visitors when they visit websites. All hosting companies do this, and it is a part of
hosting services' analytics. The information collected by log files includes
internet protocol (IP) addresses, browser type, Internet Service Provider (ISP),
date and time stamp, referring/exit pages, and possibly the number of clicks.
These are not linked to any information that is personally identifiable. The
purpose of the information is for analyzing trends, administering the site,
tracking users' movement on the website, and gathering demographic information.
Our Privacy Policy was created with the help of the <a
href="https://www.privacypolicyonline.com/privacy-policy-generator/" >Privacy
Policy Generator</a >.

## Product Analytics and Usage Data

3D Print Log uses two analytics services to understand how the site is used so
we can improve it: **Google Analytics** and **Microsoft Azure Application
Insights**. These record events such as pages viewed, features used, how far you
scroll through a documentation page, performance timings, and errors
encountered, along with technical details like browser type, approximate region,
and referring page.

This data is used in aggregate to decide what to fix, document, and build next.
We do not sell it, and we do not use it to identify you personally.

### Information You Type Into Feedback

Some pages let you tell us directly whether something was useful — for example
the "Was this page helpful?" prompt at the bottom of our documentation, and the
search box within the documentation. Where these features exist, the text you
enter is sent to Application Insights along with the page it related to, so that
we can see which pages are unclear and what people were unable to find.

**Please do not enter personal or sensitive information into these boxes.** They
are intended for comments about the documentation, and anything typed into them
is stored with our analytics data rather than treated as a private message. If
you need to contact us privately, email
[hello@3dprintlog.com](mailto:hello@3dprintlog.com) or see the
[Contact](/docs/contact) page instead.

Analytics data is retained according to the default retention periods of Google
Analytics and Azure Application Insights, after which it is deleted
automatically.

## Email {#email}

3D Print Log sends a few kinds of email about your own account activity: onboarding tips after
you sign up, a monthly recap of your prints, and an alert when a printer that usually logs prints
automatically stops reporting. The [Email Notifications](/docs/email-notifications) page lists
them and when each is sent.

- **Which address.** We use the email address on the account you sign in with, copied from our
  sign-in provider (Auth0). We only email it once that provider has verified it.
- **Opting out.** Each kind of email can be turned off in Settings, or from the unsubscribe and
  manage links in every email, without signing in. Account and security messages are sent
  regardless.
- **Who sends it.** Email is delivered by **Amazon Web Services (Amazon SES)**, which processes
  your address and the message content to deliver it, and tells us whether a message was
  delivered, bounced or reported as spam.
- **What we keep.** We record which emails were sent to your account and when, so we don't send
  the same one twice, and we measure whether emails are useful by comparing a small group who
  don't receive a given email with those who do. That record is deleted with your account.
- **Suppression list.** If an address bounces permanently or is reported as spam, we keep a
  one-way cryptographic fingerprint of it (not the address itself) so we don't email it again.
  This fingerprint is kept even after you delete your account, because its only purpose is to
  make sure we never email that address again. Unsubscribing works differently: it turns off that
  kind of email for your account, you can turn it back on in Settings, and it is deleted with
  your account.

## Cookies and Web Beacons

Like any other website, 3D Print Log uses "cookies". These cookies are used to
store information including visitors' preferences, and the pages on the website
that the visitor accessed or visited. The information is used to optimize the
users' experience by customizing our web page content based on visitors' browser
type and/or other information.

For more general information on cookies, please read <a
href="https://www.privacypolicyonline.com/what-are-cookies/" >the "Cookies"
article from the Privacy Policy Generator</a >.

## Google DoubleClick DART Cookie

Google is one of a third-party vendor on our site. It also uses cookies, known
as DART cookies, to serve ads to our site visitors based upon their visit to
www.website.com and other sites on the internet. However, visitors may choose to
decline the use of DART cookies by visiting the Google ad and content network
Privacy Policy at the following URL – <a
href="https://policies.google.com/technologies/ads"
>https://policies.google.com/technologies/ads</a >

## Privacy Policies

You may consult this list to find the Privacy Policy for each of the advertising
partners of 3D Print Log.

Third-party ad servers or ad networks uses technologies like cookies,
JavaScript, or Web Beacons that are used in their respective advertisements and
links that appear on 3D Print Log, which are sent directly to users' browser.
They automatically receive your IP address when this occurs. These technologies
are used to measure the effectiveness of their advertising campaigns and/or to
personalize the advertising content that you see on websites that you visit.

Note that 3D Print Log has no access to or control over these cookies that are
used by third-party advertisers.

## Third Party Privacy Policies

3D Print Log's Privacy Policy does not apply to other advertisers or websites.
Thus, we are advising you to consult the respective Privacy Policies of these
third-party ad servers for more detailed information. It may include their
practices and instructions about how to opt-out of certain options.

You can choose to disable cookies through your individual browser options. To
know more detailed information about cookie management with specific web
browsers, it can be found at the browsers' respective websites.

## Children's Information

Another part of our priority is adding protection for children while using the
internet. We encourage parents and guardians to observe, participate in, and/or
monitor and guide their online activity.

3D Print Log does not knowingly collect any Personal Identifiable Information
from children under the age of 13. If you think that your child provided this
kind of information on our website, we strongly encourage you to
[contact us](/docs/contact) immediately and we will do our best efforts to promptly remove such information
from our records.

## Online Privacy Policy Only

This Privacy Policy applies only to our online activities and is valid for
visitors to our website with regards to the information that they shared and/or
collect in 3D Print Log. This policy is not applicable to any information
collected offline or via channels other than this website.

## Consent

By using our website, you hereby consent to our Privacy Policy and agree to our
[Terms of Service](/docs/terms-of-service).
