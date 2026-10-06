# auth.md

How an agent authenticates to 3D Print Log on behalf of a user.

3D Print Log is a web app for tracking 3D prints, printers, and filament. Every credential acts as one user and reaches only that user's own data (plus anything other users made public).

There are two surfaces:

- **MCP server** at `https://api.3dprintlog.com/mcp`. Built for agents and tool calling. OAuth 2.0 with scopes. **Use this if you can.**
- **REST API** at `https://api.3dprintlog.com/api`. The HTTP API behind the web app. A personal API key or an OAuth 2.0 token.

Human-readable documentation: <https://www.3dprintlog.com/docs/api> (REST API and authentication) and <https://www.3dprintlog.com/docs/mcp> (MCP).

This file follows the section layout of [auth.md](https://github.com/workos/auth.md), but 3D Print Log does **not** implement the `agent_auth` extension: there is no agent identity endpoint, no ID-JAG or anonymous registration, and no claim ceremony. Steps 3 to 5 below say what to do instead.

## Step 1 — Discover

### 1a. Protected Resource Metadata (RFC 9728)

An unauthenticated request returns `401` with a `WWW-Authenticate: Bearer resource_metadata="…"` header. Follow it, or fetch the documents directly:

| Surface | Metadata URL                                                                                                        | `resource` (token audience)      | `scopes_supported`                  |
| ------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------- |
| MCP     | `https://api.3dprintlog.com/.well-known/oauth-protected-resource` (also served at `…/oauth-protected-resource/mcp`) | `https://api.3dprintlog.com/mcp` | `read:printdata`, `write:printdata` |
| REST    | `https://api.3dprintlog.com/.well-known/oauth-protected-resource/api`                                               | `https://3dprintlog.com/api`     | none (REST checks audience only)    |

Both list `bearer_methods_supported: ["header"]` and the authorization server `https://3dprintlog.auth0.com/`.

The two audiences are isolated: the REST API rejects an MCP-audience token, and the MCP server rejects a REST-audience token.

### 1b. Authorization Server metadata

The authorization server is Auth0.

- Issuer: `https://3dprintlog.auth0.com/`
- OpenID Connect discovery: `https://3dprintlog.auth0.com/.well-known/openid-configuration`
- RFC 8414 metadata: `https://3dprintlog.auth0.com/.well-known/oauth-authorization-server`
- `authorization_endpoint`: `https://3dprintlog.auth0.com/authorize`
- `token_endpoint`: `https://3dprintlog.auth0.com/oauth/token`
- `revocation_endpoint`: `https://3dprintlog.auth0.com/oauth/revoke`
- PKCE: `S256`

There is no `agent_auth` block in this metadata. Auth0 hosts it, and 3D Print Log can't add one. No copy is served at `https://www.3dprintlog.com/.well-known/…`, because RFC 8414 requires the `issuer` to match the host the metadata is served from.

## Step 2 — Pick a method

| You are…                                                                              | Use        | Credential                                                    |
| ------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------- |
| An MCP client (Claude, Claude Code, ChatGPT, or any client that speaks MCP over HTTP) | MCP server | OAuth 2.0 authorization code + PKCE, with the user signing in |
| A script, integration, or agent that calls HTTP endpoints directly                    | REST API   | A personal API key the user creates and gives you             |

Neither method lets an agent create an account or act without a user. A human signs in (MCP) or creates a key (REST).

## Step 3 — Register

**MCP:** don't register a client. Use the published public client:

- `client_id`: `uzxvtpefYIrWoYbaJteoRzZtIYw4wP7j`
- No client secret (token endpoint auth method `none`).
- Redirect URIs are pre-registered for claude.ai's hosted connector and for loopback callbacks at `http://localhost:<port>/callback` on ports 8400 to 8405. Auth0 matches redirect URIs exactly, so any other redirect URI is refused.

Auth0's discovery document lists a `registration_endpoint`, but dynamic client registration is not a supported way to connect. Use the client ID above.

**REST:** there is no OAuth client registration for third parties. Ask the user to create a personal API key at <https://www.3dprintlog.com/api-keys> and give it to you. The key is shown once, when it is created.

## Step 4 — Claim ceremony

Not supported. There is no anonymous or pre-claim identity. The user is present from the start: they sign in during the MCP authorization flow, or they create the API key themselves.

## Step 5 — Exchange

**MCP:** standard authorization code + PKCE.

1. Send the user to `https://3dprintlog.auth0.com/authorize` with `response_type=code`, the `client_id` above, your registered `redirect_uri`, `code_challenge` + `code_challenge_method=S256`, `resource=https://api.3dprintlog.com/mcp` (RFC 8707), and a `scope` containing `read:printdata` and/or `write:printdata`, plus `offline_access` if you want a refresh token.
2. Exchange the returned `code` at `https://3dprintlog.auth0.com/oauth/token` with `grant_type=authorization_code`, the `code_verifier`, the same `redirect_uri`, and `client_id`.
3. Refresh with `grant_type=refresh_token` when you requested `offline_access`. Refresh tokens rotate, so store the new one each time.

A token needs at least one of `read:printdata` or `write:printdata` to reach the MCP server. Read tools require `read:printdata`; write tools require `write:printdata`. `tools/list` returns only the tools the token's scopes allow. No tool deletes anything.

**REST:** no exchange. The API key is the credential.

## Step 6 — Use the access_token

**MCP:**

```
POST https://api.3dprintlog.com/mcp
Authorization: Bearer <access_token>
```

**REST, with an API key** (preferred for scripts):

```
GET https://api.3dprintlog.com/api/Users/me
X-Api-Key: <api_key>
```

An `api_key` query parameter is also accepted, for clients that can't set headers. Avoid it when you can, because URLs get logged.

**REST, with an OAuth token:** `Authorization: Bearer <token>`, where the token was issued for the audience `https://3dprintlog.com/api`. REST does not check scopes: a valid token or key has full access to its user's own data. A few account endpoints (push device registration, reading the account email) refuse API keys and require an OAuth token.

The REST API is described by an OpenAPI document at `https://api.3dprintlog.com/swagger/v1/swagger.json` (Swagger UI: `https://api.3dprintlog.com/swagger`).

## Errors

REST errors without a more specific body are `application/problem+json` (RFC 9457) with `type`, `title`, `status`, `detail`, and `traceId`. Validation failures (`400`) are problem documents with an `errors` object.

| Status | Meaning                                                                                    | What to do                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401`  | Missing, expired, or wrong-audience token, or an invalid API key                           | Follow `resource_metadata` in `WWW-Authenticate`. Refresh or re-authorize. For a key, ask the user for a new one. An invalid key returns the plain-text body `Invalid API Key`. |
| `403`  | Valid credentials that don't grant this resource. On MCP: a token with neither data scope. | Re-authorize with the scope you need, or stop.                                                                                                                                  |
| `429`  | Rate limited, or too many invalid API keys from one address                                | Wait `Retry-After` seconds.                                                                                                                                                     |

Current limits (they may change; always honor `Retry-After`): REST 300 requests per minute per user, MCP 60 requests per minute per user.

The MCP endpoint reports tool failures inside its own JSON-RPC responses, not as problem documents.

## Revocation

- **MCP / OAuth:** the user can disconnect every connected assistant at <https://www.3dprintlog.com/settings> (**Connected AI Agents**), which revokes their grants immediately. A client can revoke its own refresh token at `https://3dprintlog.auth0.com/oauth/revoke` (RFC 7009).
- **API keys:** the user deletes the key at <https://www.3dprintlog.com/api-keys>. It stops working immediately.
- After revocation, expect `401`. Don't retry with the same credential.

No revocation events are pushed to agents.
