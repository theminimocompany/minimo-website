$sourceDir = Join-Path $PSScriptRoot "project-001"
$outDir = Join-Path $sourceDir "optimized"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$encoder = [System.Drawing.Imaging.Encoder]::Quality
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, 85)
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }

Get-ChildItem -Path $sourceDir -Filter "*.jpg" | ForEach-Object {
    $img = [System.Drawing.Image]::FromFile($_.FullName)
    $origWidth = $img.Width
    $origHeight = $img.Height
    $targetWidth = 1600
    $newWidth = $origWidth
    $newHeight = $origHeight

    if ($origWidth -gt $targetWidth) {
        $ratio = $targetWidth / $origWidth
        $newWidth = [int]$targetWidth
        $newHeight = [int]($origHeight * $ratio)
    }

    $bitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($img, 0, 0, $newWidth, $newHeight)
    $graphics.Dispose()
    $img.Dispose()

    $outPath = Join-Path $outDir $_.Name
    $bitmap.Save($outPath, $jpegCodec, $encoderParams)
    $bitmap.Dispose()

    $origSize = $_.Length
    $newSize = (Get-Item $outPath).Length
    $saved = [math]::Round(($origSize - $newSize) / 1MB, 2)
    Write-Host ("{0}: {1}x{2} -> {3}x{4} | Saved {5} MB" -f $_.Name, $origWidth, $origHeight, $newWidth, $newHeight, $saved)
}

$encoderParams.Dispose()
Write-Host "Done. Output: $outDir"
