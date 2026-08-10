$ErrorActionPreference = "Stop"

$BaseModel = "qwen3.5:9b"
$AppModel = "planora-pro"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Modelfile = Join-Path $Root "ollama\Modelfile.planora-pro"

function Find-OllamaExecutable {
  $command = Get-Command ollama -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"),
    (Join-Path $env:LOCALAPPDATA "Ollama\ollama.exe"),
    "C:\Program Files\Ollama\ollama.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }
  return $null
}

function Test-OllamaReady {
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

$OllamaPath = Find-OllamaExecutable
if (-not $OllamaPath) {
  throw "Ollama CLI was not found. Install Ollama from https://ollama.com/download and rerun this script."
}

if (-not (Test-OllamaReady)) {
  Start-Process -FilePath $OllamaPath -ArgumentList "serve" -WindowStyle Hidden
}

$deadline = (Get-Date).AddMinutes(3)
while (-not (Test-OllamaReady)) {
  if ((Get-Date) -gt $deadline) {
    throw "Ollama did not become ready on http://127.0.0.1:11434."
  }
  Start-Sleep -Seconds 2
}

Write-Host "Pulling $BaseModel..."
& $OllamaPath pull $BaseModel

Write-Host "Creating $AppModel from $Modelfile..."
& $OllamaPath create $AppModel -f $Modelfile

Write-Host "Testing $AppModel..."
$body = @{
  model = $AppModel
  prompt = "Reply with one short sentence explaining what Planora does."
  stream = $false
} | ConvertTo-Json

$response = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:11434/api/generate" -ContentType "application/json" -Body $body -TimeoutSec 120
Write-Host $response.response
Write-Host "Ollama setup complete."
