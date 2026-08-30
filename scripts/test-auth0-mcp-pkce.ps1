param(
    [string]$ClientId = "t0ebEb6y5J1WYpvuNii4mnt9C83GyMd4",
    [string]$Auth0Domain = "dev-3dprintlog.auth0.com",
    [string]$Audience = "https://dev.3dprintlog.com/mcp",
    [string]$RedirectUri = "http://127.0.0.1:8400/callback"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Web

function ConvertTo-Base64Url {
    param([byte[]]$Bytes)
    [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function ConvertFrom-Base64UrlJson {
    param([string]$Value)
    $base64 = $Value.Replace('-', '+').Replace('_', '/')
    switch ($base64.Length % 4) {
        2 { $base64 += '==' }
        3 { $base64 += '=' }
    }
    [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($base64)) | ConvertFrom-Json
}

function New-RandomBase64Url {
    param([int]$ByteCount = 32)
    $bytes = New-Object byte[] $ByteCount
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $random.GetBytes($bytes) } finally { $random.Dispose() }
    ConvertTo-Base64Url $bytes
}

function Add-Result {
    param([string]$Name, [bool]$Passed, [string]$Details)
    $script:Results += [pscustomobject]@{
        Check = $Name
        Result = if ($Passed) { 'PASS' } else { 'FAIL' }
        Details = $Details
    }
}

$redirect = [Uri]$RedirectUri
if ($redirect.Scheme -ne 'http' -or $redirect.Host -ne '127.0.0.1') {
    throw 'RedirectUri must be an http://127.0.0.1 loopback URL.'
}

$listenerPrefix = "{0}://{1}:{2}/" -f $redirect.Scheme, $redirect.Host, $redirect.Port
$codeVerifier = New-RandomBase64Url 64
$sha256 = [Security.Cryptography.SHA256]::Create()
try {
    $challengeBytes = $sha256.ComputeHash([Text.Encoding]::ASCII.GetBytes($codeVerifier))
} finally {
    $sha256.Dispose()
}
$codeChallenge = ConvertTo-Base64Url $challengeBytes
$state = New-RandomBase64Url
$scope = 'openid profile offline_access read:printdata'

$query = [System.Web.HttpUtility]::ParseQueryString('')
$query['response_type'] = 'code'
$query['client_id'] = $ClientId
$query['redirect_uri'] = $RedirectUri
$query['audience'] = $Audience
$query['scope'] = $scope
$query['code_challenge'] = $codeChallenge
$query['code_challenge_method'] = 'S256'
$query['state'] = $state
$authorizeUrl = "https://$Auth0Domain/authorize?$($query.ToString())"

$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add($listenerPrefix)
try {
    $listener.Start()
    Write-Host "Waiting for Auth0 at $RedirectUri"
    Write-Host 'Opening the authorization URL in your default browser...'
    try { Start-Process $authorizeUrl } catch {
        Write-Warning 'Open this URL manually:'
        Write-Host $authorizeUrl
    }

    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $errorCode = $request.QueryString['error']
    if ($errorCode) {
        throw "Auth0 rejected the request: $errorCode - $($request.QueryString['error_description'])"
    }
    if ($request.QueryString['state'] -ne $state) {
        throw 'The returned OAuth state did not match.'
    }
    $code = $request.QueryString['code']
    if ([string]::IsNullOrWhiteSpace($code)) {
        throw 'Auth0 did not return an authorization code.'
    }
    $html = '<html><body><h1>Authorization received</h1><p>Return to PowerShell. You may close this tab.</p></body></html>'
    $bytes = [Text.Encoding]::UTF8.GetBytes($html)
    $response.ContentType = 'text/html; charset=utf-8'
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.Close()
} finally {
    if ($listener.IsListening) { $listener.Stop() }
    $listener.Close()
}

$tokenBody = @{
    grant_type = 'authorization_code'
    client_id = $ClientId
    code = $code
    redirect_uri = $RedirectUri
    code_verifier = $codeVerifier
} | ConvertTo-Json
$tokenResponse = Invoke-RestMethod -Method Post -Uri "https://$Auth0Domain/oauth/token" -ContentType 'application/json' -Body $tokenBody
if ([string]::IsNullOrWhiteSpace($tokenResponse.access_token)) {
    throw 'Auth0 did not return an access token.'
}

$jwtParts = $tokenResponse.access_token.Split('.')
if ($jwtParts.Count -ne 3) { throw 'The returned access token is not a JWT.' }
$claims = ConvertFrom-Base64UrlJson $jwtParts[1]
$Results = @()
$expectedIssuer = "https://$Auth0Domain/"
$audiences = @($claims.aud)
$scopes = @(([string]$claims.scope).Split(' ', [StringSplitOptions]::RemoveEmptyEntries))
$lifetime = [long]$claims.exp - [long]$claims.iat

Add-Result 'Issuer' ($claims.iss -eq $expectedIssuer) "Expected $expectedIssuer"
Add-Result 'MCP audience' ($audiences -contains $Audience) "Expected $Audience"
Add-Result 'read:printdata scope' ($scopes -contains 'read:printdata') 'Required by the MCP endpoint'
Add-Result 'Subject' (-not [string]::IsNullOrWhiteSpace([string]$claims.sub)) 'Auth0 user identifier is present'
Add-Result 'Token lifetime' ($lifetime -ge 3540 -and $lifetime -le 3660) "Actual lifetime: $lifetime seconds"
Add-Result 'Refresh token' (-not [string]::IsNullOrWhiteSpace([string]$tokenResponse.refresh_token)) 'Requires offline_access and Allow Offline Access'

Write-Host ''
Write-Host 'Auth0 MCP validation results (tokens are not displayed or saved):'
$Results | Format-Table -AutoSize
if ($Results.Result -contains 'FAIL') { throw 'One or more Auth0 MCP validation checks failed.' }

if (-not [string]::IsNullOrWhiteSpace([string]$tokenResponse.refresh_token)) {
    $answer = Read-Host 'Revoke the application for this user, then enter R to test revocation, or S to skip'
    if ($answer -match '^[Rr]$') {
        $refreshBody = @{
            grant_type = 'refresh_token'
            client_id = $ClientId
            refresh_token = $tokenResponse.refresh_token
        } | ConvertTo-Json
        try {
            $null = Invoke-RestMethod -Method Post -Uri "https://$Auth0Domain/oauth/token" -ContentType 'application/json' -Body $refreshBody
            Write-Error 'FAIL: Auth0 accepted the refresh token after revocation.'
        } catch {
            Write-Host 'PASS: Auth0 rejected the refresh token after revocation.' -ForegroundColor Green
        }
    }
}

Write-Host 'Auth0 MCP PKCE test passed.' -ForegroundColor Green
