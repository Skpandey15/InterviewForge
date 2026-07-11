import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ADMIN_DEMO_CREDENTIALS,
  ApiError,
  Button,
  Checkbox,
  DEMO_CREDENTIALS,
  Logo,
  PasswordField,
  TextField,
  api,
  toast,
} from '@aip/shared';
import { HeroIllustration } from '../components/HeroIllustration';
import { validateEmail, validateRequired } from '../validation';
import '../styles/auth.css';

interface LocationState {
  registeredEmail?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const registeredEmail = (location.state as LocationState | null)?.registeredEmail;

  const [email, setEmail] = useState(registeredEmail ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(email),
      password: validateRequired(password, 'Password'),
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const session = await api.login(email, password);
      toast(`Welcome back, ${session.user.name.split(' ')[0]}!`, 'success');
      navigate(session.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <section className="auth-hero">
          <Logo />
          <p className="auth-hero__tagline">Practice. Prepare. Perfect.</p>
          <p className="auth-hero__copy">Crack your dream job interview with AI-powered mock interviews.</p>
          <div className="auth-hero__art">
            <HeroIllustration />
          </div>
        </section>

        <section className="auth-form-panel">
          <h1 className="auth-form-panel__title">Welcome Back!</h1>
          <p className="auth-form-panel__subtitle">Login to your account</p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {registeredEmail && !formError && (
              <p className="auth-demo-hint">Account created successfully — login to continue.</p>
            )}
            {formError && (
              <p className="auth-form__error" role="alert">
                {formError}
              </p>
            )}
            <TextField
              label="Email Address"
              icon="mail"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <PasswordField
              label="Password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <div className="auth-form__row">
              <Checkbox label="Remember Me" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <a href="#forgot" onClick={(e) => e.preventDefault()}>
                Forgot Password?
              </a>
            </div>
            <Button type="submit" size="lg" block loading={submitting}>
              Login
            </Button>
          </form>

          <div className="auth-divider">OR</div>
          <p className="auth-switch">Don&apos;t have an account?</p>
          <Button variant="outline" size="lg" block onClick={() => navigate('/register')}>
            Register
          </Button>

          <p className="auth-demo-hint">
            Candidate demo — <code>{DEMO_CREDENTIALS.email}</code> / <code>{DEMO_CREDENTIALS.password}</code>
            <br />
            Admin demo — <code>{ADMIN_DEMO_CREDENTIALS.email}</code> / <code>{ADMIN_DEMO_CREDENTIALS.password}</code>
          </p>
        </section>
      </div>
    </div>
  );
}
