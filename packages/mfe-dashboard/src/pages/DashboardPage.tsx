import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Card,
  Icon,
  Spinner,
  StatCard,
  api,
  toast,
  useAuth,
  type DashboardData,
  type IconName,
} from '@aip/shared';
import '../styles/dashboard.css';

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface QuickAction {
  title: string;
  subtitle: string;
  icon: IconName;
  tone: 'blue' | 'orange' | 'green';
  onClick: () => void;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getDashboard().then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.name.split(' ')[0] ?? 'there';
  const initials = (user?.name ?? 'AI')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const quickActions: QuickAction[] = [
    {
      title: 'Start Interview',
      subtitle: 'Start a new AI interview',
      icon: 'play',
      tone: 'blue',
      onClick: () => navigate('/interview/setup'),
    },
    {
      title: 'Resume Interview',
      subtitle: 'Continue where you left',
      icon: 'clock',
      tone: 'orange',
      onClick: () => toast('No paused interview found — start a new one!', 'info'),
    },
    {
      title: 'View Results',
      subtitle: 'Check your performance',
      icon: 'bar-chart',
      tone: 'green',
      onClick: () => navigate('/results'),
    },
  ];

  return (
    <div className="page dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="page__title">
            Welcome back, {firstName}! <span aria-hidden="true">👋</span>
          </h1>
          <p className="page__subtitle">Let&apos;s crack your next interview.</p>
        </div>
        <div className="dashboard__header-actions">
          <button
            type="button"
            className="dashboard__bell"
            aria-label="Notifications"
            onClick={() => toast('No new notifications.', 'info')}
          >
            <Icon name="bell" size={18} />
          </button>
          <span className="dashboard__avatar" title={user?.name}>
            {initials}
          </span>
        </div>
      </header>

      {!data ? (
        <div className="block-state">
          <Spinner size={28} />
          <p>Loading your dashboard…</p>
        </div>
      ) : (
        <>
          <section className="dashboard__stats" aria-label="Your statistics">
            <StatCard
              title="Upcoming Interviews"
              value={String(data.stats.upcomingInterviews)}
              icon="calendar"
              iconTone="blue"
              linkLabel="View Details"
              onLinkClick={() => navigate('/interviews')}
            />
            <StatCard
              title="Completed Interviews"
              value={String(data.stats.completedInterviews)}
              icon="check-circle"
              iconTone="green"
              linkLabel="View All"
              onLinkClick={() => navigate('/interviews')}
            />
            <StatCard
              title="Average Score"
              value={`${data.stats.averageScore}%`}
              icon="trending-up"
              iconTone="purple"
              linkLabel="View Analytics"
              onLinkClick={() => navigate('/results')}
            />
            <StatCard
              title="Skill Progress"
              value={`${data.stats.skillProgress}%`}
              icon="zap"
              iconTone="orange"
              linkLabel="View Progress"
              onLinkClick={() => navigate('/results')}
            />
          </section>

          <section aria-label="Quick actions">
            <h2 className="section-title">Quick Actions</h2>
            <div className="dashboard__actions">
              {quickActions.map((action) => (
                <button key={action.title} type="button" className="action-card" onClick={action.onClick}>
                  <span className={`action-card__icon action-card__icon--${action.tone}`}>
                    <Icon name={action.icon} size={18} />
                  </span>
                  <span>
                    <span className="action-card__title">{action.title}</span>
                    <span className="action-card__subtitle">{action.subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section aria-label="Recent interviews">
            <h2 className="section-title">Recent Interviews</h2>
            <Card padding="none" className="dashboard__table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Technology</th>
                    <th>Level</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {data.recentInterviews.map((interview) => (
                    <tr key={interview.id}>
                      <td className="data-table__strong">{interview.technology}</td>
                      <td>{interview.level}</td>
                      <td>{formatDate(interview.date)}</td>
                      <td>
                        <Badge tone={interview.status === 'Completed' ? 'success' : 'warning'}>
                          {interview.status}
                        </Badge>
                      </td>
                      <td className="data-table__strong">{interview.score}%</td>
                      <td>
                        <button
                          type="button"
                          className="data-table__view"
                          onClick={() => navigate(`/results/${interview.id}`)}
                        >
                          <Icon name="play" size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
