// ─────────────────────────────────────────────────────────────────────────────
// LockScreen.jsx — Passphrase gate for the entire app
//
// States handled:
//   1. "checking"    — verifying server status on mount
//   2. "first-run"   — no password set yet, show setup form
//   3. "locked"      — normal login
//   4. "reset-sent"  — reset email dispatched, waiting
//   5. "reset-form"  — ?reset=TOKEN in URL, show new password form
//   6. "change"      — authenticated user changing their password
//   7. "unlocked"    — renders children
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  validatePassword, isPasswordValid,
  deriveKeyHex, generateSalt,
  storeSessionKey, clearSessionKey, isAuthenticated,
  getDaysLeft,
} from '../lib/auth.jsx';
import { api, AuthError } from '../lib/api.jsx';

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'radial-gradient(ellipse at 30% 40%, #1a2744 0%, #0d0f14 70%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Syne', sans-serif",
  },
  card: {
    width: '100%', maxWidth: 380,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, padding: '36px 32px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  },
  logo: {
    fontSize: 22, fontWeight: 800, letterSpacing: -1,
    color: '#dde1ee', marginBottom: 6,
  },
  logoAccent: { color: '#d4f03a' },
  subtitle: {
    fontSize: 11, color: 'rgba(221,225,238,0.45)',
    letterSpacing: '1.5px', textTransform: 'uppercase',
    marginBottom: 28,
  },
  label: {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: 'rgba(221,225,238,0.5)', letterSpacing: '1px',
    textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '11px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, color: '#dde1ee',
    fontSize: 15, fontFamily: "'Syne', sans-serif",
    outline: 'none', marginBottom: 4,
    transition: 'border-color .15s',
  },
  inputFocus: { borderColor: '#d4f03a' },
  btn: {
    width: '100%', padding: '12px',
    background: '#d4f03a', color: '#0a0b0e',
    border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 800,
    fontFamily: "'Syne', sans-serif",
    cursor: 'pointer', letterSpacing: '.5px',
    transition: 'opacity .15s', marginTop: 16,
  },
  btnDisabled: { opacity: 0.35, cursor: 'not-allowed' },
  btnSecondary: {
    background: 'none', border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(221,225,238,0.55)',
  },
  rule: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 11, marginBottom: 5,
  },
  ruleOk:   { color: '#3de8be' },
  ruleFail: { color: 'rgba(221,225,238,0.3)' },
  err: {
    fontSize: 11, color: '#ff8080',
    background: 'rgba(255,86,86,0.08)',
    border: '1px solid rgba(255,86,86,0.2)',
    borderRadius: 6, padding: '8px 12px',
    marginTop: 10,
  },
  info: {
    fontSize: 11, color: '#7fffd4',
    background: 'rgba(61,232,190,0.07)',
    border: '1px solid rgba(61,232,190,0.2)',
    borderRadius: 6, padding: '8px 12px',
    marginTop: 10, lineHeight: 1.6,
  },
  warn: {
    fontSize: 11, color: '#ffd090',
    background: 'rgba(255,159,67,0.08)',
    border: '1px solid rgba(255,159,67,0.2)',
    borderRadius: 6, padding: '8px 12px',
    marginBottom: 16, lineHeight: 1.5,
  },
  link: {
    background: 'none', border: 'none',
    color: 'rgba(212,240,58,0.7)', fontSize: 11,
    cursor: 'pointer', padding: 0,
    textDecoration: 'underline', marginTop: 12,
    display: 'block', textAlign: 'center',
  },
  spinner: {
    width: 20, height: 20,
    border: '2px solid rgba(255,255,255,0.1)',
    borderTop: '2px solid #d4f03a',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    margin: '0 auto',
  },
};

