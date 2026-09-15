param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath,

  [string]$Bucket = "onetimelabs",
  [string]$ObjectKey = "streamsafe/StreamSafeSetup.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InstallerPath)) {
  throw "Installer not found: $InstallerPath"
}

if (-not $env:R2_ACCOUNT_ID) { throw "R2_ACCOUNT_ID is not set." }
if (-not $env:R2_ACCESS_KEY_ID) { throw "R2_ACCESS_KEY_ID is not set." }
if (-not $env:R2_SECRET_ACCESS_KEY) { throw "R2_SECRET_ACCESS_KEY is not set." }

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI is required. Install AWS CLI v2, then run this script again."
}

$oldAccessKey = $env:AWS_ACCESS_KEY_ID
$oldSecretKey = $env:AWS_SECRET_ACCESS_KEY
$oldRegion = $env:AWS_DEFAULT_REGION

try {
  $env:AWS_ACCESS_KEY_ID = $env:R2_ACCESS_KEY_ID
  $env:AWS_SECRET_ACCESS_KEY = $env:R2_SECRET_ACCESS_KEY
  $env:AWS_DEFAULT_REGION = "auto"

  $endpoint = "https://$($env:R2_ACCOUNT_ID).r2.cloudflarestorage.com"
  $destination = "s3://$Bucket/$ObjectKey"

  Write-Host "Uploading $InstallerPath"
  Write-Host "To: $destination"

  aws s3 cp $InstallerPath $destination `
    --endpoint-url $endpoint `
    --only-show-errors

  if ($LASTEXITCODE -ne 0) {
    throw "Upload failed with AWS CLI exit code $LASTEXITCODE."
  }

  Write-Host "Upload complete."
}
finally {
  $env:AWS_ACCESS_KEY_ID = $oldAccessKey
  $env:AWS_SECRET_ACCESS_KEY = $oldSecretKey
  $env:AWS_DEFAULT_REGION = $oldRegion
}
