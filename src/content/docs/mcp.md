---
slug: mcp
title: Connect an AI Assistant (MCP) | 3D Print Log Docs
description: Connect Claude or ChatGPT to your 3D Print Log data via the Model Context Protocol. Read your prints, printers, and materials, and log or update prints for you.
navLabel: Connect an AI Assistant
group: integrations
order: 20
mode: how-to
updated: 2026-09-02
related: [prints]
constants:
  mcpEndpoint: 'https://api.3dprintlog.com/mcp'
  mcpClientId: uzxvtpefYIrWoYbaJteoRzZtIYw4wP7j
  claudeCodeCommand: 'claude mcp add --transport http printlog ${this.mcpEndpoint} --client-id ${this.mcpClientId} --callback-port 8400'
---

<article class="docs-mcp">
  <h2>Connect an AI Assistant (MCP)</h2>

  <p>
    3D Print Log can connect to AI assistants such as
    <strong>Claude</strong> and <strong>ChatGPT</strong> using the
    <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener"
      >Model Context Protocol (MCP)</a
    >. Once connected, the assistant can read your prints, printers, and
    material inventory. With your permission, it can also log and update prints
    and manage your projects, printers, and materials. That lets you ask things
    like &ldquo;how much PLA do I have left?&rdquo; or say &ldquo;log the print
    I just finished.&rdquo;
  </p>

  <h3>What the assistant can and can&rsquo;t do</h3>
  <ul>
    <li>
      <strong>Reads and writes your print data.</strong> The assistant can view
      your prints, printers, and materials. With your permission, it can also
      log new prints, edit them, and manage your projects, printers, and
      material inventory.
    </li>
    <li>
      <strong>It can&rsquo;t delete anything.</strong> There is no way for the
      assistant to delete a print, project, or spool. Its changes are limited to
      creating and editing.
    </li>
    <li>
      <strong>Your data only.</strong> It can only ever see or change records
      you created, never another user&rsquo;s prints, even public ones.
    </li>
    <li>
      <strong>No photos, comments, or files.</strong> Only structured data
      (titles, statuses, material usage, dates, and stats) is shared.
    </li>
    <li>
      <strong>It won&rsquo;t touch the machine itself.</strong> The assistant
      works on your records, not your hardware: it can&rsquo;t start, stop, or
      send anything to a printer. Logging a print records what happened, and it
      never changes which filament is currently loaded on a printer. You still
      load and unload spools yourself.
    </li>
    <li>
      <strong>Print settings only where you saved them.</strong> Layer height,
      speeds, and temperatures aren&rsquo;t separate fields; they live in a
      print&rsquo;s notes. If you imported the print through a
      <a routerLink="/docs/slic3r-uploader">slicer integration</a>, that summary is
      saved for you and the assistant can read it back. For a print logged by
      hand with no such notes, the assistant has nothing to read and can&rsquo;t
      answer.
    </li>
  </ul>

  <h3>Questions you can ask</h3>
  <p>
    You don&rsquo;t need to learn any commands; just ask in your own words.
    These are only examples to give you a feel for it. Anything you could work
    out from your own prints, printers, and inventory is fair game.
  </p>
  <ul>
    <li>
      <strong>Your prints.</strong> &ldquo;How many prints did I finish last
      year, and how many failed?&rdquo; You can search by name or project
      (&ldquo;what was that soap dish I printed?&rdquo;), and ask what a print
      used, including each color of a multi-color print.
    </li>
    <li>
      <strong>Your materials.</strong> &ldquo;What blue PLA do I have, and where
      is each spool stored?&rdquo; Searches match whole words, so
      <em>PLA</em> also finds <em>PLA+</em> and <em>PLA (Polylactic Acid)</em>,
      and <em>blue</em> also finds <em>Light Blue</em>.
    </li>
    <li>
      <strong>Enough for a print.</strong> &ldquo;I have a 300&nbsp;g model. Do
      I have blue PLA for it?&rdquo; The assistant reports whether a single
      spool covers it, or only several spools combined, which would mean
      swapping filament mid-print.
    </li>
    <li>
      <strong>Your printers.</strong> &ldquo;What&rsquo;s loaded on my Bambu
      right now?&rdquo; and per-printer stats such as success rates and total
      print time.
    </li>
    <li>
      <strong>The settings you used.</strong> &ldquo;What layer height and
      speeds did I use on the soap dish?&rdquo; This is answerable for prints
      whose notes hold a slicer summary (see the limitation above).
    </li>
  </ul>

  <h3>Changes it can make for you</h3>
  <p>
    With your permission, the assistant can also make changes for you. It always
    acts as you, on your own data. Again, the list below is a starting point
    rather than a menu. If it fits within the limits above, it&rsquo;s worth
    asking for.
  </p>
  <ul>
    <li>
      <strong>Log a finished print.</strong> &ldquo;Log that Benchy I just
      finished on the Bambu. It used about 12&nbsp;g of the gray PLA.&rdquo; It
      records the status, print time, notes, and material used, and can file the
      print under a project. A multi-color print can list what each material
      contributed, and you can give either the amount you measured or the
      slicer&rsquo;s estimate.
    </li>
    <li>
      <strong>Edit a print.</strong> &ldquo;Mark that print a partial success
      and note that the top layer lifted.&rdquo; You can update the status,
      notes, time, material usage, or which project a print belongs to.
    </li>
    <li>
      <strong>Set who can see a print.</strong> &ldquo;Make that print
      public.&rdquo; New prints follow your account default unless you say
      otherwise, and you can change a print to private, unlisted, or public
      later.
    </li>
    <li>
      <strong>Organize projects.</strong> &ldquo;Start a project called Desk
      Organizer&rdquo; or &ldquo;mark the planter project complete.&rdquo;
      Create and rename projects and set whether each one is private, unlisted,
      or public.
    </li>
    <li>
      <strong>Add a printer.</strong> &ldquo;Add my new Bambu Lab X1
      Carbon.&rdquo; It can also fill in the details you mention (nozzle size,
      bed dimensions, heated bed or chamber), edit them later, or retire a
      printer you no longer use.
    </li>
    <li>
      <strong>Add material.</strong> &ldquo;Add a new 1&nbsp;kg spool of
      Prusament Galaxy Black PLA.&rdquo; New material goes straight into your
      inventory. This isn&rsquo;t just filament: resin and powder work too,
      along with details like brand, color, finish, price, and where you store
      it.
    </li>
    <li>
      <strong>Update material details.</strong> &ldquo;Move the blue PLA to Dry
      Box B&rdquo; or &ldquo;mark the Galaxy Black as a favorite.&rdquo; Storage
      location, color, temperatures, and purchase details can all be corrected
      after the fact.
    </li>
    <li>
      <strong>Correct what&rsquo;s left.</strong> &ldquo;I weighed the gray PLA.
      It&rsquo;s actually 640&nbsp;g now.&rdquo; Adjust a spool&rsquo;s
      remaining amount up or down. It can&rsquo;t go below empty or above what
      the spool started with, so if a correction is refused, check the starting
      amount on the spool itself.
    </li>
    <li>
      <strong>Retire or restore a spool.</strong> &ldquo;Retire the empty black
      roll&rdquo; hides a finished spool from your inventory; you can bring it
      back later.
    </li>
  </ul>
  <p>
    Most of the value comes from combining these in one go, rather than doing
    them one at a time. &ldquo;Log the three prints I finished this weekend,
    file them under a new Desk Organizer project, and tell me how much filament
    they used between them&rdquo; is a single request, and the assistant works
    out the steps. If you&rsquo;re not sure whether something is possible, just
    ask for it and see.
  </p>
  <p class="hint">
    Logging is safe to repeat: asking twice for the same print won&rsquo;t
    create a duplicate. Because a
    <a routerLink="/docs/slic3r-uploader">slicer integration</a> may already have
    imported a print for you, the assistant will usually check before logging
    one itself.
  </p>

  <h3>What you&rsquo;ll need</h3>
  <p>Two values. Your AI client asks for both.</p>
  <dl class="connection-details">
    <dt>MCP endpoint URL</dt>
    <dd>
      <code>{{ mcpEndpoint }}</code>
    </dd>
    <dt>OAuth Client ID</dt>
    <dd>
      <code>{{ mcpClientId }}</code>
    </dd>
  </dl>
  <p class="hint">
    The Client ID is the same for everyone and is safe to share. It identifies
    the 3D Print Log connector, not you. There is no client secret. You still
    sign in yourself, and the assistant only ever sees your own data.
  </p>

  <h3>Connect to Claude</h3>
  <ol>
    <li>
      In Claude (web or desktop), open
      <strong>Settings → Connectors</strong> and choose
      <strong>Add custom connector</strong>.
    </li>
    <li>Paste the <strong>MCP endpoint URL</strong> above.</li>
    <li>
      Open <strong>Advanced settings</strong> and paste the
      <strong>OAuth Client ID</strong>. Leave the client secret blank.
    </li>
    <li>
      When prompted, <strong>sign in to 3D Print Log</strong> and
      <strong>authorize</strong> access to your print data.
    </li>
    <li>
      Start a chat and ask about your prints, printers, or filament, or ask
      Claude to log or update a print. Claude will use the connector when
      relevant.
    </li>
  </ol>

  <h3>Connect to Claude Code</h3>
  <p>Run this, then use <code>/mcp</code> to sign in:</p>
  <pre class="endpoint"><code>{{ claudeCodeCommand }}</code></pre>
  <p class="hint">
    If port 8400 is already in use on your machine, any port from
    <strong>8400 to 8405</strong> will work.
  </p>

  <h3>Connect to ChatGPT</h3>
  <ol>
    <li>
      In ChatGPT, open the custom connector / app setup and choose to add an MCP
      server.
    </li>
    <li>
      Enter the <strong>MCP endpoint URL</strong>, and the
      <strong>OAuth Client ID</strong> where prompted.
    </li>
    <li>
      Complete the sign-in and consent prompt to grant access to your print
      data.
    </li>
  </ol>

  <h3>Managing connected assistants</h3>
  <p>
    You can review and disconnect connected AI assistants at any time from your
    <a routerLink="/settings">Settings</a> page under
    <strong>Connected AI Agents</strong>. Disconnecting immediately revokes
    access for all connected assistants.
  </p>
</article>
