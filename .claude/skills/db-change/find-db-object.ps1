# Find everything known about a database object across docs-claude and every cloned repo.
# usage: find-db-object.ps1 -Name <proc|table|view|function> [-Docs <docs-claude root>] [-Repos <folder holding the repos>]
# Defaults come from .claude/kit/kit.json (written by the kit installer).
param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Docs = '',
    [string]$Repos = ''
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$kitFile = Join-Path $projectRoot '.claude\kit\kit.json'
if (Test-Path $kitFile) {
    $kit = Get-Content $kitFile -Raw | ConvertFrom-Json
    if (-not $Docs -and $kit.docs)   { $Docs  = Join-Path $projectRoot $kit.docs }
    if (-not $Repos -and $kit.repos) { $Repos = Join-Path $projectRoot $kit.repos }
}
if (-not $Docs -or -not (Test-Path $Docs)) { Write-Error "docs-claude not found (pass -Docs or set 'docs' in .claude/kit/kit.json)"; exit 1 }
$Docs = (Resolve-Path $Docs).Path
if ($Repos -and (Test-Path $Repos)) { $Repos = (Resolve-Path $Repos).Path }

$esc = [regex]::Escape($Name)
$dbRoot = Join-Path $Docs 'databases'

"== $Name"
"-- docs-claude: $((Resolve-Path $Docs).Path)"

# 1. Procedure / table / function / trigger rows (generated reference files only, not the hand-written READMEs)
$found = $false
$refFiles = Get-ChildItem $dbRoot -Recurse -Filter *.md | Where-Object { $_.Directory.Name -in @('procedures', 'tables') -or $_.Name -eq 'functions-views.md' }
$refFiles | ForEach-Object {
    $db = $_.Directory.Parent.Name
    if ($_.Directory.Name -notin @('procedures', 'tables')) { $db = $_.Directory.Name }
    foreach ($m in (Select-String -Path $_.FullName -Pattern "^\|\s*\[?``$esc``\]?" -CaseSensitive:$false)) {
        $found = $true
        $cells = $m.Line.Trim('|').Split('|') | ForEach-Object { $_.Trim() }
        $rel = $_.FullName.Substring($dbRoot.Length + 1)
        if ($_.Directory.Name -eq 'procedures') {
            "PROC  $db  [$rel]"
            "      apps:   $($cells[1])"
            "      params: $($cells[2])"
            "      writes: $($cells[3])"
            "      reads:  $($cells[4])"
            "      lines:  $($cells[5])  flags: $($cells[6])  (D=dynamic SQL, C=cursor, T=transaction)"
        } elseif ($_.Directory.Name -eq 'tables') {
            # columns: Table | Cols | PK | Idx | Trg | Read by | Written by
            "TABLE $db  [$rel]  cols=$($cells[1]) pk=$($cells[2]) indexes=$($cells[3]) triggers=$($cells[4]) read-by=$($cells[5]) written-by=$($cells[6])"
            $section = (Get-Content $_.FullName -Raw -Encoding UTF8) -split "(?m)^## " | Where-Object { $_ -match "^$esc\s*\r?\n" } | Select-Object -First 1
            if ($section) {
                ($section -split "`n") | Where-Object { $_ -match '^- (`|\*\*Trigger)' } | ForEach-Object { "      $($_.Trim())" }
            }
        } else {
            "OBJ   $db  [$rel]  $($m.Line.Trim())"
        }
    }
}
if (-not $found) { "      not found in the schema export (may be in StplTravelPlatform, new, or misspelt)" }

# 2. Variants
$suffix = '(_v\d+|_new|_old|_test|_testing|_bk\d*|_bcp\w*|_\d{1,2}[a-z]{3}\d{2,4}|_\d+|\d+)'
$base = $Name -replace "(?i)$suffix`$", ''
$variants = $refFiles | Select-String -Pattern "^\|\s*``($([regex]::Escape($base))${suffix}?)``\s*\|" -AllMatches -CaseSensitive:$false |
    ForEach-Object { $_.Matches[0].Groups[1].Value } | Sort-Object -Unique | Where-Object { $_ -ne $Name }
"-- variants of '$base': $(if ($variants) { $variants -join ', ' } else { 'none' })"

# 3. Callers in code
if ($Repos -and (Test-Path $Repos)) {
    "-- references in repos under $((Resolve-Path $Repos).Path)"
    $include = '*.cs', '*.vb', '*.aspx', '*.ascx', '*.master', '*.cshtml', '*.dbml', '*.edmx', '*.asmx', '*.js'
    $refs = Get-ChildItem $Repos -Recurse -File -Include $include -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\(bin|obj|packages|node_modules|\.git)\\' -and $_.Name -notmatch '\.designer\.cs$' } |
        Select-String -Pattern "\b$esc\b" -CaseSensitive:$false
    $byRepo = $refs | Group-Object { $_.Path.Substring((Resolve-Path $Repos).Path.Length + 1).Split('\')[0] }
    foreach ($g in $byRepo) {
        "   $($g.Name): $($g.Count) reference(s)"
        $g.Group | Select-Object -First 15 | ForEach-Object {
            $p = $_.Path.Substring((Resolve-Path $Repos).Path.Length + 1)
            "      ${p}:$($_.LineNumber)"
        }
        if ($g.Count -gt 15) { "      ... $($g.Count - 15) more" }
    }
    if (-not $byRepo) { "   none (check SQL Agent jobs, other procs, and report tools)" }
} else {
    "-- repos folder not configured; skipped code search"
}
