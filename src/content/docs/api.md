---
slug: api
title: REST API & Authentication | 3D Print Log Docs
description: Call the 3D Print Log REST API with a personal API key or an OAuth 2.0 token. Covers authentication, scopes, errors, rate limits, and the OpenAPI reference.
navLabel: REST API & Authentication
group: integrations
order: 70
mode: reference
updated: 2026-10-06
related: [mcp, klipper, octoprint-webhook]
---

## REST API & Authentication

---

Everything you see in 3D Print Log is served by an HTTP API at `https://api.3dprintlog.com`. Your own scripts, dashboards, and printer integrations can call it too: read your prints, log new ones, and manage your printers and materials. Every request acts as a single user and can only see what that user could see in the app.

If you're connecting an AI assistant such as Claude or ChatGPT, you don't need this page. Use the [MCP connector](/docs/mcp) instead. It is built for tool calling and handles sign-in for you.

A Markdown version of this page's authentication details, written for agents, is published at [/auth.md](https://www.3dprintlog.com/auth.md).

### Quick start {#quick-start}

1. Sign in and open [Personal API Keys](/api-keys).
2. Click **Create new API Key**, give it a description, and click **Submit**.
3. Copy the 32-character key right away. It can't be shown again after you leave the page.
4. Send it in the `X-Api-Key` header:

```
curl -H "X-Api-Key: YOUR_API_KEY" https://api.3dprintlog.com/api/Users/me
```

That returns your own profile. To list your ten most recent prints:

```
curl -H "X-Api-Key: YOUR_API_KEY" "https://api.3dprintlog.com/api/Prints/summary?pageNumber=1&pageSize=10"
```

