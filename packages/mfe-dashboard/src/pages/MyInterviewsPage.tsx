import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Button,
  Card,
  Icon,
  Spinner,
  api,
  type InterviewSummary,
} from '@aip/shared';
import '../styles/dashboard.css';

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyInterviewsPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getInterviewHistory().then((rows) => {
      if (!cancelled) setInterviews(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const completed = (interviews ?? []).filter((i) => i.status === 'Completed');
  const best = completed.reduce((max, i) => Math.max(max, i.score), 0);

  return (
    <div className="page dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="page__title">My Interviews</h1>
          <p className="page__subtitle">
            {interviews
              ? `${interviews.length} interviews · ${completed.length} completed · best score ${best}%`
              : 'Your full interview history.'}
          </p>
        </div>
        <Button icon="play" onClick={() => navigate('/interview/setup')}>
          Start New Interview
        </Button>
      </header>

      {!interviews ? (
        <div className="block-state">
          <Spinner size={28} />
          <p>Loading your interviews…</p>
        </div>
      ) : interviews.length === 0 ? (
        <div className="block-state">
          <Icon name="list" size={36} />
          <p className="block-state__title">No interviews yet</p>
          <p>Take your first AI interview and it will show up here.</p>
          <Button icon="play" onClick={() => navigate('/interview/setup')}>
            Start Interview
          </Button>
        </div>
      ) : (
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
              {interviews.map((interview) => (
                <tr key={interview.id}>
                  <td className="data-table__strong">{interview.technology}</td>
                  <td>{interview.level}</td>
                  <td>{formatDate(interview.date)}</td>
                  <td>
                    <Badge tone={interview.status === 'Completed' ? 'success' : 'warning'}>
                      {interview.status}
                    </Badge>
                  </td>
                  <td className="data-table__strong">
                    {interview.status === 'Completed' ? `${interview.score}%` : '—'}
                  </td>
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
      )}
    </div>
  );
}
