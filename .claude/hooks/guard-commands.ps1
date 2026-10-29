# PreToolUse hook for Bash | PowerShell.
# Blocks (exit 2, reason on stderr):
#   - SQL tools pointed at anything other than a local server,
#   - deploy / IIS / publish-to-hosting commands,
#   - destructive git (push, force, hard reset, clean, history rewrite),
#   - shell writes to appsettings*.json, Web*.config and publish files (they would skip guard-edits),
#   - branch names without the claude- marker,
#   - commits on master/Master, and commits whose staged diff contains a credential.
# Permission rules in settings.json cover the simple cases; this hook also catches them inside
# compound commands and in the PowerShell tool. Fails open if the input can't be parsed.

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\secret-patterns.ps1"

try {
    $evt = [Console]::In.ReadToEnd() | ConvertFrom-Json
} catch { exit 0 }

$cmd = [string]$evt.tool_input.command
if ([string]::IsNullOrWhiteSpace($cmd)) { exit 0 }
$cwd = if ($evt.cwd) { [string]$evt.cwd } else { (Get-Location).Path }

function Block([string]$reason) {
    [Console]::Error.WriteLine("Blocked by .claude/hooks/guard-commands.ps1: $reason")
    exit 2
}

# --- SQL against non-local servers -----------------------------------------------------------
if ($cmd -match '(?i)\b(sqlcmd|osql|bcp|Invoke-Sqlcmd|Invoke-DbaQuery)\b') {
    $local = '(?i)(-S|-ServerInstance)\s*["'']?(localhost|\(local\)|\.|127\.0\.0\.1|\(localdb\)\\[\w.]+|\.\\\w+|localhost\\\w+)["'']?(\s|$|,)'
    if ($cmd -notmatch $local) {
        Block "SQL tools may only target a local server from Claude. Write the change as a .sql script (see /db-change) for a human to run on UAT, then production."
    }
}

# --- Deploy / IIS -----------------------------------------------------------------------------
if ($cmd -match '(?i)\b(iisreset|appcmd(\.exe)?|msdeploy(\.exe)?|Restart-WebAppPool|Stop-WebSite|Start-WebSite|New-WebApplication)\b') {
    Block "deployment and IIS commands are run by a human or the CI pipeline, not from a Claude session."
}
if ($cmd -match '(?i)(robocopy|xcopy|Copy-Item|cp)\b.*([A-Z]:\\Hosting|\\\\[\w.-]+\\|/c/Hosting|/e/Hosting)') {
    Block "copying into a hosting folder or network share is a deployment. Hand it to the release process."
}
if ($cmd -match '(?i)dotnet\s+publish\b.*(-o|--output)\s+["'']?([A-Z]:\\Hosting|\\\\)') {
    Block "publishing straight into a hosting folder is a deployment. Publish to a local folder instead."
}

# --- Git rules: where a git command starts ------------------------------------------------------
# git must start a command: line start, after ; & | ( { or a backtick, or as the script of a wrapper
# (powershell -Command "...", bash -c '...', cmd /c, Invoke-Expression). Global options (-C path,
# -c key=value, --no-pager) may sit between git and the subcommand. Text inside a commit message
# ("fix push notification", "'git branch x'") doesn't match.
$gitSub = '(?i)(?:^|[;&|({`\r\n]\s*|(?:-Command|-c|/c|Invoke-Expression|iex)\s+["'']?\s*)git(?:\s+(?:-C\s+\S+|-c\s+\S+|--[\w-]+(?:=\S+)?))*\s+'

# --- Destructive git ----------------------------------------------------------------------------
if ($cmd -match ($gitSub + 'push\b')) { Block "pushing is done by a human after review." }
if ($cmd -match ($gitSub + 'reset\b[^|;&\r\n]*\s--hard\b')) { Block "'git reset --hard' discards work. Ask the user to do it if it is really needed." }
if ($cmd -match ($gitSub + 'clean\b[^|;&\r\n]*\s-[a-z]*f')) { Block "'git clean -f' deletes untracked files. Ask the user." }
if ($cmd -match ($gitSub + '(?:filter-branch|filter-repo|replace)\b')) { Block "history rewriting needs an explicit human decision." }
if ($cmd -match ($gitSub + 'branch\s+-[dD]\s+(master|main)\b')) { Block "deleting the default branch is not allowed." }

# --- Shell writes to config files ---------------------------------------------------------------------
# guard-edits checks Edit/Write for credentials and connection strings; writing the same files from the
# shell would skip it. Reading them (cat, grep, copying them elsewhere) is not affected.
$cfg = '(?:appsettings(?:\.[\w-]+)?\.json|web(?:\.[\w-]+)?\.config(?:_live)?|[\w-]+\.pubxml(?:\.user)?|[\w-]+\.publishsettings)'
$cfgPath = '["'']?[^\s"'';&|<>]*' + $cfg + '["'']?'
$shellWrite = @(
    ('>{1,2}\s*' + $cfgPath),                                                            # > or >> redirect
    ('\btee\b(?:\s+-a)?\s+' + $cfgPath),                                                 # tee [-a]
    ('\bsed\b[^|;&\r\n]*\s-i[^|;&\r\n]*' + $cfg),                                        # sed -i
    ('\b(?:Set-Content|Add-Content|Out-File)\b[^|;&\r\n]*' + $cfg),                      # PowerShell writers
    ('WriteAll(?:Text|Lines|Bytes)\s*\([^)]*' + $cfg),                                   # [IO.File]::WriteAll*
    ('\b(?:cp|mv|Copy-Item|Move-Item|Rename-Item|ren)\b[^|;&\r\n]*\s' + $cfgPath + '\s*(?:$|[;&|\r\n])')   # copy/move ONTO a config file
)
foreach ($p in $shellWrite) {
    if ($cmd -match ('(?i)' + $p)) {
        Block "writing to config or publish files from the shell skips the credential and connection-string checks. Use the Edit tool (placeholders such as __SET_ON_SERVER__ for values), or describe the change for the server's config in the PR."
    }
}

