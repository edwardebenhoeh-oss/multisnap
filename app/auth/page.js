"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  :root {
    --bg: #08080f;
    --surface: #10101a;
    --surface2: #18182a;
    --border: #2a2a45;
    --border2: #35355a;
    --accent: #7c6fff;
    --accent2: #b06aff;
    --accent3: #ff6ab0;
    --glow: rgba(124,111,255,0.25);
    --text: #f0f0ff;
    --text2: #a0a0c0;
    --muted: #5a5a80;
    --success: #4ade80;
    --danger: #f87171;
    --radius: 20px;
    --radius-sm: 12px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .auth-wrap {
    width: 100%;
    max-width: 420px;
    position: relative;
  }
  /* Background glow */
  .auth-wrap::before {
    content: '';
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(ellipse, rgba(124,111,255,0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
  .auth-card {
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    padding: 36px 32px 32px;
    position: relative;
    z-index: 1;
  }
  .logo {
    text-align: center;
    margin-bottom: 28px;
  }
  .logo-text {
    font-size: 1.7rem;
    font-weight: 900;
    letter-spacing: -0.05em;
  }
  .logo-grad {
    background: linear-gradient(135deg, var(--accent), var(--accent2), var(--accent3));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .logo-sub {
    font-size: 0.72rem;
    color: var(--muted);
    margin-top: 4px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .tabs {
    display: flex;
    gap: 4px;
    background: var(--surface2);
    border-radius: var(--radius-sm);
    padding: 4px;
    margin-bottom: 28px;
  }
  .tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--muted);
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 9px;
    border-radius: 9px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tab-btn.active {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 4px 14px var(--glow);
  }
  .form-group {
    margin-bottom: 16px;
  }
  label {
    display: block;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text2);
    margin-bottom: 7px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  input {
    width: 100%;
    background: var(--surface2);
    border: 1.5px solid var(--border2);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 0.92rem;
    padding: 12px 16px;
    outline: none;
    transition: border-color 0.2s;
    -webkit-appearance: none;
  }
  input:focus { border-color: var(--accent); }
  input::placeholder { color: var(--muted); }
  .btn-primary {
    width: 100%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border: none;
    border-radius: var(--radius-sm);
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 18px var(--glow);
    margin-top: 8px;
    letter-spacing: -0.01em;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px var(--glow); }
  .btn-primary:active { transform: scale(0.98); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 500;
  }
  .divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .btn-google {
    width: 100%;
    background: var(--surface2);
    border: 1.5px solid var(--border2);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .btn-google:hover { border-color: var(--accent); color: var(--accent); }
  .msg {
    margin-top: 16px;
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    font-size: 0.78rem;
    font-weight: 500;
    text-align: center;
    line-height: 1.5;
  }
  .msg.error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: var(--danger); }
  .msg.success { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.25); color: var(--success); }
  .terms {
    font-size: 0.65rem;
    color: var(--muted);
    text-align: center;
    margin-top: 20px;
    line-height: 1.6;
  }
  .terms a { color: var(--accent); text-decoration: none; }
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 6px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default function AuthPage() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error"|"success", text }
  const [checking, setChecking] = useState(true);

  // If already logged in, redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/";
      else setChecking(false);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Account created! Check your email to confirm, then sign in.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Successful login → go to app
        window.location.href = "/";
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <>
        <style>{STYLES}</style>
        <div style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
          Loading...
        </div>
      </>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="logo">
            <div className="logo-text">
              FLIP<span className="logo-grad">R</span>
            </div>
            <div className="logo-sub">Turn clutter into cash</div>
          </div>

          <div className="tabs">
            <button
              className={`tab-btn${mode === "signin" ? " active" : ""}`}
              onClick={() => { setMode("signin"); setMessage(null); }}
            >
              Sign In
            </button>
            <button
              className={`tab-btn${mode === "signup" ? " active" : ""}`}
              onClick={() => { setMode("signup"); setMessage(null); }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading && <span className="spinner" />}
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="divider">or</div>

          <button className="btn-google" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {message && (
            <div className={`msg ${message.type}`}>{message.text}</div>
          )}

          <p className="terms">
            By continuing, you agree to our{" "}
            <a href="/terms">Terms of Service</a> and{" "}
            <a href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </>
  );
}
