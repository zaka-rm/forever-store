# Regenerates APPLY_NATURALOE.sql — the store schema ONLY (no Zyvora).
# Paste the result into the fresh Naturaloé Supabase project's SQL editor.
# Run from the supabase/ folder:  powershell -File build-naturaloe.ps1
$files = Get-ChildItem -Path $PSScriptRoot -Filter *.sql |
  Where-Object { $_.Name -notlike 'APPLY_*' -and $_.Name -notlike '*zyvora*' } |
  Sort-Object Name
$out = New-Object System.Text.StringBuilder
[void]$out.AppendLine("-- ============================================================")
[void]$out.AppendLine("-- NATURALOE store ONLY - COMBINED SCHEMA (auto-generated, no Zyvora)")
[void]$out.AppendLine("-- Paste this ONE file into the fresh Naturaloe Supabase project and Run.")
[void]$out.AppendLine("-- Policies are idempotent (safe to re-run). BUT 99_convert-to-dirham")
[void]$out.AppendLine("-- multiplies prices by 10.8 - run the whole file ONCE only.")
[void]$out.AppendLine("-- ============================================================")
foreach ($f in $files) {
  [void]$out.AppendLine("")
  [void]$out.AppendLine("-- >>> FILE: $($f.Name) >>>")
  [void]$out.AppendLine((Get-Content $f.FullName -Raw -Encoding utf8))
}

# Make every policy creation idempotent (drop-then-create) so the combined file
# never stops at "42710: already exists" on a project that has some policies.
$text = $out.ToString()
$rx = [regex]'create policy "(?<n>[^"]+)"\s*\r?\n\s*on (?<t>[A-Za-z0-9_.]+)'
$text = $rx.Replace($text, {
  param($m)
  $n = $m.Groups['n'].Value
  $t = $m.Groups['t'].Value
  "drop policy if exists `"$n`" on $t;`r`ncreate policy `"$n`"`r`n  on $t"
})

[System.IO.File]::WriteAllText("$PSScriptRoot\APPLY_NATURALOE.sql", $text, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Regenerated APPLY_NATURALOE.sql from $($files.Count) files (Zyvora excluded, policies idempotent)."