# MCP Auth0 setup

This checklist configures the OAuth resource used by the read-only 3D Print Log
MCP server. Apply it to development first, then repeat it in production with the
production values below.

## Environment values

| Environment | Auth0 tenant | MCP API identifier |
| --- | --- | --- |
| Development | `dev-3dprintlog.auth0.com` | `https://dev.3dprintlog.com/mcp` |
| Production | `3dprintlog.auth0.com` | `https://3dprintlog.com/mcp` |

The MCP identifier is deliberately separate from the normal Print Log API
audience. Never configure either resource server to accept the other audience.

## 1. Create the MCP API

In **Applications > APIs**, create an API named **PrintLog MCP** with the MCP
identifier for the target environment and the `RS256` signing algorithm.

Under **Permissions**, add:

- Permission: `read:printdata`
- Description: `Read the user's print data`

This is a self-service consent scope. Leave **Enable RBAC** and **Add Permissions
in the Access Token** disabled; otherwise every user would require a manual role
assignment before connecting an agent.

Under **Access Token Expiration**:

- Set **Maximum Access Token Lifetime** to `3600` seconds.
- Set **Implicit/Hybrid Flow Access Token Lifetime** to `3600` seconds.
- Enable **Allow Offline Access** so OAuth clients can receive refresh tokens.

Save the API settings.

## 2. Configure the public MCP client

Create a **Native** application named **PrintLog AI Connector**. It is a public
PKCE client and must not depend on a client secret.

Configure:

- Token Endpoint Authentication Method: `None`
- Grant types: `Authorization Code` and `Refresh Token`
- Claude callback URLs:
  - `https://claude.ai/api/mcp/auth_callback`
  - `https://claude.com/api/mcp/auth_callback`
- ChatGPT callback URL: copy the exact connector-specific URL displayed by the
  ChatGPT custom-app setup; do not invent or shorten it.

For local verification, temporarily add:

```text
http://127.0.0.1:8400/callback
```

Record the client ID in the deployment secret/configuration system. A public
client ID is not a secret, but it should have one authoritative configuration
source.

If the tenant exposes an **Application Access Policy**, select per-application
authorization and authorize only this client for `read:printdata`. Do not enable
the Client Credentials grant.

The v1 shared-client model supports revocation per 3D Print Log user, but not per
AI product or device. The UI must describe this as **Disconnect all AI agents**.
Already-issued access tokens remain valid until their one-hour expiry.

## 3. Configure Management API access

Open **Applications > APIs > Auth0 Management API > Machine to Machine
Applications**. Find the existing application used by the API's
`Auth0Management` configuration and grant only:

- `read:grants`
- `delete:grants`

These scopes let the backend list and revoke the current user's MCP grants.

## 4. Verify Authorization Code + PKCE

Run the repository script from PowerShell:

```powershell
.\scripts\test-auth0-mcp-pkce.ps1 `
  -ClientId '<environment client ID>' `
  -Auth0Domain '3dprintlog.auth0.com' `
  -Audience 'https://3dprintlog.com/mcp'
```

The callback URL `http://127.0.0.1:8400/callback` must be registered while the
test runs. The script opens the browser, completes an Authorization Code + PKCE
flow, keeps tokens only in memory, and verifies:

- issuer matches the selected tenant;
- audience contains the environment's MCP identifier;
- `read:printdata` is present in `scope`;
- `sub` is populated;
- access-token lifetime is approximately 3600 seconds;
- a refresh token is issued.

For the optional revocation check, revoke **PrintLog AI Connector** under the
test user's **Authorized Applications**, then return to the script and enter
`R`. The refresh-token exchange must fail. This revokes the shared MCP grant for
that user only; it does not disconnect other 3D Print Log users.

Do not paste tokens into public JWT websites, commit them, or include them in
support logs.

## 5. Production completion record

Record the following before deploying `/mcp`:

```text
Registration model: shared-client
MCP identifier: https://3dprintlog.com/mcp
Scope: read:printdata
Token lifetime: 3600 seconds
Grant types: authorization_code, refresh_token
Token endpoint authentication: none
Revocation UX: Disconnect all AI agents
PKCE smoke test: passed
Refresh revocation smoke test: passed
```

