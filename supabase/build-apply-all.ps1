# Regenerates APPLY_ALL.sql by concatenating every numbered .sql file in order.
# Run from the supabase/ folder:  powershell -File build-apply-all.ps1
$files = Get-ChildItem -Path $PSScriptRoot -Filter *.sql |
  Where-Object { $_.Name -ne 'APPLY_ALL.sql' } | Sort-Object Name
$out = New-Object System.Text.StringBuilder
[void]$out.AppendLine("-- ============================================================")
[void]$out.AppendLine("-- ZYVORA + Naturaloe store - COMBINED SCHEMA (auto-generated)")
[void]$out.AppendLine("-- Paste this ONE file into a fresh Supabase project's SQL editor and Run.")
[void]$out.AppendLine("-- ============================================================")
foreach ($f in $files) {
  [void]$out.AppendLine("")
  [void]$out.AppendLine("-- >>> FILE: $($f.Name) >>>")
  [void]$out.AppendLine((Get-Content $f.FullName -Raw -Encoding utf8))
}

# --- Make every policy creation idempotent -------------------------------
# The individual files use bare `create policy` (readable on their own). But the
# COMBINED file must be safely re-runnable on a project that already has some
# policies, otherwise Postgres stops at the first "42710: already exists".
# So we inject a matching `drop policy if exists ... ;` before each create.
$text = $out.ToString()
$rx = [regex]'create policy "(?<n>[^"]+)"\s*\r?\n\s*on (?<t>[A-Za-z0-9_.]+)'
$text = $rx.Replace($text, {
  param($m)
  $n = $m.Groups['n'].Value
  $t = $m.Groups['t'].Value
  "drop policy if exists `"$n`" on $t;`r`ncreate policy `"$n`"`r`n  on $t"
})

[System.IO.File]::WriteAllText("$PSScriptRoot\APPLY_ALL.sql", $text, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Regenerated APPLY_ALL.sql from $($files.Count) files (policies made idempotent)."
