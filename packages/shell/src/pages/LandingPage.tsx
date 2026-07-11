import { useNavigate } from 'react-router';
import { Button, Icon, Logo, useAuth, type IconName } from '@aip/shared';

interface Feature {
  icon: IconName;
  title: string;
  copy: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'zap',
    title: 'AI-Powered Interviews',
    copy: 'Realistic mock interviews with adaptive difficulty, follow-up questions and instant evaluation.',
  },
  {
    icon: 'bar-chart',
    title: 'Objective Scoring',
    copy: 'Explainable scores across technical skills, problem solving, communication and system design.',
  },
  {
    icon: 'users',
    title: 'Built for Teams',
    copy: 'HR designs interviews in the builder, assigns candidates and tracks the hiring funnel end to end.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const goToApp = () => {
    if (!session) navigate('/login');
    else navigate(session.user.role === 'admin' ? '/admin' : '/dashboard');
  };

  return (
    <div className="landing">
      <header className="landing__nav">
        <Logo />
        <div className="landing__nav-actions">
          {session ? (
            <Button onClick={goToApp}>Open {session.user.role === 'admin' ? 'Admin Portal' : 'Dashboard'}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button onClick={() => navigate('/register')}>Get Started</Button>
            </>
          )}
        </div>
      </header>

      <section className="landing__hero">
        <span className="landing__eyebrow">Practice. Prepare. Perfect.</span>
        <h1 className="landing__title">
          Crack your dream job interview with <span>AI-powered</span> mock interviews
        </h1>
        <p className="landing__subtitle">
          One platform, two portals — candidates practice realistic interviews, recruiters design them and track
          results.
        </p>
        <div className="landing__cta">
          <Button size="lg" icon="play" onClick={goToApp}>
            Start Practicing
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
            Admin Portal
          </Button>
        </div>
        <div className="landing__stats">
          <div>
            <strong>340+</strong>
            <span>interviews conducted</span>
          </div>
          <div>
            <strong>94%</strong>
            <span>AI scoring accuracy</span>
          </div>
          <div>
            <strong>10+</strong>
            <span>technologies covered</span>
          </div>
        </div>
      </section>

      <section className="landing__features" aria-label="Product features">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="card card--pad-lg landing__feature">
            <span className="landing__feature-icon">
              <Icon name={feature.icon} size={22} />
            </span>
            <h2>{feature.title}</h2>
            <p>{feature.copy}</p>
          </div>
        ))}
      </section>

      <footer className="landing__footer">© 2026 AI Interview Portal — demo build with dummy data.</footer>
    </div>
  );
}
