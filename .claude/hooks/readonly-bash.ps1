# PreToolUse hook for read-only agents (code-reviewer, security-reviewer, db-impact-analyst).
# Allows a command only if EVERY segment (split on && || ; |) is a known read-only command.
# Anything else is blocked with exit 2, so "read-only" is enforced rather than requested.
# Fails closed: unparseable input is blocked, because these agents never need to write.

$ErrorActionPreference = 'Stop'
try {
    $evt = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $cmd = [string]$evt.tool_input.command
} catch {
    [Console]::Error.WriteLine('Blocked by readonly-bash.ps1: could not read the command.')
    exit 2
}
if ([string]::IsNullOrWhiteSpace($cmd)) { exit 0 }

function Block([string]$why) {
    [Console]::Error.WriteLine("Blocked by .claude/hooks/readonly-bash.ps1: this agent is read-only ($why). Use read-only git (diff/log/show/status/blame), grep, or the kit lookup scripts.")
    exit 2
}

# No output redirection or command substitution that could write or run other commands.
if ($cmd -match '(^|[^0-9&])>{1,2}(?!&)|\|\s*(tee|Out-File|Set-Content|Add-Content)\b|`|\$\(') { Block 'redirection or substitution' }

$readOnlyGit = '^git(\s+-C\s+\S+)?\s+(diff|log|show|status|blame|rev-parse|merge-base|ls-files|grep|branch\s+(--show-current|-a|-r|--list)|for-each-ref|cat-file|shortlog)\b'
$readOnlyShell = '^(cd|Set-Location|pushd|popd|grep|rg|egrep|cat|head|tail|wc|ls|dir|pwd|echo|sort|uniq|cut|tr|awk|sed\s+-n|file|stat|diff|cmp|fc|Compare-Object|Get-Content|Select-String|Get-ChildItem|Get-Item|Test-Path|Measure-Object|Format-\w+|Select-Object|Where-Object|ForEach-Object|Sort-Object|Group-Object)\b'
$kitScript = '^powershell(\.exe)?\s+(-NoProfile\s+)?(-ExecutionPolicy\s+Bypass\s+)?-File\s+"?[^"]*\.claude[\\/](skills[\\/](db-change[\\/]find-db-object|review[\\/]scan-diff))\.ps1"?(\s|$)'

foreach ($seg in ($cmd -split '&&|\|\||;|\|')) {
    $s = $seg.Trim()
    if (-not $s) { continue }
    if ($s -match $readOnlyGit) { continue }
    if ($s -match $kitScript) { continue }
    if ($s -match $readOnlyShell) {
        if ($s -match '^sed\b' -and $s -match '\s-i\b') { Block 'sed -i edits files' }
        if ($s -match '^awk\b' -and $s -match 'system\(|>\s*"') { Block 'awk writing or running commands' }
        continue
    }
    if ($s -match '^find\b' -and $s -notmatch '-(exec|execdir|delete|ok|fprint)') { continue }
    $shown = (($s -split '\s+') | Select-Object -First 2) -join ' '
    Block "'$shown' is not on the read-only list"
}
exit 0
