# Script de teste para simular o envio de dados do ESP32 para o monitor
param(
    [string]$Url = "http://localhost:3000/api/dados",
    [switch]$Impacto = $false,
    [double]$Lat = -23.55052,
    [double]$Lng = -46.633308,
    [double]$AccelG = 1.0,
    [int]$Pontos = 0
)

if ($Impacto) {
    $AccelG = 14.2
    $Pontos = 85
}

$payload = @{
    wifi = "CONECTADO"
    ip = "10.172.7.50"
    detectar = $true
    aceleracao = [string]($AccelG * 9.80665)
    aceleracaoG = [string]$AccelG
    picoAceleracaoG = [string]$AccelG
    picoG = [string]$AccelG
    pontuacao = $Pontos
    pontosMPU = if ($Impacto) { 70 } else { 0 }
    pontosVibracao = if ($Impacto) { 20 } else { 0 }
    pontosSom = if ($Impacto) { 10 } else { 0 }
    avaliando = $false
    impacto = [bool]$Impacto
    vibracao = [bool]$Impacto
    som = [bool]$Impacto
    gpsValido = $true
    latitude = $Lat
    longitude = $Lng
    altitude = 760
    satelites = 8
    hdop = 1.1
    mapsUrl = "https://www.google.com/maps?q=$Lat,$Lng"
    log = if ($Impacto) { "IMPACTO RELEVANTE DETECTADO!" } else { "Sistema ativo." }
} | ConvertTo-Json

Write-Host "Enviando dados para $Url..." -ForegroundColor Cyan
$resp = Invoke-RestMethod -Uri $Url -Method POST -Body $payload -ContentType "application/json"
Write-Host "Resposta: $($resp.mensagem)" -ForegroundColor Green
