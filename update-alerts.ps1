# PowerShell script to replace alert() calls with Toast notifications
# Run this after manually importing useToast in each file

$files = @(
    "f:\QLTT\web\src\pages\SV\teacher_page_view\TeacherSubViewUpload.tsx",
    "f:\QLTT\web\src\pages\SV\khoa_page_view\KhoaSubViewUpload.tsx",
    "f:\QLTT\web\src\pages\SV\chat\CreateChatRequestDialog.tsx",
    "f:\QLTT\web\src\pages\SV\chat\ChatRequestDialog.tsx",
    "f:\QLTT\web\src\pages\SV\internship_subject\RegisterSubjectDialog.tsx",
    "f:\QLTT\web\src\pages\SV\internship_subject\InternshipSubjectRegister.tsx",
    "f:\QLTT\web\src\pages\SV\chat\ChatDialog.tsx",
    "f:\QLTT\web\src\pages\SV\chat\ChatManagement.tsx",
    "f:\QLTT\web\src\pages\GV\teacher_page\CreateSubDialog.tsx",
    "f:\QLTT\web\src\pages\GV\teacher_page\CreateHeaderDialog.tsx",
    "f:\QLTT\web\src\pages\BCN\request\RequestManagement.tsx"
)

# Replacement mappings
$replacements = @{
    "alert\('Nộp bài thành công!'\);" = "showSuccess('Nộp bài thành công!');"
    "alert\('Không thể nộp bài. Vui lòng thử lại.'\);" = "showError('Không thể nộp bài. Vui lòng thử lại.');"
    "alert\('Không thể xóa bài'\);" = "showError('Không thể xóa bài');"
    "alert\('Nộp file thành công!'\);" = "showSuccess('Nộp file thành công!');"
    "alert\('Không thể nộp file. Vui lòng thử lại.'\);" = "showError('Không thể nộp file. Vui lòng thử lại.');"
    "alert\('Không thể xóa file'\);" = "showError('Không thể xóa file');"
    'alert\("Không thể gửi yêu cầu. Vui lòng thử lại."\);' = 'showError("Không thể gửi yêu cầu. Vui lòng thử lại.");'
    'alert\("Không thể thu hồi yêu cầu. Vui lòng thử lại."\);' = 'showError("Không thể thu hồi yêu cầu. Vui lòng thử lại.");'
    "alert\('Đăng ký thất bại. Vui lòng thử lại.'\);" = "showError('Đăng ký thất bại. Vui lòng thử lại.');"
    "alert\('Chưa đến thời gian đăng ký'\);" = "showWarning('Chưa đến thời gian đăng ký');"
    "alert\('Đã hết thời gian đăng ký'\);" = "showWarning('Đã hết thời gian đăng ký');"
    "alert\('Môn thực tập đã đầy'\);" = "showWarning('Môn thực tập đã đầy');"
    'alert\("Đăng ký thành công! Bạn đã tham gia môn thực tập."\);' = 'showSuccess("Đăng ký thành công! Bạn đã tham gia môn thực tập.");'
    'alert\(error instanceof Error \? error\.message : "Đăng ký thất bại"\);' = 'showError(error instanceof Error ? error.message : "Đăng ký thất bại");'
    'alert\("Không thể gửi tin nhắn. Vui lòng thử lại."\);' = 'showError("Không thể gửi tin nhắn. Vui lòng thử lại.");'
    'alert\("Không thể chấp nhận yêu cầu. Vui lòng thử lại."\);' = 'showError("Không thể chấp nhận yêu cầu. Vui lòng thử lại.");'
    'alert\("Không thể từ chối yêu cầu. Vui lòng thử lại."\);' = 'showError("Không thể từ chối yêu cầu. Vui lòng thử lại.");'
    'alert\("Vui lòng nhập tên sub-header"\);' = 'showWarning("Vui lòng nhập tên sub-header");'
    'alert\("Vui lòng nhập tên header"\);' = 'showWarning("Vui lòng nhập tên header");'
    'alert\("Không thể chấp nhận yêu cầu"\);' = 'showError("Không thể chấp nhận yêu cầu");'
    'alert\("Không thể từ chối yêu cầu"\);' = 'showError("Không thể từ chối yêu cầu");'
}

Write-Host "Replacing alert() calls in files..." -ForegroundColor Yellow
Write-Host "Note: Make sure useToast() is imported in each file first!" -ForegroundColor Cyan

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "`nProcessing: $file" -ForegroundColor Green
        $content = Get-Content $file -Raw -Encoding UTF8
        
        $changed = $false
        foreach ($pattern in $replacements.Keys) {
            if ($content -match $pattern) {
                $content = $content -replace $pattern, $replacements[$pattern]
                $changed = $true
                Write-Host "  - Replaced: $pattern" -ForegroundColor Cyan
            }
        }
        
        if ($changed) {
            Set-Content $file -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  ✓ File updated" -ForegroundColor Green
        } else {
            Write-Host "  - No changes needed" -ForegroundColor Gray
        }
    } else {
        Write-Host "`nFile not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n✓ Alert replacement complete!" -ForegroundColor Green
Write-Host "Remember to add 'const { showSuccess, showError, showWarning } = useToast();' to each file!" -ForegroundColor Yellow
