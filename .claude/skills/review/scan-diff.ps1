# Heuristic scan of added lines in the branch diff for Southern Travels checklist patterns.
# Output: one line per hit: <checklist id>  <file>:<line>  <pattern name>. Hits are pointers for review, not verdicts.
param([string]$Base = '')

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\..\hooks\secret-patterns.ps1')

if (-not $Base) {
    $Base = if (& git rev-parse --verify --quiet master) { 'master' } elseif (& git rev-parse --verify --quiet Master) { 'Master' } else { 'HEAD~1' }
}
$mergeBase = (& git merge-base $Base HEAD).Trim()

$checks = @(
    @{ Id='A1'; Name='identity/session set from request';   Regex='Session\s*\[\s*"[^"]*(User|Branch|Agent|Role|Admin|Vendor)[^"]*"\s*\]\s*=\s*[^;]*Request\s*[\.\[]' }
    @{ Id='A1'; Name='identity read from query/form';       Regex='(?i)(Request\.(QueryString|Form|Params)|\[FromQuery\]|\[FromForm\])[^;]*(UserId|BranchUserId|AgentId|UserName|Role|IsAdmin)' }
    @{ Id='A2'; Name='commented-out auth';                  Regex='//\s*(\[Authorize|\[AllowAnonymous|if\s*\(\s*!?\s*ValidateToken|ValidateSession)' }
    @{ Id='A2'; Name='AllowAnonymous added';                Regex='\[AllowAnonymous\]' }
    @{ Id='A4'; Name='shared key compared to request';      Regex='(?i)(stplkey|AppKey|securityKey)[^;]*==' }
    @{ Id='A5'; Name='OTP/password in a response object';   Regex='(?i)new\s*\{[^}]*\b(Otp\w*|Password\w*|Pwd\w*)\s*=' }
    @{ Id='A5'; Name='OTP/password passed to a response';   Regex='(?i)\b(Ok|Json|Content|BadRequest|Response\.Write)\s*\([^;]*\b(otp\w*|password\w*|pwd)\b' }
    @{ Id='A5'; Name='OTP/password written to a log';       Regex='(?i)\b(Log\w*|_logger\.\w+|logger\.\w+|Console\.Write\w*|LogWrite|Trace\.\w+)\s*\([^;]*\b(otp\w*|password\w*|pwd)\b' }
    @{ Id='A6'; Name='MD5/SHA1 for passwords';              Regex='(?i)\b(MD5|SHA1)(\.Create|CryptoServiceProvider|Managed)?\b|HexMd5|HashPasswordForStoringInConfigFile' }
    @{ Id='A9'; Name='redirect to request value';           Regex='(?i)Redirect(Permanent)?\s*\([^)]*(Request|returnUrl|RedirectUrl|src)\b' }
    @{ Id='B1'; Name='client-side-only rights';             Regex='history\.back\(\)' }
    @{ Id='C1'; Name='payment status shortcut';             Regex='(?i)("CAPTURED"|"SUCCESS"|"Success")\s*[;)]|Result\s*!=\s*""\s*\|\|' }
    @{ Id='C3'; Name='amount from posted field';            Regex='(?i)\b\w*(amt|amount|fare|total|price)\w*\.(Text|Value)\b|Request\.Form\s*\[\s*"[^"]*(amt|amount|fare|total|price)' }
    @{ Id='C4'; Name='balance math in code';                Regex='(?i)(balance|wallet)\w*\s*[-+]=|Session\s*\[\s*"Balance"\s*\]' }
    @{ Id='C5'; Name='state change on GET';                 Regex='(?i)\[HttpGet\][\s\S]{0,80}(Insert|Update|Delete|Save|Cancel|Approve)' }
    @{ Id='D1'; Name='SQL built by concatenation';          Regex='(?i)"\s*(select|insert|update|delete|exec)\b[^"]*"\s*\+|\$"\s*(select|insert|update|delete|exec)\b[^"]*\{|ExecuteSqlRaw\s*\(\s*\$|FromSqlRaw\s*\(\s*\$' }
    @{ Id='D2'; Name='command text from input';             Regex='(?i)new\s+SqlCommand\s*\(\s*[^"\s)][^,)]*(SelectedValue|Request|\.Text)' }
    @{ Id='D3'; Name='file path from input';                Regex='(?i)(Path\.Combine|MapPath|File\.(Open|Read|Write|Delete)|TransmitFile|WriteFile)\s*\([^)]*(Request|QueryString|\.Text|fileName)' }
    @{ Id='D5'; Name='raw HTML output';                     Regex='Html\.Raw\(|Response\.Write\(' }
    @{ Id='E3'; Name='TLS validation disabled';             Regex='ServerCertificateValidationCallback|DangerousAcceptAnyServerCertificateValidator|RemoteCertificateValidationCallback' }
    @{ Id='E2'; Name='static/zero IV or key in code';       Regex='(?i)\b(IV|Key)\s*=\s*(new\s+byte\s*\[\s*\d+\s*\]|Encoding\.\w+\.GetBytes\s*\(\s*")' }
    @{ Id='F1'; Name='PII field handling';                  Regex='(?i)\b(Aadh?aa?r\w*|PanNo\w*|PanImg\w*|Passport\w*|CardNumber\w*)' }
    @{ Id='G1'; Name='external send';                       Regex='(?i)\b(SendWhatsApp|SendSms|SendMail|SmtpClient|Nimblebiz|MobilNxt)\w*\s*\(' }
    @{ Id='G3'; Name='exception text returned';             Regex='(?i)\b(Ok|BadRequest|Json|StatusCode|Problem|Content|Response\.Write)\s*\([^;]*\b(ex|exception|e)\.(Message|ToString\(\)|StackTrace)|Message\s*=\s*(ex|exception|e)\.(Message|ToString\(\))' }
)

$files = & git diff --name-only --diff-filter=AM $mergeBase -- . 2>$null
"Base: $Base ($($mergeBase.Substring(0,8)))  Changed files: $(@($files).Count)"
$hits = 0
foreach ($f in $files) {
    $diff = & git diff -U0 --no-color $mergeBase -- $f 2>$null
    $line = 0
    foreach ($d in $diff) {
        if ($d -match '^@@ -\d+(,\d+)? \+(\d+)') { $line = [int]$Matches[2]; continue }
        if ($d -match '^\+\+\+') { continue }
        if ($d -match '^\+') {
            $text = $d.Substring(1)
            foreach ($c in $checks) {
                if ($text -match $c.Regex) { '{0,-4} {1}:{2}  {3}' -f $c.Id, $f, $line, $c.Name; $hits++ }
            }
            foreach ($s in (Find-Secrets $text)) { 'E1   {0}:{1}  possible credential ({2})' -f $f, $line, $s; $hits++ }
            $line++
        }
    }
}
"`n$hits pattern hit(s). Review each against .claude/kit/SECURITY-CHECKLIST.md."
