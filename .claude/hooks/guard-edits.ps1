# PreToolUse hook for Edit | Write | MultiEdit.
# Blocks (exit 2, reason on stderr):
#   1. edits to live / publish / certificate files,
#   2. new content that contains a credential,
#   3. edits that change connection strings in Web.config / appsettings*.json (they are set per server).
# Reads the hook JSON from stdin. Fails open (exit 0) if the input can't be parsed, so a broken hook never blocks work.

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\secret-patterns.ps1"

try {
    $raw = [Console]::In.ReadToEnd()
    $evt = $raw | ConvertFrom-Json
} catch { exit 0 }

$ti = $evt.tool_input
$path = [string]$ti.file_path
$name = [IO.Path]::GetFileName($path)

function Block([string]$reason) {
    [Console]::Error.WriteLine("Blocked by .claude/hooks/guard-edits.ps1: $reason")
    exit 2
}

# 1. Files that must never be edited from a Claude session.
if ($name -match '(?i)^web\.config_live$|\.pubxml(\.user)?$|\.publishsettings$|\.pfx$|\.snk$|^appsettings\.(production|live|prod)\.json$|^\.env(\.(?!example$|sample$|template$)[\w.-]+)?$') {
    Block "'$name' is a live/publish/certificate/environment file. Change it by hand on the server or through the release process, and describe the change in the PR."
}

# Collect the text being written.
$texts = @()
if ($ti.content)    { $texts += [string]$ti.content }
if ($ti.new_string) { $texts += [string]$ti.new_string }
if ($ti.edits)      { foreach ($e in $ti.edits) { if ($e.new_string) { $texts += [string]$e.new_string } } }
$newText = $texts -join "`n"

$oldTexts = @()
if ($ti.old_string) { $oldTexts += [string]$ti.old_string }
if ($ti.edits)      { foreach ($e in $ti.edits) { if ($e.old_string) { $oldTexts += [string]$e.old_string } } }
$oldText = $oldTexts -join "`n"

# 2. Credentials in new content. Only flag what is newly introduced (not text the edit merely keeps).
$found = Find-Secrets $newText
if ($found.Count -gt 0) {
    $already = Find-Secrets $oldText
    $introduced = $found | Where-Object { $already -notcontains $_ }
    if ($evt.tool_name -eq 'Write' -or $introduced.Count -gt 0) {
        $list = (($(if ($introduced.Count) { $introduced } else { $found })) -join ', ')
        Block "the new content looks like it contains a credential ($list). Reference the config key name instead and keep the value in the server's config / a secret store. If this is a false positive, use an obvious placeholder such as __SET_ON_SERVER__."
    }
}

# 3. Connection strings in config files.
#    Three checks, because a narrow edit (just "server=a" -> "server=b") contains neither the section name nor the key:
#    a) the edit text mentions the connection-string section or attribute;
#    b) the edit text contains connection-string keywords;
#    c) the text being replaced sits inside the file's ConnectionStrings / <connectionStrings> section.
function Test-InsideConnectionSection([string]$file, [string]$old) {
    if (-not $old -or -not (Test-Path -LiteralPath $file)) { return $false }
    $content = [IO.File]::ReadAllText($file)
    $at = $content.IndexOf($old)
    if ($at -lt 0) { return $false }
    if ($file -match '(?i)\.json$') {
        $m = [regex]::Match($content, '"ConnectionStrings"\s*:\s*\{', 'IgnoreCase')
        if (-not $m.Success) { return $false }
        $depth = 0; $start = $m.Index + $m.Length - 1
        for ($i = $start; $i -lt $content.Length; $i++) {
            if ($content[$i] -eq '{') { $depth++ } elseif ($content[$i] -eq '}') { $depth--; if ($depth -eq 0) { return ($at -ge $start -and $at -le $i) } }
        }
        return $false
    }
    $m = [regex]::Match($content, '(?is)<connectionStrings\b.*?</connectionStrings>')
    return ($m.Success -and $at -ge $m.Index -and $at -lt ($m.Index + $m.Length))
}
if ($name -match '(?i)^web(\.\w+)?\.config$|^appsettings(\.\w+)?\.json$') {
    $connWords = '(?i)connectionString|"ConnectionStrings"|\b(data source|server|initial catalog|database|user id|uid|pwd|password|integrated security|trusted_connection|persist security info|trustservercertificate)\s*='
    $touchesConn = ($newText -match $connWords) -or ($oldText -match $connWords)
    if (-not $touchesConn) {
        $olds = @()
        if ($ti.old_string) { $olds += [string]$ti.old_string }
        if ($ti.edits) { foreach ($e in $ti.edits) { if ($e.old_string) { $olds += [string]$e.old_string } } }
        foreach ($o in $olds) { if (Test-InsideConnectionSection $path $o) { $touchesConn = $true; break } }
    }
    if ($touchesConn) {
        Block "this edit changes connection strings in '$name'. Connection strings are environment-specific and are maintained on each server. Describe the required change in the PR instead."
    }
}

exit 0
