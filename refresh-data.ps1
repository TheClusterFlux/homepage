# PowerShell script to refresh homepage data from MongoDB
# Usage: .\refresh-data.ps1 [url]

param(
    [string]$Url = "https://homepage.theclusterflux.com/api/fetch-data"
)

Write-Host "Refreshing data from: $Url" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Success! Data refreshed successfully." -ForegroundColor Green
        $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    } else {
        Write-Host "❌ Error! HTTP Status: $($response.StatusCode)" -ForegroundColor Red
        Write-Host $response.Content
        exit 1
    }
} catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