# --- Branch names -----------------------------------------------------------------------------------
# Branches created from a Claude session carry a 'claude-' marker after the type (feat/claude-ins-02-x),
# so reviewers can tell them apart. Branches people create outside Claude are not affected.
$newBranch = $null
if ($cmd -match ($gitSub + '(?:switch\s+(?:-c|--create|--force-create)|checkout\s+-b|worktree\s+add\b[^|;&]*?\s-b)\s+["'']?([^\s"'';&|]+)')) { $newBranch = $Matches[1] }
elseif ($cmd -match ($gitSub + 'branch\s+(?!-)([^\s"'';&|]+)')) { $newBranch = $Matches[1] }
if ($newBranch -and $newBranch -notmatch '^[a-z]+/claude-[\w.-]+$') {
    Block "branches created from Claude are named <type>/claude-<ticket>-<short-name>, e.g. feat/claude-ins-02-ops-workload (got '$newBranch')."
}

# --- Commits --------------------------------------------------------------------------------------
if ($cmd -match ($gitSub + 'commit\b')) {
    # Check the repo the commit actually happens in: 'cd <path> && git commit' or 'git -C <path> commit',
    # not the session folder. Git Bash paths (/d/projects/...) are converted to D:\projects\...
    function Resolve-RepoPath([string]$p, [string]$base) {
        if ($p -match '^/([a-zA-Z])(/.*)?$') { $p = $Matches[1].ToUpper() + ':' + ($(if ($Matches[2]) { $Matches[2] } else { '\' })).Replace('/', '\') }
        if ([IO.Path]::IsPathRooted($p)) { return $p }
        return (Join-Path $base $p)
    }
    $repoDir = $cwd
    $commitAt = ([regex]::Match($cmd, $gitSub + 'commit\b')).Index
    foreach ($m in [regex]::Matches($cmd, '(?i)(?:^|[;&|]\s*)(?:cd|Set-Location|pushd)\s+(?:"([^"]+)"|''([^'']+)''|([^\s;&|]+))')) {
        if ($m.Index -ge $commitAt) { break }
        $p = @($m.Groups[1].Value, $m.Groups[2].Value, $m.Groups[3].Value) | Where-Object { $_ } | Select-Object -First 1
        $repoDir = Resolve-RepoPath $p $repoDir
    }
    if ($cmd -match '(?i)\bgit\s+-C\s+(?:"([^"]+)"|''([^'']+)''|(\S+))(?:\s+(?:-c\s+\S+|--[\w-]+(?:=\S+)?))*\s+commit\b') {
        $p = @($Matches[1], $Matches[2], $Matches[3]) | Where-Object { $_ } | Select-Object -First 1
        $repoDir = Resolve-RepoPath $p $repoDir
    }
    if (-not (Test-Path -LiteralPath $repoDir)) { $repoDir = $cwd }
    Push-Location $repoDir
    # Windows PowerShell 5.1 turns any git stderr line (e.g. "LF will be replaced by CRLF") into a terminating
    # error under 'Stop', which made this hook exit 1 and Claude Code skip it. Run git with 'Continue'.
    $ErrorActionPreference = 'Continue'
    try {
        if (-not (& git rev-parse --is-inside-work-tree 2>$null)) { exit 0 }   # not a repo: nothing to commit
        $branch = (& git branch --show-current 2>$null)
        if ($branch -match '^(master|Master|main)$') {
            Block "you are on '$branch'. Create a branch first: git switch -c <type>/claude-<ticket>-<name>."
        }
        $diff = (& git diff --cached --no-color -U0 2>$null) -join "`n"
        $added = ($diff -split "`n" | Where-Object { $_ -match '^\+' -and $_ -notmatch '^\+\+\+' }) -join "`n"
        $found = Find-Secrets $added
        if ($found.Count -gt 0) {
            Block "the staged changes look like they contain a credential ($($found -join ', ')). Unstage it, move the value to server config / a secret store, and reference the key name."
        }
        $sensitive = (& git diff --cached --name-only 2>$null) | Where-Object { $_ -match '(?i)(aadhar|aadhaar|panimg|pan_img|form60|/upload/|costsheet-qr/|\.pubxml|web\.config_live)' }
        if ($sensitive) {
            Block "staged files look like customer documents, runtime output or live config: $($sensitive -join ', '). These must not be committed."
        }
    } finally { Pop-Location }
}

exit 0
