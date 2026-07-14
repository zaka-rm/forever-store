# Regenerates APPLY_ALL.sql by concatenating every numbered .sql file in order.
# Run from the supabase/ folder:  powershell -File build-apply-all.ps1
$files = Get-ChildItem -Path $PSScriptRoot -Filter *.sql |
  Where-Object { $_.Name -ne 'APPLY_ALL.sql' } | Sort-Object Name
$out = New-Object System.Text.StringBuilder
[void]$out.AppendLine("-- ============================================================")
[void]$out.AppendLine("-- ZYVORA + Naturaloe store — COMBINED SCHEMA (auto-generated)")
[void]$out.AppendLine("-- Paste this ONE file into a fresh Supabase project's SQL editor and Run.")
[void]$out.AppendLine("-- ============================================================")
foreach ($f in $files) {
  [void]$out.AppendLine("")
  [void]$out.AppendLine("-- >>> FILE: $($f.Name) >>>")
  [void]$out.AppendLine((Get-Content $f.FullName -Raw -Encoding utf8))
}
[System.IO.File]::WriteAllText("$PSScriptRoot\APPLY_ALL.sql", $out.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Regenerated APPLY_ALL.sql from $($files.Count) files."
