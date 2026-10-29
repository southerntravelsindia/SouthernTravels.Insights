# Security rules — Southern Travels

These apply to every change, in every repo. The full checklist with real examples is in `.claude/kit/SECURITY-CHECKLIST.md`; run `/review` before a PR.

## Never introduce, always flag in review

These patterns were all found live in this estate (Oct 2026 code review). Do not copy them from neighbouring code, even if "that's how the rest of the file does it".

1. **Identity from the client.** Never set or trust `Session["UserId" | "BranchUserId" | "AgentId" …]`, a user name or a role from the query string, form fields, hidden inputs or the JSON body. Identity comes only from the server-side session or a validated token.
2. **Auth that isn't enforced.** Every new endpoint or page needs a server-side check (`[Authorize]` / policy, session guard, or `ValidateToken`, whichever the app uses). No commented-out checks. No "rights" enforced only by hiding a button or calling `history.back()`.
3. **Shared keys as user auth.** A shared app key (`AppKey:stplkey` / `securityKey`) authenticates a *calling system*, never a user. Don't extend the "key matches → any UserName is accepted" pattern.
4. **Secrets or credentials sent to the client.** Never return OTPs, password hashes, stored passwords, mailbox credentials or API keys in a response, view model, hidden field or log line.
5. **Payment results trusted without verification.** A payment is captured only after you verify the gateway signature or hash, the status, the amount against the order, and the order id against the session/booking. Never treat "any non-empty result" as captured, and never ship a test page that forces `CAPTURED`.
6. **Money or seat updates without atomicity.** Wallet debits, balances, seat blocks, ticket and file numbers: do them in one DB transaction with a lock or a conditional update. Never "read the last balance in C#, add the delta, insert".
7. **SQL built from strings.** Parameters only (`SqlParameter`, Dapper params). No concatenating input into SQL, `EXEC`, `ORDER BY` or table names. Stripping characters is not a defence.
8. **Paths from input.** Never build file paths from `Request.QueryString` / form values without an allow-list and `Path.GetFullPath` containment check.
9. **Weak crypto.** No new MD5/SHA1 for passwords, no static or zero IVs, no keys in code. Passwords: a salted, slow hash (PBKDF2 / bcrypt / Argon2).
10. **TLS bypass.** Never set `ServerCertificateValidationCallback` to always-true or `DangerousAcceptAnyServerCertificateValidator`.
11. **Open redirects.** Redirect targets (`returnUrl`, `RedirectUrl`, `src`) must be local (`Url.IsLocalUrl`) or allow-listed.
12. **Sensitive files in the web root.** Uploads, PDFs, QR copies, Aadhaar/PAN images and logs go outside `wwwroot` / the site folder, and are served through an authorised handler.

## Secrets and personal data

- Never write a credential, key, token, connection string, server name or IP into code, docs, commit messages or prompts. Refer to the config **key name** instead.
- **Don't echo config values.** When you read `appsettings*.json` or `Web.config`, quote key names and structure only. To find a line, search for the key (`grep -n '"Jwt"'`) rather than printing the file. Values you have already seen stay out of your replies.
- The repos already contain committed secrets. Don't copy, quote or move them. If you touch a file that has one, say so in the PR (`file:line`, key name only) so it can be rotated.
- Treat customer data (names, mobiles, e-mails, PAN, Aadhaar, passport, card numbers) as confidential. Don't paste real rows into prompts, tests or fixtures; use synthetic data.
- Customer document images and runtime output must not be committed. Add the folder to `.gitignore` if you find it tracked.

## External actions

Anything that sends a message (SMS, WhatsApp, e-mail), charges money, calls a gateway or writes to a production system needs explicit human approval for that action. Check the environment guard first (e.g. `WhatsAppSettings:IsLive`, `Environment:Mode`) and don't add paths that skip it.