// ── Password rules display ────────────────────────────────────────────────────
function PasswordRules({ password }) {
  if (!password) return null;
  const rules = validatePassword(password);
  return (
    <div style={{ marginBottom: 12 }}>
      {rules.map(r => (
        <div key={r.label} style={{ ...S.rule, ...(r.ok ? S.ruleOk : S.ruleFail) }}>
          <span>{r.ok ? '✓' : '○'}</span>
          <span>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Expiry warning banner (shown when authenticated, < 14 days left) ──────────
export function ExpiryBanner({ onChangePassword }) {
  const days = getDaysLeft();
  if (days === null || days > 14) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 8000,
      background: days <= 3
        ? 'linear-gradient(90deg, rgba(255,86,86,0.15), rgba(255,86,86,0.08))'
        : 'linear-gradient(90deg, rgba(255,159,67,0.12), rgba(255,159,67,0.06))',
      borderBottom: `1px solid ${days <= 3 ? 'rgba(255,86,86,0.3)' : 'rgba(255,159,67,0.25)'}`,
      padding: '6px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      fontSize: 11, fontFamily: "'Syne', sans-serif",
      color: days <= 3 ? '#ffaaaa' : '#ffd090',
    }}>
      <span>
        {days <= 0
          ? '⚠ Passphrase expired — please change it'
          : `⏰ Passphrase expires in ${days} day${days === 1 ? '' : 's'}`}
      </span>
      <button
        onClick={onChangePassword}
        style={{
          background: 'none', border: '1px solid currentColor',
          borderRadius: 4, padding: '2px 8px', fontSize: 10,
          fontWeight: 700, cursor: 'pointer', color: 'inherit',
          fontFamily: "'Syne', sans-serif",
        }}
      >
        Update now
      </button>
    </div>
  );
}

// ── Main LockScreen ───────────────────────────────────────────────────────────
export default function LockScreen({ children }) {
  const [state,    setState]    = useState('checking');
  const [pw,       setPw]       = useState('');
  const [pw2,      setPw2]      = useState(''); // confirm field
  const [email,    setEmail]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState('');
  const [info,     setInfo]     = useState('');
  const [focused,  setFocused]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [showChange, setShowChange] = useState(false);

  // ── On mount: check for ?reset= token and server setup status ──────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('reset');
    if (token) {
      setResetToken(token);
      setState('reset-form');
      // Clean the token from the URL without a page reload
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    if (isAuthenticated()) { setState('unlocked'); return; }
    checkSetup();
  }, []);

  const checkSetup = async () => {
    setState('checking');
    try {
      const { setupComplete } = await api.setupStatus();
      setState(setupComplete ? 'locked' : 'first-run');
    } catch {
      setError('Cannot reach the API. Check your internet connection.');
      setState('locked');
    }
  };

  // ── Derive key and store in session ────────────────────────────────────────
  const deriveAndStore = async (passphrase, salt) => {
    const keyHex = await deriveKeyHex(passphrase, salt);
    storeSessionKey(keyHex);
    return keyHex;
  };

  // ── FIRST RUN: set up password ─────────────────────────────────────────────
  const handleSetup = async () => {
    if (!isPasswordValid(pw))     { setError('Please satisfy all password requirements.'); return; }
    if (pw !== pw2)                { setError('Passphrases do not match.'); return; }
    if (!email.includes('@'))      { setError('Please enter a valid email address.'); return; }
    setBusy(true); setError('');
    try {
      const salt     = generateSalt();
      const keyHex   = await deriveKeyHex(pw, salt);
      await api.setup({ verifier: keyHex, salt, email });
      storeSessionKey(keyHex);
      setState('unlocked');
    } catch (e) {
      setError(e.message ?? 'Setup failed. Check the API is reachable.');
    }
    setBusy(false);
  };

  // ── LOCKED: normal login ───────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!pw) { setError('Please enter your passphrase.'); return; }
    setBusy(true); setError('');
    try {
      // Fetch server salt, derive key, attempt a ping to verify
      const { salt } = await api.getSalt();
      const keyHex   = await deriveKeyHex(pw, salt);
      storeSessionKey(keyHex);
      // Verify by making an authenticated request
      await api.ping();   // ping is public but we call list to test auth
      // Actually test auth with a real signed request
      await api.tags('_auth_check');
      setState('unlocked');
    } catch (e) {
      clearSessionKey();
      if (e instanceof AuthError || e.status === 401) {
        setError('Incorrect passphrase.');
      } else {
        setError(e.message ?? 'Login failed.');
      }
    }
    setBusy(false);
    setPw('');
  };

  // ── RESET REQUEST ──────────────────────────────────────────────────────────
  const handleResetRequest = async () => {
    setBusy(true); setError(''); setInfo('');
    try {
      await api.requestReset();
      setInfo('Reset link sent — check your email. The link expires in 1 hour.');
      setState('reset-sent');
    } catch {
      setError('Could not send reset email. Try again.');
    }
    setBusy(false);
  };

  // ── RESET FORM: set new password via token ─────────────────────────────────
  const handleResetVerify = async () => {
    if (!isPasswordValid(pw))  { setError('Please satisfy all password requirements.'); return; }
    if (pw !== pw2)             { setError('Passphrases do not match.'); return; }
    setBusy(true); setError('');
    try {
      const salt   = generateSalt();
      const keyHex = await deriveKeyHex(pw, salt);
      await api.verifyReset({ token: resetToken, verifier: keyHex, salt });
      storeSessionKey(keyHex);
      setInfo('Passphrase updated.');
      setState('unlocked');
    } catch (e) {
      setError(e.message ?? 'Reset failed. The link may have expired.');
    }
    setBusy(false);
  };

  // ── CHANGE PASSWORD (authenticated) ───────────────────────────────────────
  const handleChangePassword = async () => {
    if (!isPasswordValid(pw))  { setError('Please satisfy all password requirements.'); return; }
    if (pw !== pw2)             { setError('Passphrases do not match.'); return; }
    setBusy(true); setError('');
    try {
      const salt   = generateSalt();
      const keyHex = await deriveKeyHex(pw, salt);
      await api.changePassword({ verifier: keyHex, salt });
      storeSessionKey(keyHex);
      setShowChange(false);
      setPw(''); setPw2('');
      setInfo('Passphrase changed successfully.');
    } catch (e) {
      setError(e.message ?? 'Change failed.');
    }
    setBusy(false);
  };

  const handleKey = (fn) => (e) => { if (e.key === 'Enter') fn(); };

  // ── Render: unlocked ───────────────────────────────────────────────────────
  if (state === 'unlocked' && !showChange) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <ExpiryBanner onChangePassword={() => setShowChange(true)} />
        {children}

        {/* Change password modal */}
        {showChange && (
          <div style={S.overlay}>
            <div style={S.card}>
              <div style={S.logo}>Change passphrase</div>
              <div style={S.subtitle}>Choose a new secure passphrase</div>
              <PasswordFields
                pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2}
                showPw={showPw} setShowPw={setShowPw}
                focused={focused} setFocused={setFocused}
              />
              {error && <div style={S.err}>{error}</div>}
              <PrimaryBtn onClick={handleChangePassword} busy={busy} disabled={!isPasswordValid(pw) || pw !== pw2}>
                Update passphrase
              </PrimaryBtn>
              <button style={S.link} onClick={() => { setShowChange(false); setError(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Render: lock screen states ─────────────────────────────────────────────
  const titles = {
    checking:   ['Connecting…',       'Reaching your API'],
    'first-run':['Welcome',           'Set up your passphrase'],
    locked:     ['Commonplace Book',  'Enter your passphrase to continue'],
    'reset-sent':['Check your email', 'Reset link sent'],
    'reset-form':['Reset passphrase', 'Choose a new passphrase'],
  };
  const [title, subtitle] = titles[state] ?? ['Commonplace Book', ''];

  return (
    <div style={S.overlay}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&display=swap');
      `}</style>
      <div style={S.card}>
        <div style={S.logo}>
          day<span style={S.logoAccent}>.</span>plan
          <span style={{ fontSize: 11, color: 'rgba(221,225,238,0.3)', fontWeight: 400, marginLeft: 8 }}>
            commonplace
          </span>
        </div>
        <div style={S.subtitle}>{subtitle}</div>

        {/* ── CHECKING ── */}
        {state === 'checking' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={S.spinner} />
          </div>
        )}

        {/* ── FIRST RUN ── */}
        {state === 'first-run' && (
          <>
            <p style={{ fontSize: 11, color: 'rgba(221,225,238,0.5)', marginBottom: 20, lineHeight: 1.7 }}>
              This is your first time here. Choose a passphrase to encrypt your API access.
              It will never be stored or sent to the server — only a derived key is used.
            </p>
            <PasswordFields
              pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2}
              showPw={showPw} setShowPw={setShowPw}
              focused={focused} setFocused={setFocused}
            />
            <label style={S.label}>Your email (for password resets)</label>
            <input
              style={{ ...S.input, ...(focused === 'email' ? S.inputFocus : {}) }}
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
              placeholder="you@example.com"
              onKeyDown={handleKey(handleSetup)}
            />
            {error && <div style={S.err}>{error}</div>}
            <PrimaryBtn onClick={handleSetup} busy={busy}
              disabled={!isPasswordValid(pw) || pw !== pw2 || !email.includes('@')}>
              Set passphrase & unlock
            </PrimaryBtn>
          </>
        )}

        {/* ── LOCKED ── */}
        {state === 'locked' && (
          <>
            <label style={S.label}>Passphrase</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...S.input, ...(focused === 'pw' ? S.inputFocus : {}), paddingRight: 44 }}
                type={showPw ? 'text' : 'password'}
                value={pw} onChange={e => setPw(e.target.value)}
                onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
                placeholder="Enter your passphrase"
                autoFocus
                onKeyDown={handleKey(handleLogin)}
              />
              <button onClick={() => setShowPw(v => !v)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(221,225,238,0.4)', fontSize: 12, padding: 0,
              }}>
                {showPw ? 'hide' : 'show'}
              </button>
            </div>
            {error && <div style={S.err}>{error}</div>}
            <PrimaryBtn onClick={handleLogin} busy={busy} disabled={!pw}>
              Unlock
            </PrimaryBtn>
            <button style={S.link} onClick={handleResetRequest} disabled={busy}>
              Forgot passphrase? Send reset email
            </button>
          </>
        )}

        {/* ── RESET SENT ── */}
        {state === 'reset-sent' && (
          <>
            <div style={S.info}>
              A reset link has been sent to your registered address. Click it within 1 hour.
              The link will open this app with a password reset form.
            </div>
            <button style={{ ...S.btn, ...S.btnSecondary, marginTop: 20 }}
              onClick={() => setState('locked')}>
              Back to login
            </button>
          </>
        )}

        {/* ── RESET FORM ── */}
        {state === 'reset-form' && (
          <>
            <p style={{ fontSize: 11, color: 'rgba(221,225,238,0.5)', marginBottom: 20, lineHeight: 1.7 }}>
              Choose a new passphrase. This will replace your existing one and log you in.
            </p>
            <PasswordFields
              pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2}
              showPw={showPw} setShowPw={setShowPw}
              focused={focused} setFocused={setFocused}
            />
            {error && <div style={S.err}>{error}</div>}
            <PrimaryBtn onClick={handleResetVerify} busy={busy}
              disabled={!isPasswordValid(pw) || pw !== pw2}>
              Set new passphrase
            </PrimaryBtn>
          </>
        )}
      </div>
    </div>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function PasswordFields({ pw, setPw, pw2, setPw2, showPw, setShowPw, focused, setFocused }) {
  return (
    <>
      <label style={S.label}>Passphrase</label>
      <div style={{ position: 'relative', marginBottom: 4 }}>
        <input
          style={{ ...S.input, ...(focused === 'pw' ? S.inputFocus : {}), paddingRight: 44 }}
          type={showPw ? 'text' : 'password'}
          value={pw} onChange={e => setPw(e.target.value)}
          onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
          placeholder="e.g. Sunrise&River7!"
          autoFocus
        />
        <button onClick={() => setShowPw(v => !v)} style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(221,225,238,0.4)', fontSize: 12, padding: 0,
        }}>
          {showPw ? 'hide' : 'show'}
        </button>
      </div>
      <PasswordRules password={pw} />

      <label style={S.label}>Confirm passphrase</label>
      <input
        style={{
          ...S.input,
          ...(focused === 'pw2' ? S.inputFocus : {}),
          ...(pw2 && pw !== pw2 ? { borderColor: 'rgba(255,86,86,0.6)' } : {}),
          ...(pw2 && pw === pw2 ? { borderColor: 'rgba(61,232,190,0.5)' } : {}),
          marginBottom: 16,
        }}
        type={showPw ? 'text' : 'password'}
        value={pw2} onChange={e => setPw2(e.target.value)}
        onFocus={() => setFocused('pw2')} onBlur={() => setFocused('')}
        placeholder="Repeat passphrase"
      />
      {pw2 && pw !== pw2 && (
        <div style={{ fontSize: 11, color: '#ff8080', marginTop: -12, marginBottom: 8 }}>
          Passphrases do not match
        </div>
      )}
    </>
  );
}

function PrimaryBtn({ onClick, busy, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      style={{ ...S.btn, ...(busy || disabled ? S.btnDisabled : {}) }}
    >
      {busy
        ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ ...S.spinner, width: 14, height: 14, borderWidth: 2, display: 'inline-block' }} />
            Working…
          </span>
        : children}
    </button>
  );
}
