import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Icon,
  Spinner,
  StatCard,
  adminApi,
  type AdminDashboardData,
  type IconName,
} from '@aip/shared';

const ACTIVITY_ICONS: Record<string, IconName> = {
  interview: 'check-circle',
  candidate: 'users',
  system: 'zap',
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.getDashboard().then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="block-state">
        <Spinner size={28} />
        <p>Loading admin dashboard…</p>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="page adm-page">
      <header className="adm-page__header">
        <div>
          <h1 className="page__title">Admin Dashboard</h1>
          <p className="page__subtitle">Hiring pipeline at a glance.</p>
        </div>
      </header>

      <section className="adm-stats" aria-label="Platform statistics">
        <StatCard
          title="Total Candidates"
          value={String(stats.totalCandidates)}
          icon="users"
          iconTone="blue"
          linkLabel="Manage"
          onLinkClick={() => navigate('/admin/candidates')}
        />
        <StatCard
          title="Interviews Scheduled"
          value={String(stats.interviewsScheduled)}
          icon="calendar"
          iconTone="orange"
          linkLabel="View pipeline"
          onLinkClick={() => navigate('/admin/candidates')}
        />
        <StatCard
          title="Interviews Completed"
          value={String(stats.interviewsCompleted)}
          icon="check-circle"
          iconTone="green"
          linkLabel="View analytics"
          onLinkClick={() => navigate('/admin/analytics')}
        />
        <StatCard
          title="Pass Rate"
          value={`${stats.passRate}%`}
          icon="trending-up"
          iconTone="purple"
          linkLabel="View analytics"
          onLinkClick={() => navigate('/admin/analytics')}
        />
        <StatCard
          title="AI Usage (tokens)"
          value={stats.aiTokensUsed}
          icon="zap"
          iconTone="orange"
          linkLabel="AI accuracy"
          onLinkClick={() => navigate('/admin/analytics')}
        />
        <StatCard
          title="AI Accuracy"
          value={`${stats.aiAccuracy}%`}
          icon="shield"
          iconTone="green"
          linkLabel="Details"
          onLinkClick={() => navigate('/admin/analytics')}
        />
      </section>

      <section aria-label="Recent activity">
        <h2 className="section-title">Recent Activity</h2>
        <Card padding="none">
          <ul className="adm-activity">
            {data.recentActivity.map((item) => (
              <li key={item.id} className="adm-activity__item">
                <span className={`adm-activity__icon adm-activity__icon--${item.kind}`}>
                  <Icon name={ACTIVITY_ICONS[item.kind] ?? 'activity'} size={15} />
                </span>
                <span className="adm-activity__text">{item.text}</span>
                <span className="adm-activity__time">{item.time}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
