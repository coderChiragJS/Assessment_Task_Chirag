import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Field } from '../components/ui.jsx';

const DEMO = [
  { role: 'Admin', email: 'admin@smartops.dev', password: 'Admin@123' },
  { role: 'Manager', email: 'manager@smartops.dev', password: 'Manager@123' },
  { role: 'User', email: 'user1@smartops.dev', password: 'User@123' },
];

export default function LoginPage() {
  const { login, signup } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(name, email, password);
      toast.success('Welcome to SmartOps');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const fill = (d) => {
    setMode('login');
    setEmail(d.email);
    setPassword(d.password);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">◆</span>
          <div>
            <div className="brand-name">SmartOps</div>
            <div className="brand-sub">Internal Operations Console</div>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            className={`tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && (
            <Field label="Full name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </Field>
          <Field label="Password" hint={mode === 'signup' ? 'At least 6 characters' : undefined}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="demo">
          <div className="demo-title">Demo accounts — click to fill</div>
          <div className="demo-grid">
            {DEMO.map((d) => (
              <button key={d.email} className="demo-chip" onClick={() => fill(d)}>
                <strong>{d.role}</strong>
                <span>{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
