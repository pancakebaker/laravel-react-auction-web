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
    throw 'OpenSSL was not found on PATH. Install OpenSSL or make openssl.exe available before running this local-development script.'
}

$laravelRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Test-Path -LiteralPath $BiddingServicePath -PathType Container)) {
    throw "The supplied Bidding Service repository path does not exist: $BiddingServicePath"
}

$biddingRoot = (Resolve-Path -LiteralPath $BiddingServicePath).Path
$biddingProjectPath = Join-Path $biddingRoot 'src\bidding-service'
if (-not (Test-Path -LiteralPath $biddingProjectPath -PathType Container)) {
    throw "The supplied path is not a Bidding Service repository (missing src\bidding-service): $biddingRoot"
}

$privatePath = Join-Path $laravelRoot 'storage\keys\bidding-service-private.pem'
$publicPath = Join-Path $biddingProjectPath 'keys\bidding-service-public.pem'

if ((Test-Path -LiteralPath $privatePath) -or (Test-Path -LiteralPath $publicPath)) {
    if (-not $Force) {
        throw "A local Bidding Service key already exists. Use -Force only to regenerate both halves: $privatePath and $publicPath"
    }
}

New-Item -ItemType Directory -Path (Split-Path $privatePath), (Split-Path $publicPath) -Force | Out-Null
$temporaryPrivatePath = Join-Path ([System.IO.Path]::GetTempPath()) ("bidding-service-private-{0}.pem" -f [guid]::NewGuid())
$temporaryPublicPath = Join-Path ([System.IO.Path]::GetTempPath()) ("bidding-service-public-{0}.pem" -f [guid]::NewGuid())
$privateBackupPath = Join-Path ([System.IO.Path]::GetTempPath()) ("bidding-service-private-backup-{0}.pem" -f [guid]::NewGuid())
$publicBackupPath = Join-Path ([System.IO.Path]::GetTempPath()) ("bidding-service-public-backup-{0}.pem" -f [guid]::NewGuid())

function Invoke-OpenSsl {
    param(
        [string[]] $Arguments,
        [string] $Operation
    )

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = 'openssl'
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $quotedArguments = @($Arguments | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' })
    $startInfo.Arguments = [string]::Join(' ', $quotedArguments)

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) {
            throw "OpenSSL could not start while attempting to $Operation."
        }

        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) {
            $detail = $stderr.Trim()
            if ([string]::IsNullOrWhiteSpace($detail)) {
                $detail = $stdout.Trim()
            }
            if ([string]::IsNullOrWhiteSpace($detail)) {
                $detail = 'OpenSSL returned no diagnostic output.'
            }
            throw "OpenSSL could not $Operation (exit code $($process.ExitCode)): $detail"
        }
    }
    finally {
        $process.Dispose()
    }
}

$privateExisted = Test-Path -LiteralPath $privatePath -PathType Leaf
$publicExisted = Test-Path -LiteralPath $publicPath -PathType Leaf

try {
    Invoke-OpenSsl @('genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048', '-out', $temporaryPrivatePath) 'generate the RSA private key'

    Invoke-OpenSsl @('pkey', '-in', $temporaryPrivatePath, '-pubout', '-out', $temporaryPublicPath) 'derive the RSA public key'

    if ($Force) {
        if ($privateExisted) { Copy-Item -LiteralPath $privatePath -Destination $privateBackupPath -Force }
        if ($publicExisted) { Copy-Item -LiteralPath $publicPath -Destination $publicBackupPath -Force }
    }

    Copy-Item -LiteralPath $temporaryPrivatePath -Destination $privatePath -Force
    Copy-Item -LiteralPath $temporaryPublicPath -Destination $publicPath -Force
    Write-Output $(if ($Force) { 'Replaced local Laravel private key and matching Bidding Service public key.' } else { 'Created local Laravel private key and matching Bidding Service public key.' })
    Write-Output "Laravel private key: $privatePath"
    Write-Output "Bidding public key: $publicPath"
    Write-Output 'LOCAL DEVELOPMENT ONLY: do not commit either PEM file or reuse this workflow for production key management.'
}
catch {
    if ($Force) {
        if ($privateExisted -and (Test-Path -LiteralPath $privateBackupPath)) {
            Copy-Item -LiteralPath $privateBackupPath -Destination $privatePath -Force
        } elseif (-not $privateExisted -and (Test-Path -LiteralPath $privatePath)) {
            Remove-Item -LiteralPath $privatePath -Force
        }
        if ($publicExisted -and (Test-Path -LiteralPath $publicBackupPath)) {
            Copy-Item -LiteralPath $publicBackupPath -Destination $publicPath -Force
        } elseif (-not $publicExisted -and (Test-Path -LiteralPath $publicPath)) {
            Remove-Item -LiteralPath $publicPath -Force
        }
    } elseif (-not $privateExisted -and (Test-Path -LiteralPath $privatePath)) {
        Remove-Item -LiteralPath $privatePath -Force
    }
    throw
}
finally {
    foreach ($path in @($temporaryPrivatePath, $temporaryPublicPath, $privateBackupPath, $publicBackupPath)) {
        if (Test-Path -LiteralPath $path) {
            Remove-Item -LiteralPath $path -Force
        }
    }
}
