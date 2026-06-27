Add-Type -AssemblyName System.Drawing

$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function New-Canvas($width, $height) {
  $bmp = New-Object System.Drawing.Bitmap -ArgumentList $width, $height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::White)
  return @($bmp, $g)
}

function Draw-TextCentered($g, $text, $font, $brush, $x, $y, $w, $h) {
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF -ArgumentList $x, $y, $w, $h
  $g.DrawString($text, $font, $brush, $rect, $fmt)
  $fmt.Dispose()
}

function Draw-Box($g, $x, $y, $w, $h, $fill, $stroke, $title, $sub) {
  $rect = New-Object System.Drawing.Rectangle -ArgumentList $x, $y, $w, $h
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = 18
  $path.AddArc($x, $y, $r, $r, 180, 90)
  $path.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $path.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $path.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $path.CloseFigure()
  $b = New-Object System.Drawing.SolidBrush $fill
  $p = New-Object System.Drawing.Pen $stroke, 2
  $g.FillPath($b, $path)
  $g.DrawPath($p, $path)
  Draw-TextCentered $g $title (New-Object System.Drawing.Font "Times New Roman", 17, ([System.Drawing.FontStyle]::Bold)) ([System.Drawing.Brushes]::Black) $x ($y + 11) $w 26
  Draw-TextCentered $g $sub (New-Object System.Drawing.Font "Times New Roman", 13, ([System.Drawing.FontStyle]::Regular)) ([System.Drawing.Brushes]::DimGray) $x ($y + 40) $w 24
  $b.Dispose(); $p.Dispose(); $path.Dispose()
}

function Draw-Arrow($g, $x1, $y1, $x2, $y2) {
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(37, 99, 235)), 3
  $cap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap -ArgumentList 5, 7, $true
  $pen.CustomEndCap = $cap
  $g.DrawLine($pen, $x1, $y1, $x2, $y2)
  $cap.Dispose(); $pen.Dispose()
}

function Save-Figure31 {
  $canvas = New-Canvas 1600 688
  $bmp = $canvas[0]; $g = $canvas[1]
  $titleFont = New-Object System.Drawing.Font "Times New Roman", 30, ([System.Drawing.FontStyle]::Bold)
  Draw-TextCentered $g "SkillSurokkha System Flowchart" $titleFont ([System.Drawing.Brushes]::DarkSlateGray) 0 18 1600 50
  $green = [System.Drawing.Color]::FromArgb(236, 253, 245)
  $blue = [System.Drawing.Color]::FromArgb(239, 246, 255)
  $orange = [System.Drawing.Color]::FromArgb(255, 247, 237)
  $greenStroke = [System.Drawing.Color]::FromArgb(15, 118, 110)
  $blueStroke = [System.Drawing.Color]::FromArgb(37, 99, 235)
  $orangeStroke = [System.Drawing.Color]::FromArgb(234, 88, 12)
  Draw-Box $g 55 120 240 95 $green $greenStroke "Register/Login" "Freelancer, Client, Admin"
  Draw-Arrow $g 295 168 365 168
  Draw-Box $g 365 120 250 95 $green $greenStroke "Profile Setup" "Skills and portfolio"
  Draw-Arrow $g 615 168 685 168
  Draw-Box $g 685 120 265 95 $blue $blueStroke "Skill Verification" "Video, transcript, score"
  Draw-Arrow $g 950 168 1020 168
  Draw-Box $g 1020 120 250 95 $green $greenStroke "Apply Project" "Proposal and budget"
  Draw-Arrow $g 1270 168 1340 168
  Draw-Box $g 1340 120 210 95 $orange $orangeStroke "Client Hire" "Escrow funded"
  Draw-Arrow $g 1445 215 1445 310
  Draw-Box $g 1305 310 285 100 $blue $blueStroke "Realtime Messages" "Chat and attachments"
  Draw-Arrow $g 1305 360 1210 360
  Draw-Box $g 925 310 285 100 $green $greenStroke "Submit Work" "ZIP, repo, demo, notes"
  Draw-Arrow $g 925 360 830 360
  Draw-Box $g 545 310 285 100 $blue $blueStroke "AI Requirement Review" "Acceptance matching"
  Draw-Arrow $g 545 360 450 360
  Draw-Box $g 165 310 285 100 $orange $orangeStroke "Client Decision" "Approve, revise, dispute"
  Draw-Arrow $g 307 410 307 505
  Draw-Box $g 165 505 285 95 $green $greenStroke "Escrow Release" "Wallet and withdrawal"
  $path = Join-Path $outDir "figure31.png"
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $titleFont.Dispose()
}

