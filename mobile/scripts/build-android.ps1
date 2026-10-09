$ErrorActionPreference='Stop'
$mobileRoot=Split-Path $PSScriptRoot -Parent
Push-Location $mobileRoot
try {
  $env:NPM_CONFIG_USERCONFIG=Join-Path $mobileRoot 'npm-user.config'
  $env:NODE_ENV='production'
  # npm may block dependency postinstall scripts. Explicitly prepare the pinned,
  # checksum-verified native llama.rn artifacts before generating the app.
  $buildPath=$env:Path
  try {
    # Windows tar accepts drive-letter paths; Git's tar treats them as remote hosts.
    $env:Path=(Join-Path $env:SystemRoot 'System32') + ';' + $env:Path
    & node node_modules/llama.rn/install/download-native-artifacts.js
    if($LASTEXITCODE -ne 0){throw 'Local extraction native artifacts could not be prepared'}
  } finally {$env:Path=$buildPath}
  & npx.cmd expo prebuild --platform android --no-install
  if($LASTEXITCODE -ne 0){throw 'Native project generation failed'}
  & node scripts/check-native.mjs
  if($LASTEXITCODE -ne 0){throw 'Generated native configuration failed validation'}
  Push-Location android
  try {
    & ./gradlew.bat :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=4 --console=plain
    if($LASTEXITCODE -ne 0){throw 'Android build failed'}
  } finally {Pop-Location}
} finally {Pop-Location}
