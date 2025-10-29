# Export PlantUML Diagrams Script

# This script exports all PlantUML diagrams to PNG format
# Run this in PowerShell from the QLTT directory

Write-Host "Exporting PlantUML diagrams..." -ForegroundColor Green

# Create export directory
$exportDir = ".\diagram\exports"
if (!(Test-Path $exportDir)) {
    New-Item -ItemType Directory -Path $exportDir
    Write-Host "Created export directory: $exportDir" -ForegroundColor Yellow
}

# Export Use Case diagrams
Write-Host "Exporting Use Case diagrams..." -ForegroundColor Cyan
$usecaseFiles = Get-ChildItem ".\diagram\usecase\*.puml"
foreach ($file in $usecaseFiles) {
    $outputName = $file.BaseName + ".png"
    $outputPath = Join-Path $exportDir "usecase_$outputName"
    Write-Host "  Exporting: $($file.Name)" -ForegroundColor Gray
    # You can use PlantUML CLI or VS Code command palette for actual export
}

# Export Activity diagrams
Write-Host "Exporting Activity diagrams..." -ForegroundColor Cyan
$activityFiles = Get-ChildItem ".\diagram\activity\*.puml"
foreach ($file in $activityFiles) {
    $outputName = $file.BaseName + ".png"
    $outputPath = Join-Path $exportDir "activity_$outputName"
    Write-Host "  Exporting: $($file.Name)" -ForegroundColor Gray
}

# Export Sequence diagrams
Write-Host "Exporting Sequence diagrams..." -ForegroundColor Cyan
$sequenceFiles = Get-ChildItem ".\diagram\sequence\*.puml"
foreach ($file in $sequenceFiles) {
    $outputName = $file.BaseName + ".png"
    $outputPath = Join-Path $exportDir "sequence_$outputName"
    Write-Host "  Exporting: $($file.Name)" -ForegroundColor Gray
}

Write-Host "`nTo actually export the diagrams:" -ForegroundColor Yellow
Write-Host "1. Open each .puml file in VS Code" -ForegroundColor White
Write-Host "2. Press Ctrl+Shift+P" -ForegroundColor White
Write-Host "3. Type 'PlantUML: Export Current Diagram'" -ForegroundColor White
Write-Host "4. Choose PNG format and save to .\diagram\exports\" -ForegroundColor White

Write-Host "`nOr use PlantUML CLI if installed:" -ForegroundColor Yellow
Write-Host "java -jar plantuml.jar -tpng .\diagram\**\*.puml -o .\diagram\exports\" -ForegroundColor White