function Save-Figure32 {
  $canvas = New-Canvas 1600 832
  $bmp = $canvas[0]; $g = $canvas[1]
  $titleFont = New-Object System.Drawing.Font "Times New Roman", 30, ([System.Drawing.FontStyle]::Bold)
  Draw-TextCentered $g "SkillSurokkha System Architecture" $titleFont ([System.Drawing.Brushes]::DarkSlateGray) 0 18 1600 50
  $layerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(248, 250, 252))
  $layerPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(148, 163, 184)), 2
  $g.FillRectangle($layerBrush, 45, 95, 1510, 145); $g.DrawRectangle($layerPen, 45, 95, 1510, 145)
  $g.FillRectangle($layerBrush, 45, 305, 1510, 170); $g.DrawRectangle($layerPen, 45, 305, 1510, 170)
  $g.FillRectangle($layerBrush, 45, 535, 1510, 200); $g.DrawRectangle($layerPen, 45, 535, 1510, 200)
  Draw-Box $g 110 132 400 76 ([System.Drawing.Color]::FromArgb(236,253,245)) ([System.Drawing.Color]::FromArgb(5,150,105)) "Next.js Frontend" "React, Tailwind CSS, dashboard UI"
  Draw-Box $g 600 132 400 76 ([System.Drawing.Color]::FromArgb(236,253,245)) ([System.Drawing.Color]::FromArgb(5,150,105)) "User Roles" "Freelancer, Client, Administrator"
  Draw-Box $g 1090 132 400 76 ([System.Drawing.Color]::FromArgb(236,253,245)) ([System.Drawing.Color]::FromArgb(5,150,105)) "Browser Workflow" "Profile, project, payment, messages"
  Draw-Arrow $g 800 240 800 305
  Draw-Box $g 110 350 320 90 ([System.Drawing.Color]::FromArgb(239,246,255)) ([System.Drawing.Color]::FromArgb(37,99,235)) "Express REST API" "Auth and role access"
  Draw-Box $g 495 350 280 90 ([System.Drawing.Color]::FromArgb(239,246,255)) ([System.Drawing.Color]::FromArgb(37,99,235)) "Project Module" "Post, apply, hire"
  Draw-Box $g 825 350 280 90 ([System.Drawing.Color]::FromArgb(239,246,255)) ([System.Drawing.Color]::FromArgb(37,99,235)) "Skill Module" "Video verification"
  Draw-Box $g 1170 350 320 90 ([System.Drawing.Color]::FromArgb(239,246,255)) ([System.Drawing.Color]::FromArgb(37,99,235)) "Admin Module" "Review, disputes, payouts"
  Draw-Arrow $g 270 440 270 580; Draw-Arrow $g 635 440 635 580; Draw-Arrow $g 965 440 965 580; Draw-Arrow $g 1330 440 1330 580
  Draw-Box $g 120 580 340 105 ([System.Drawing.Color]::FromArgb(255,247,237)) ([System.Drawing.Color]::FromArgb(234,88,12)) "MySQL Database" "Users, projects, escrow, wallet"
  Draw-Box $g 505 580 340 105 ([System.Drawing.Color]::FromArgb(245,243,255)) ([System.Drawing.Color]::FromArgb(124,58,237)) "Socket.IO Server" "Realtime chat and unread count"
  Draw-Box $g 890 580 340 105 ([System.Drawing.Color]::FromArgb(245,243,255)) ([System.Drawing.Color]::FromArgb(124,58,237)) "AI/Media Services" "FFmpeg, Whisper, review scoring"
  Draw-Box $g 1275 580 220 105 ([System.Drawing.Color]::FromArgb(255,247,237)) ([System.Drawing.Color]::FromArgb(234,88,12)) "Uploads" "Videos, ZIP, docs"
  $noteFont = New-Object System.Drawing.Font "Times New Roman", 15, ([System.Drawing.FontStyle]::Regular)
  Draw-TextCentered $g "REST API coordinates data, realtime events, AI analysis, escrow actions and administrator review." $noteFont ([System.Drawing.Brushes]::DimGray) 150 755 1300 40
  $path = Join-Path $outDir "figure32.png"
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $titleFont.Dispose(); $noteFont.Dispose(); $layerBrush.Dispose(); $layerPen.Dispose()
}

Save-Figure31
Save-Figure32
