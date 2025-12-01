# Script para exportar todos los snippets de Supabase a un archivo TXT
# Uso: .\export-supabase-snippets.ps1

$projectRef = "jtzvgunkoovauajsvwqy"
$outputFile = "todos_los_snippets.txt"

Write-Host "Obteniendo lista de snippets..." -ForegroundColor Cyan

# Limpiar el archivo de salida si existe
if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

# Obtener todos los snippets (sin límite)
$allSnippets = @()
$cursor = $null

do {
    # Construir comando con o sin cursor
    if ($cursor) {
        $jsonOutput = supabase snippets list --project-ref $projectRef --output json --cursor $cursor | ConvertFrom-Json
    } else {
        $jsonOutput = supabase snippets list --project-ref $projectRef --output json | ConvertFrom-Json
    }
    
    # Agregar snippets a la lista
    if ($jsonOutput.data) {
        $allSnippets += $jsonOutput.data
    }
    
    # Actualizar cursor para la siguiente página
    $cursor = $jsonOutput.cursor
    
} while ($cursor)

if ($allSnippets.Count -eq 0) {
    Write-Host "No se encontraron snippets." -ForegroundColor Red
    exit
}

Write-Host "Se encontraron $($allSnippets.Count) snippets." -ForegroundColor Green
Write-Host "Descargando snippets..." -ForegroundColor Cyan

# Contador
$count = 0

# Descargar cada snippet
foreach ($snippet in $allSnippets) {
    $count++
    $snippetId = $snippet.id
    $snippetName = $snippet.name
    $snippetDate = $snippet.updated_at
    
    Write-Host "[$count/$($allSnippets.Count)] Descargando: $snippetName" -ForegroundColor Yellow
    
    # Descargar el snippet
    $content = supabase snippets download $snippetId --project-ref $projectRef
    
    # Agregar al archivo con separadores
    Add-Content -Path $outputFile -Value "========================================" -Encoding UTF8
    Add-Content -Path $outputFile -Value "SNIPPET: $snippetName" -Encoding UTF8
    Add-Content -Path $outputFile -Value "ID: $snippetId" -Encoding UTF8
    Add-Content -Path $outputFile -Value "FECHA: $snippetDate" -Encoding UTF8
    Add-Content -Path $outputFile -Value "========================================" -Encoding UTF8
    Add-Content -Path $outputFile -Value "" -Encoding UTF8
    Add-Content -Path $outputFile -Value $content -Encoding UTF8
    Add-Content -Path $outputFile -Value "" -Encoding UTF8
    Add-Content -Path $outputFile -Value "" -Encoding UTF8
}

Write-Host "`n¡Listo! Todos los snippets se guardaron en: $outputFile" -ForegroundColor Green
Write-Host "Total de snippets exportados: $count" -ForegroundColor Green
Write-Host "Archivo guardado en: $PWD\$outputFile" -ForegroundColor Cyan