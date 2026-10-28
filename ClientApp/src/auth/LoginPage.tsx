// OTP sign-in, the same two steps and look as the Insights login (Views/Account/Login.cshtml, wwwroot/js/login.js):
// email → Send OTP (resend after 60 s) → 6-digit OTP → Verify & Login. The token from Account/ValidateUserOTP goes to
// sessionStorage only. Rate limiting of these routes must be enforced by the API (the browser can't).
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import logo from '../assets/logo-southern.png';
import '../styles/insights/login.css';
import { ApiError, accountCall, prop } from '../lib/api';
import { safeReturnTo, setSession } from '../lib/auth';

const RESEND_SECONDS = 60;

export default function LoginPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [error, setError] = useState(params.get('expired') ? 'Your session has expired. Please sign in again.' : '');
  const [info, setInfo] = useState('');

  useEffect(() => {
    document.body.classList.add('login-page');
    return () => document.body.classList.remove('login-page');
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const show = (err: string, inf = '') => { setError(err); setInfo(inf); };
  const failText = (e: unknown, fallback: string) => (e instanceof ApiError && e.status === 0 ? e.message : fallback);

  async function sendOtp() {
    const value = email.trim();
    if (!value.includes('@')) return show('Please enter a valid email address.');
    setBusy(true);
    try {
      const r = await accountCall('SendOTP', { EmailId: value });
      if (prop<boolean>(r, 'success') !== true) return show(prop<string>(r, 'message') || 'Failed to send OTP.');
      setOtpSent(true);
      setWait(RESEND_SECONDS);
      show('', prop<string>(r, 'message') || 'OTP sent to your email.');
    } catch (e) {
      show(failText(e, 'Failed to send OTP.'));
    } finally {
      setBusy(false);
    }
  }

  async function verify(ev: FormEvent) {
    ev.preventDefault();
    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) return show('Please enter the 6-digit OTP sent to your email.');
    setBusy(true);
    try {
      const r = await accountCall('ValidateUserOTP', { EmailId: email.trim(), OTPCode: code });
      const user = prop(r, 'objOTPLogin');
      const token = prop<string>(user, 'accessToken');
      const userName = prop<string>(user, 'userName');
      if (prop<boolean>(r, 'success') !== true || !token || !userName) return show(prop<string>(r, 'message') || 'OTP validation failed.');
      setSession({
        token,
        userName,
        name: prop<string>(user, 'name') || userName,
        opsBranch: prop<string>(user, 'opsBranch') ?? '',
        isAdmin: prop<boolean>(user, 'isAdmin') === true,
      });
      // Full page load, so the report starts with only its own styles.
      window.location.replace(import.meta.env.BASE_URL.replace(/\/$/, '') + safeReturnTo(params.get('returnTo')));
    } catch (e) {
      show(failText(e, 'OTP validation failed.'));
      setBusy(false);
    }
  }

  return (
    <main className="login-card">
      <img src={logo} alt="Southern Travels" className="login-logo" />
      <h1 className="login-title">Insights <span>Login</span></h1>
      <p className="login-sub">Sign in with the one-time password sent to your work email.</p>

      <div className="login-msg login-msg-error" role="alert" hidden={!error}>{error}</div>
      <div className="login-msg login-msg-info" role="status" hidden={!info}>{info}</div>

      <form onSubmit={verify} noValidate>
        <label className="login-label" htmlFor="email">Email address <span className="req">*</span></label>
        <div className="login-row">
          <input
            type="email" id="email" className="login-input" value={email} placeholder="name@southerntravels.com"
            autoComplete="username" required autoFocus readOnly={otpSent && wait > 0}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !otpSent) { e.preventDefault(); void sendOtp(); } }}
          />
          <button type="button" className="login-btn login-btn-secondary" disabled={busy || wait > 0} onClick={() => void sendOtp()}>
            {otpSent ? 'Resend OTP' : 'Send OTP'}
          </button>
        </div>
        <p className="login-hint" hidden={wait <= 0}>You can resend the OTP in <span>{wait}</span>s</p>

        <div hidden={!otpSent}>
          <label className="login-label" htmlFor="otp">OTP <span className="req">*</span></label>
          <input
            type="text" id="otp" className="login-input login-otp" maxLength={6} inputMode="numeric" pattern="[0-9]{6}"
            autoComplete="one-time-code" placeholder="••••••" value={otp} onChange={(e) => setOtp(e.target.value)}
          />
          <button type="submit" className="login-btn login-btn-primary" disabled={busy}>Verify &amp; Login</button>
        </div>
      </form>
    </main>
  );
}
