import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ApiError,
  Button,
  Card,
  DonutChart,
  Icon,
  ProgressBar,
  Spinner,
  api,
  toast,
  useAuth,
  type IconName,
  type InterviewResult,
} from '@aip/shared';
import { downloadReport } from '../report';
import '../styles/results.css';

const BREAKDOWN_ICONS: Record<string, IconName> = {
  technical: 'code',
  'problem-solving': 'user',
  communication: 'message-square',
  'system-design': 'layers',
  depth: 'layers',
};

const PENDING_STATUSES = new Set(['SUBMITTED', 'EVALUATING']);
const POLL_INTERVAL_MS = 2500;

export default function ResultPage() {
  const navigate = useNavigate();
  const { resultId } = useParams<{ resultId: string }>();
  const { user } = useAuth();

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    setResult(null);
    setError(null);

    const load = () => {
      api
        .getResult(resultId)
        .then((data) => {
          if (cancelled) return;
          setResult(data);
          // Real backend: evaluation is async (outbox → Kafka → judge) —
          // keep polling until it lands.
          if (data.status && PENDING_STATUSES.has(data.status)) {
            timer = window.setTimeout(load, POLL_INTERVAL_MS);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load the result.');
        });
    };
    load();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [resultId]);

  if (error) {
    return (
      <div className="block-state" role="alert">
        <Icon name="alert-circle" size={36} />
        <p className="block-state__title">{error}</p>
        <Button variant="outline" icon="arrow-left" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="block-state">
        <Spinner size={28} />
        <p>Loading your result…</p>
      </div>
    );
  }

  if (result.status && PENDING_STATUSES.has(result.status)) {
    return (
      <div className="block-state" aria-live="polite">
        <Spinner size={28} />
        <p className="block-state__title">The AI is evaluating your answers…</p>
        <p>Judging each answer against the rubric — this usually takes under a minute.</p>
      </div>
    );
  }

  const firstName = user?.name.split(' ')[0] ?? 'there';
  const scoreColor = result.passed ? 'var(--c-success)' : 'var(--c-danger)';

  const handleDownload = () => {
    downloadReport(result, user?.name ?? 'Candidate');
    toast('Report downloaded.', 'success');
  };

  return (
    <div className="page results">
      <header className="results__header">
        <div>
          <h1 className="page__title results__title">
            Interview Completed{' '}
            <span className="results__title-check" aria-hidden="true">
              <Icon name="check-circle" size={20} />
            </span>
          </h1>
          <p className="page__subtitle">
            Great job, {firstName}! Here is your interview performance — {result.technology} ({result.level}).
          </p>
        </div>
        <Button variant="outline" icon="download" onClick={handleDownload}>
          Download Report (PDF)
        </Button>
      </header>

      <div className="results__grid">
        <Card className="results__score-card">
          <h2 className="section-title">Overall Score</h2>
          <DonutChart value={result.overallScore} color={scoreColor} label="Overall score" />
          <p className="results__score-caption">{result.performanceLabel}</p>
        </Card>

        <Card className="results__breakdown-card">
          <h2 className="section-title">Score Breakdown</h2>
          <ul className="breakdown">
            {result.breakdown.map((item) => (
              <li key={item.key} className="breakdown__row">
                <span className="breakdown__icon" style={{ color: item.color }}>
                  <Icon name={BREAKDOWN_ICONS[item.key] ?? 'check'} size={17} />
                </span>
                <div className="breakdown__body">
                  <div className="breakdown__meta">
                    <span className="breakdown__label">{item.label}</span>
                    <span className="breakdown__value">{item.score}%</span>
                  </div>
                  <ProgressBar value={item.score} color={item.color} height={7} label={item.label} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="results__verdict-card">
          <h2 className="section-title">Result</h2>
          <span className={`verdict ${result.passed ? 'verdict--passed' : 'verdict--failed'}`}>
            {result.passed ? 'PASSED' : 'NOT PASSED'}
          </span>
          <p className="results__verdict-copy">
            {result.passed
              ? 'Congratulations! You have successfully completed the interview.'
              : 'Keep practicing — review the improvement areas and try again.'}
          </p>
        </Card>
      </div>

      <div className="results__insights">
        <Card>
          <h2 className="section-title">Strengths</h2>
          <ul className="insight-list">
            {result.strengths.map((item) => (
              <li key={item} className="insight-list__item insight-list__item--good">
                <Icon name="check-circle" size={16} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="section-title section-title--warn">Areas of Improvement</h2>
          <ul className="insight-list">
            {result.improvements.map((item) => (
              <li key={item} className="insight-list__item insight-list__item--warn">
                <Icon name="alert-circle" size={16} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="results__actions">
        <Button size="lg" icon="refresh" onClick={() => navigate('/interview/setup')}>
          Retake Interview
        </Button>
        <Button variant="outline" size="lg" icon="arrow-left" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