Every endpoint, with its parameters and response shapes, is in the [API reference](#reference).

### Authentication {#authentication}

The REST API accepts two kinds of credentials. Both act as you, with access to your own data.

| Credential | Send it as | Best for |
| --- | --- | --- |
| Personal API key | `X-Api-Key: <key>` header, or an `api_key` query parameter | Your own scripts, printer integrations, anything that runs unattended |
| OAuth 2.0 access token | `Authorization: Bearer <token>` header | The 3D Print Log web and mobile apps, and trying requests in Swagger UI |

Requests to public data, such as a public print, need no credentials at all.

#### Personal API keys {#api-keys}

Create and delete keys on the [Personal API Keys](/api-keys) page. A key doesn't expire, so treat it like a password: anyone holding it can read and change your data.

- **Prefer the header.** The `api_key` query parameter exists for clients that can't set headers, such as some printer firmware. A key in a URL ends up in logs and browser history.
- **Revoke a key by deleting it.** Deleting it on the Personal API Keys page stops it working immediately. Use one key per device or script, so you can revoke one without breaking the others.
- **A few endpoints refuse API keys.** Registering a phone for push notifications and reading your account's email address need a signed-in session (an OAuth token). The [API reference](#reference) marks them.
- **An invalid key is rejected with `401` and the text `Invalid API Key`.** Repeated invalid keys from the same address are throttled with `429 Too Many Requests` and a `Retry-After` header.

#### OAuth 2.0 {#oauth}

Sign-in is handled by Auth0, an OpenID Connect provider. Its details are published in standard discovery documents, so OAuth libraries can configure themselves:

| Setting | Value |
| --- | --- |
| Issuer | `https://3dprintlog.auth0.com/` |
| Discovery document | [https://3dprintlog.auth0.com/.well-known/openid-configuration](https://3dprintlog.auth0.com/.well-known/openid-configuration) |
| Flow | Authorization code with PKCE (`S256`) |
| REST API audience | `https://3dprintlog.com/api` |

A token for the REST API must be requested with `audience=https://3dprintlog.com/api`. Without it, Auth0 issues a token the API doesn't accept.

There is no developer portal for registering your own OAuth application yet. To call the REST API from code you write, use a [personal API key](#api-keys). To try requests in the browser, use the **Authorize** button in [Swagger UI](https://api.3dprintlog.com/swagger), which signs you in with your normal 3D Print Log account.

#### How a client discovers this {#discovery}

A request without valid credentials gets a `401` whose `WWW-Authenticate` header points at the API's [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728) protected-resource metadata:

```
WWW-Authenticate: Bearer resource_metadata="https://api.3dprintlog.com/.well-known/oauth-protected-resource/api"
```

That document names the REST API's audience (`resource`), the authorization server (`https://3dprintlog.auth0.com/`), that tokens go in the `Authorization` header, and a link back to this page.

The MCP server has its own metadata at `https://api.3dprintlog.com/.well-known/oauth-protected-resource`. The two are kept apart on purpose: a token issued for one is rejected by the other.

### Scopes {#scopes}

Scopes limit what an OAuth token can do. Today they apply only to the [MCP connector](/docs/mcp):

| Scope | Allows | Enforced by |
| --- | --- | --- |
| `read:printdata` | Reading your prints, printers, projects, and materials | MCP read tools |
| `write:printdata` | Creating and editing prints, printers, projects, and materials. Nothing can be deleted through MCP. | MCP write tools |

An MCP token needs at least one of the two to reach the server at all, and an assistant that both reads and writes asks for both.

**The REST API doesn't check scopes.** A REST token or an API key has full access to its user's own data. The only other scopes Auth0 issues for the REST API are the standard OpenID Connect ones (`openid`, `profile`, `email`, `offline_access`), which control sign-in and refresh tokens, not data access.

#### MCP sign-in {#mcp-auth}

MCP clients connect to `https://api.3dprintlog.com/mcp` and sign in with the authorization code flow and PKCE, using the published client ID on the [MCP page](/docs/mcp). That client is public and has no secret. Clients that send the [RFC 8707](https://www.rfc-editor.org/rfc/rfc8707) `resource` parameter get a token for the MCP audience, `https://api.3dprintlog.com/mcp`. Auth0's discovery document also lists a dynamic client registration endpoint, but the supported way to connect is the published client ID, which Claude, Claude Code, and ChatGPT all accept.

You can see and disconnect connected assistants on the [Settings](/settings) page under **Connected AI Agents**.

### API reference {#reference}

- **Swagger UI:** [https://api.3dprintlog.com/swagger](https://api.3dprintlog.com/swagger) lists every endpoint and lets you try requests.
- **OpenAPI document:** [https://api.3dprintlog.com/swagger/v1/swagger.json](https://api.3dprintlog.com/swagger/v1/swagger.json) is machine-readable and suits client generators and agent tool builders. Operation ids follow `Controller_Action`, such as `Prints_GetPrintById`. `https://www.3dprintlog.com/openapi.json` redirects to it.
- **Discovery files:** tools that look for an API on `www.3dprintlog.com` find it through the [RFC 9727](https://www.rfc-editor.org/rfc/rfc9727) API catalog at `/.well-known/api-catalog`, the MCP server card at `/.well-known/mcp/server-card.json`, the agent resource manifest at `/.well-known/ard.json`, and [llms.txt](https://www.3dprintlog.com/llms.txt). Every page also sends a `Link` header pointing at them.

All endpoints live under `/api`. Request and response bodies are JSON with camelCase property names, and dates are ISO 8601 strings. List endpoints are paged with `pageNumber` (starting at 1) and `pageSize`.

### Errors {#errors}

Errors that don't carry a more specific body come back as `application/problem+json` ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)), whatever the `Accept` header says:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.2",
  "title": "Unauthorized",
  "status": 401,
  "detail": "This endpoint requires authentication. Send an OAuth 2.0 access token as 'Authorization: Bearer <token>', or an API key in the X-Api-Key header. ...",
  "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

| Status | Meaning |
| --- | --- |
| `400` | The request failed validation. The body is a problem document with an `errors` object naming each invalid field. |
| `401` | No credentials, or credentials the API doesn't accept. See [How a client discovers this](#discovery). |
| `403` | The credentials are valid but don't grant access to this resource. |
| `404` | Nothing exists at this path, or the record doesn't exist. |
| `405` | The path exists but not for this method. The `Allow` header lists the methods it accepts. |
| `429` | Too many requests. Wait for the number of seconds in `Retry-After` before trying again. |

The `detail` is a hint for fixing the request, and quoting the `traceId` helps when you [report a problem](/feedback). A few older responses keep their own plain-text bodies, such as the `Invalid API Key` rejection, because existing integrations parse them.

The MCP endpoint has its own error format and isn't covered by this section.

### Rate limits {#rate-limits}

Requests are counted in one-minute windows:

| Traffic | Limit |
| --- | --- |
| Requests with an API key or token | 300 per minute, per user |
| Images and other media | 1,200 per minute, counted separately |
| Requests without credentials | 600 per minute, per network address |
| MCP requests | 60 per minute, per user |

These numbers can change. Don't hard-code them: back off when you get a `429`, and honor `Retry-After`.

### Stability {#stability}

There is a single version of the API, `v1`, and no formal deprecation policy yet. Most endpoints exist to serve the 3D Print Log apps and can change along with them, so generate a client from the OpenAPI document rather than hand-coding request shapes, and regenerate it when something breaks.

The endpoints used by the published integrations are kept backward compatible, because printers and plugins in the field call them and can't all be updated at once:

- `POST /api/Moonraker/notifier`: the [Klipper and Moonraker notifier](/docs/klipper)
- `POST /api/Octoprint`: the [OctoPrint webhook](/docs/octoprint-webhook)
- `/api/Cura/settings`: the [Cura plugin](/docs/cura-plugin) and the [slicer uploader](/docs/slic3r-uploader)

If you're building something on another endpoint and want it kept stable, [let us know](/feedback) what you're using.

### Source code {#source}

The API is open source under the AGPL-3.0 license: [github.com/HoffmanEngineering/3d-print-log-api](https://github.com/HoffmanEngineering/3d-print-log-api). Bug reports and questions are welcome there or at [hello@3dprintlog.com](mailto:hello@3dprintlog.com).
