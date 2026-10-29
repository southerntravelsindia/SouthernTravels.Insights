# Shared secret-detection patterns, dot-sourced by the hooks and by scan-secrets.ps1.
# Each entry: Name, Regex. Keep patterns specific: false positives train people to ignore the hook.

$SecretPatterns = @(
    # Only inside a connection-string-shaped literal (server/database/user + password), not code like `password = request.Password`.
    @{ Name = 'connection string with inline password'; Regex = '(?i)\b(data source|server|initial catalog|database|user id|uid)\s*=[^"''\r\n]*?\b(password|pwd)\s*=\s*[^;"''\s<>{}$][^;"''\s<>]{2,}' }
    # Key material is never a placeholder; the angle-bracket placeholder rule would otherwise skip the XML form.
    @{ Name = 'private key block';                      Regex = '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'; KeyMaterial = $true }
    @{ Name = 'RSA key XML';                            Regex = '<RSAKeyValue>.*<(P|D|DP|DQ|InverseQ)>'; KeyMaterial = $true }
    @{ Name = 'AWS access key';                         Regex = '\b(AKIA|ASIA)[0-9A-Z]{16}\b' }
    @{ Name = 'Razorpay key';                           Regex = '\brzp_(live|test)_[A-Za-z0-9]{10,}' }
    @{ Name = 'Stripe-style secret';                    Regex = '\b(sk|rk)_(live|test)_[A-Za-z0-9]{16,}' }
    @{ Name = 'JWT';                                    Regex = '\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}' }
    @{ Name = 'Meta / Facebook token';                  Regex = '\bEAA[A-Za-z0-9]{40,}' }
    @{ Name = 'Google API key';                         Regex = '\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])' }
    @{ Name = 'secret-named setting with literal value'; Regex = '(?i)"(?:[\w.:-]*(?:password|pwd|secret|apikey|api_key|accesskey|privatekey|token|stplkey|workingkey|encry\w*))"\s*:\s*"[^"$<{][^"]{3,}"' }
    @{ Name = 'secret-named appSetting with literal value'; Regex = '(?i)<add\s+key="[^"]*(?:password|pwd|secret|apikey|accesskey|privatekey|token|workingkey|merchantkey|encry)[^"]*"\s+value="[^"$<{][^"]{3,}"' }
    @{ Name = 'secret assigned in code';               Regex = '(?i)\b(?:password|pwd|secret|apiKey|accessKey|privateKey|token)\w*\s*=\s*@?"[^"\s{$][^"]{5,}"' }
)

# Values that are clearly placeholders are allowed.
$PlaceholderRegex = '(?i)(__[A-Z_]+__|\$\{[^}]+\}|<[^>]+>|changeme|placeholder|your[-_ ]?(key|password|secret)|xxxx|\*\*\*|redacted|set[-_ ]in[-_ ](secret|vault|server)|example)'

function Find-Secrets {
    param([string]$Text)
    $hits = @()
    if ([string]::IsNullOrEmpty($Text)) { return $hits }
    foreach ($p in $SecretPatterns) {
        foreach ($m in [regex]::Matches($Text, $p.Regex)) {
            if (-not $p.KeyMaterial -and $m.Value -match $PlaceholderRegex) { continue }
            $hits += $p.Name
            break
        }
    }
    return ($hits | Select-Object -Unique)
}
