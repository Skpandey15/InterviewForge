import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  ApiError,
  Button,
  Checkbox,
  PasswordField,
  TextField,
  api,
  toast,
} from '@aip/shared';
import {
  validateConfirmPassword,
  validateEmail,
  validateMobile,
  validatePassword,
  validateRequired,
} from '../validation';
import '../styles/auth.css';

interface FormState {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const INITIAL: FormState = {
  fullName: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {
      fullName: validateRequired(form.fullName, 'Full name'),
      email: validateEmail(form.email),
      mobile: validateMobile(form.mobile),
      password: validatePassword(form.password),
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
      acceptedTerms: form.acceptedTerms ? undefined : 'You must accept the terms to continue.',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await api.register({
        fullName: form.fullName,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
      });
      toast('Account created! Please login.', 'success');
      navigate('/login', { state: { registeredEmail: form.email.trim().toLowerCase() } });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card auth-card--single">
        <section className="auth-form-panel">
          <h1 className="auth-form-panel__title">Create Your Account</h1>
          <p className="auth-form-panel__subtitle">Register to get started</p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {formError && (
              <p className="auth-form__error" role="alert">
                {formError}
              </p>
            )}
            <TextField
              label="Full Name"
              icon="user"
              placeholder="Enter your full name"
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              error={errors.fullName}
            />
            <TextField
              label="Email Address"
              icon="mail"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              error={errors.email}
            />
            <TextField
              label="Mobile Number"
              icon="phone"
              type="tel"
              placeholder="Enter your mobile number"
              autoComplete="tel"
              value={form.mobile}
              onChange={(e) => setField('mobile', e.target.value)}
              error={errors.mobile}
            />
            <PasswordField
              label="Password"
              placeholder="Create a password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              error={errors.password}
              hint="At least 8 characters with letters and numbers."
            />
            <PasswordField
              label="Confirm Password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setField('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
            />
            <div>
              <Checkbox
                label={
                  <>
                    I accept the <a href="#terms" onClick={(e) => e.preventDefault()}>Terms &amp; Conditions</a> and{' '}
                    <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
                  </>
                }
                checked={form.acceptedTerms}
                onChange={(e) => setField('acceptedTerms', e.target.checked)}
              />
              {errors.acceptedTerms && (
                <p className="field__error" role="alert">
                  {errors.acceptedTerms}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" block loading={submitting}>
              Register
            </Button>
            <Button variant="outline" size="lg" block onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
