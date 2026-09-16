<#
.SYNOPSIS
Creates the local Laravel-to-Bidding-Service RSA key pair.

.DESCRIPTION
LOCAL DEVELOPMENT ONLY. The private key stays in the Laravel repository and
the matching public key is copied to the Bidding Service repository. Existing
keys are never overwritten unless -Force is supplied.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string] $BiddingServicePath = (Join-Path $PSScriptRoot '..\..\dotnet-bidding-service'),
    [switch] $Force
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
    throw 'OpenSSL is required for this local setup script but was not found on PATH.'
}

$laravelRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$biddingRoot = (Resolve-Path $BiddingServicePath).Path
$privatePath = Join-Path $laravelRoot 'storage\keys\bidding-service-private.pem'
$publicPath = Join-Path $biddingRoot 'src\bidding-service\keys\bidding-service-public.pem'

if ((Test-Path -LiteralPath $privatePath) -or (Test-Path -LiteralPath $publicPath)) {
    if (-not $Force) {
        throw "A local Bidding Service key already exists. Use -Force only to regenerate both halves: $privatePath and $publicPath"
    }
}

New-Item -ItemType Directory -Path (Split-Path $privatePath), (Split-Path $publicPath) -Force | Out-Null
$temporaryPrivatePath = Join-Path ([System.IO.Path]::GetTempPath()) ("bidding-service-private-{0}.pem" -f [guid]::NewGuid())

try {
    & openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $temporaryPrivatePath 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'OpenSSL could not generate the RSA private key.' }

    & openssl pkey -in $temporaryPrivatePath -pubout -out $publicPath 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'OpenSSL could not derive the RSA public key.' }

    Copy-Item -LiteralPath $temporaryPrivatePath -Destination $privatePath -Force
    Write-Output 'Created local Laravel private key and matching Bidding Service public key.'
    Write-Output "Laravel private key: $privatePath"
    Write-Output "Bidding public key: $publicPath"
    Write-Output 'LOCAL DEVELOPMENT ONLY: do not commit either PEM file or reuse this workflow for production key management.'
}
finally {
    if (Test-Path -LiteralPath $temporaryPrivatePath) {
        Remove-Item -LiteralPath $temporaryPrivatePath -Force
    }
}
