# Southern Travels security checklist

Used by `/review`, the `security-reviewer` agent and human reviewers. Every **Seen in** entry is a real defect from the Oct 2026 code review (details in docs-claude `apps/<app>/code-map.md`). New code must not repeat these patterns, and reviews must look for them.

Mark each item **Pass**, **Fail** (with `path:line`), **N/A**, or **Not verified** (say why).

## A. Identity and authentication

| # | Check | Seen in |
|---|---|---|
| A1 | User / branch / agent identity comes only from the server-side session or a validated token, never from a query string, form, hidden field or JSON body. | Branch `Agent/AgentTempLogin.aspx` sets `Session["BranchUserId"]` from `?BranchUserId=`; EMS `LoginEMS?BranchUserId=` logs in with no password |
| A2 | Every new page or endpoint enforces auth server-side (`[Authorize]` / policy, session guard, or the app's token check). Nothing is commented out "temporarily". | CostSheet API: no active `[Authorize]`; ~39 Operation actions have their check commented out. CostSheet UI: `AdminOnly` policy defined but never applied |
| A3 | Public allow-lists use exact routes, not path prefixes. | CostSheet UI `SessionMiddleware` prefix `/operations/bookingrequest` also opens internal `BookingRequest*PriceApproval` pages |
| A4 | A shared app key authenticates a calling *system* only. It must not let the caller act as any user name. | CostSheet API `ValidateToken`: `securityKey == AppKey:stplkey` accepted for any `UserName` |
| A5 | OTPs, password hashes and stored passwords are never returned to the client, logged or put into URLs. | API `SendOTP` returns `OtpCode`; Admin login writes the digest into the response; EMS redirects with `?password=` |
| A6 | Passwords use a salted slow hash (PBKDF2 / bcrypt / Argon2), not MD5 or plaintext. Comparisons are constant-time. | MD5 (with a clock-based "salt") in Admin, Branch, Agent and the API; plaintext in Website customers and NimbleBiz tenants |
| A7 | Password reset requires a token sent to the verified channel, and the server generates the new secret. | Admin `RessetAgentPassword.aspx?UID=` with no session and a master old password; Agent forgot-password saves a hash posted by the browser |
| A8 | Login and OTP POST endpoints are rate-limited, and sessions are renewed on login. | CostSheet UI rate-limits the GET pages only; no session renewal in Agent |
| A9 | Redirect targets are local or allow-listed. | CostSheet UI `returnUrl` / `RedirectUrl`; Admin `?src=` |

## B. Authorization and object access

| # | Check | Seen in |
|---|---|---|
| B1 | Rights and roles are enforced on the server for every action, not by hiding buttons or calling `history.back()`. | Admin `chkRoles`; EMS role rights only hide buttons |
| B2 | Object-level access: a user can only read or modify their own branch's, agent's or vendor's records. Ids in URLs or bodies are checked against the session. | Agent `AgentTicket.aspx?orderid=` shows any ticket |
| B3 | Approval actions verify that the caller is an approver at the right level for the amount and branch. | API internal approval actions have no check |

## C. Payments, money and quantities

| # | Check | Seen in |
|---|---|---|
| C1 | Gateway responses are verified: signature or hash, the status value, the amount against the order, and the order id against the booking. Only then is the booking marked paid. | Website and Agent `PaymentResult.aspx` treat any non-empty `Result` as captured; only CCAvenue checks the amount |
| C2 | No test or simulator payment paths are reachable in deployed code. | Branch `TestCreditCardPayment.aspx` hard-codes `CAPTURED` |
| C3 | Amounts are computed on the server from master data, never taken from posted form fields. | Agent hotel, special tour and car pages debit browser-supplied totals |
| C4 | Wallet, balance, seat and number updates are atomic: one transaction, a lock or conditional update, and a re-check inside it. | Agent wallet debit is "last balance + delta" with no transaction; Admin `AgentDeductFunds` is two calls; EMS enquiry number is MAX+1 |
| C5 | Finalisation steps are idempotent and use POST. Refreshing or replaying the request must not create a second ticket or ledger row. | Branch `BranchProcess.aspx` finalises on GET from query-string values |
| C6 | Status codes and product codes match end to end (writer and reader agree). | Website `TourBooking` saves `FixedTours`, but `PaymentResult` handles only `EBK` |

## D. Injection and input handling

| # | Check | Seen in |
|---|---|---|
| D1 | SQL is parameterised: no concatenated input in SQL text, `EXEC`, `ORDER BY` or object names. Character stripping doesn't count. | ~84 statements in Branch, 112 inline-SQL files in Admin, `MBKCityPlaces.asmx` |
| D2 | Proc names are not taken from user input (dropdown values, query strings). | Admin `TMSToTally.aspx` runs `new SqlCommand(SelectedValue)` |
| D3 | File paths are built only from allow-listed names and checked with `Path.GetFullPath` containment. | Agent `download.aspx?file=..\Web.config` |
| D4 | Uploads: type and size checks, a server-generated name, and storage outside the web root. | EMS uploads (1 GB, no type check, web root) |
| D5 | Output is encoded (Razor default, `HttpUtility.HtmlEncode` in Web Forms). No `Html.Raw` or `Response.Write` of user data. | — |
| D6 | State-changing requests are protected against CSRF (antiforgery token, or ViewState MAC in Web Forms). | CostSheet UI checks antiforgery on only 4 actions |

## E. Secrets, crypto and transport

| # | Check | Seen in |
|---|---|---|
| E1 | No credentials, keys, tokens or connection strings in code, config committed to git, comments, docs or logs. | Committed in all 7 repos; `Web.Config_live` in EMS; Razorpay secret written to logs |
| E2 | No static or zero IVs, and no keys in code. Use the platform crypto APIs. | Website payment-link `KID` (TripleDES, zero IV); Branch `ClsServiceCommon` keys |
| E3 | TLS certificate validation stays on. | Website `DataLib` and EMS set an always-true callback |
| E4 | Services such as `.asmx` and `WS` proxies authenticate callers and don't proxy arbitrary calls. | Branch and Admin `MbkTicketing.asmx` (incl. `STGetPWD`); EMS `WSController` |
| E5 | Webhooks verify signatures. Verify tokens are separate from internal keys. | API Meta webhook reuses `stplkey` and doesn't check signatures |

## F. Personal data and files

| # | Check | Seen in |
|---|---|---|
| F1 | PAN, Aadhaar, passport and card data: collected only where required, masked in UI and logs, stored outside the web root, never committed. | Aadhaar/PAN images committed in Admin and in the Agent web root |
| F2 | Cost, margin and vendor documents are not publicly reachable. | CostSheet UI `wwwroot/costsheet-qr/`, `wwwroot/Upload/<MBKID>/cost/` |
| F3 | Logs exclude request bodies containing passwords, OTPs or tokens. | API `ApiActivityLog.RequestData` stores plaintext passwords |

## G. Environment and side effects

| # | Check | Seen in |
|---|---|---|
| G1 | External sends (WhatsApp, SMS, e-mail, payments) respect the environment guard. | CostSheet UI `SendVoucherWhatsApp` skips `WhatsAppSettings:IsLive` |
| G2 | Release config is a real transform. Debug is off and custom errors are on in deployed builds. | All four Web Forms apps: `Web.Release.config` is a standalone copy with `debug=true` |
| G3 | Errors returned to clients carry no stack traces or exception text. | API returns exception messages in 545 places |
| G4 | Forwarded headers (`X-Forwarded-For`) are trusted only from known proxies. | API `ClientIpMiddleware` |
