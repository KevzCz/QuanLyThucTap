# Export the 3 sequence diagrams
# Run this script from the QLTT directory

Write-Host "Exporting 3 Sequence Diagrams..." -ForegroundColor Green

$diagrams = @(
    "docs\diagram\sequence\09-bcn-manage-hocky-import.puml",
    "docs\diagram\sequence\01-login.puml",
    "docs\diagram\sequence\02-pdt-create-account.puml"
)

Write-Host "`nDiagrams to export:" -ForegroundColor Cyan
foreach ($diagram in $diagrams) {
    Write-Host "  - $diagram" -ForegroundColor White
}

Write-Host "`nTo export these diagrams:" -ForegroundColor Yellow
Write-Host "1. Open each .puml file in VS Code" -ForegroundColor White
Write-Host "2. Right-click in the editor" -ForegroundColor White
Write-Host "3. Select 'Preview Current Diagram' to verify" -ForegroundColor White
Write-Host "4. Then press Alt+D to export to PNG" -ForegroundColor White
Write-Host "   (or use Ctrl+Shift+P -> 'PlantUML: Export Current Diagram')" -ForegroundColor White

Write-Host "`nOr run this command if PlantUML JAR is available:" -ForegroundColor Yellow
Write-Host "java -jar plantuml.jar -tpng `"$($diagrams[0])`" `"$($diagrams[1])`" `"$($diagrams[2])`" -o ..\exports" -ForegroundColor White

Write-Host "`nDiagrams will be exported to: docs\diagram\exports\" -ForegroundColor Green
