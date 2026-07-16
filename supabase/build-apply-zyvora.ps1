# Regenerates APPLY_ZYVORA.sql — the ZYVORA schema ONLY (files 40-43), for a
# DEDICATED ZYVORA Supabase project (no Naturaloe store tables).
# Run from anywhere:  powershell -File supabase/build-apply-zyvora.ps1
$files = Get-ChildItem -Path $PSScriptRoot -Filter '4*_zyvora*.sql' | Sort-Object Name
$out = New-Object System.Text.StringBuilder
[void]$out.AppendLine("-- ============================================================")
[void]$out.AppendLine("-- ZYVORA - COMBINED SCHEMA (auto-generated, ZYVORA tables only)")
[void]$out.AppendLine("-- Paste this into the ZYVORA project's SQL editor and Run.")
[void]$out.AppendLine("-- Does NOT include the Naturaloe store schema (that lives in its own project).")
[void]$out.AppendLine("-- ============================================================")
foreach ($f in $files) {
  [void]$out.AppendLine("")
  [void]$out.AppendLine("-- >>> FILE: $($f.Name) >>>")
  [void]$out.AppendLine((Get-Content $f.FullName -Raw -Encoding utf8))
}
[System.IO.File]::WriteAllText("$PSScriptRoot\APPLY_ZYVORA.sql", $out.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Regenerated APPLY_ZYVORA.sql from $($files.Count) files: $($files.Name -join ', ')"
