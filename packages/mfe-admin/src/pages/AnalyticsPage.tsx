import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DonutChart,
  ProgressBar,
  Spinner,
  adminApi,
  downloadBlob,
  downloadPdf,
  toast,
  type AnalyticsData,
  type PdfLine,
} from '@aip/shared';

function exportPdf(data: AnalyticsData): void {
  const lines: PdfLine[] = [
    { text: 'AI Interview Portal - Analytics Export', size: 16, gap: 30 },
    { text: 'Candidate Ranking', size: 13 },
    ...data.ranking.map((r) => ({
      text: `  ${r.rank}. ${r.name} (${r.technology}) - ${r.score}% over ${r.interviews} interviews`,
      size: 11,
    })),
    { text: '', size: 11, gap: 8 },
    { text: 'Technology-wise Performance', size: 13 },
    ...data.techPerformance.map((t) => ({
      text: `  - ${t.technology}: avg ${t.avgScore}% (${t.interviews} interviews)`,
      size: 11,
    })),
    { text: '', size: 11, gap: 8 },
    { text: 'Question Difficulty Analysis', size: 13 },
    ...data.difficultyAnalysis.map((d) => ({
      text: `  - ${d.bucket}: ${d.correctRate}% correct across ${d.questions} questions`,
      size: 11,
    })),
    { text: '', size: 11, gap: 8 },
    { text: `AI Evaluation Accuracy: ${data.aiAccuracy}% (vs human panel benchmark)`, size: 12 },
  ];
  downloadPdf(lines, 'analytics-export.pdf');
}

function exportCsv(data: AnalyticsData): void {
  const rows = [
    'rank,name,technology,score,interviews',
    ...data.ranking.map((r) => `${r.rank},${r.name},${r.technology},${r.score},${r.interviews}`),
  ].join('\n');
  downloadBlob(new Blob([rows], { type: 'text/csv' }), 'candidate-ranking.csv');
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.getAnalytics().then((result) => {
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
        <p>Crunching the numbers…</p>
      </div>
    );
  }

  return (
    <div className="page adm-page">
      <header className="adm-page__header">
        <div>
          <h1 className="page__title">Analytics</h1>
          <p className="page__subtitle">Performance across candidates, technologies and question difficulty.</p>
        </div>
        <div className="adm-page__actions">
          <Button
            variant="outline"
            icon="download"
            onClick={() => {
              exportPdf(data);
              toast('Analytics PDF downloaded.', 'success');
            }}
          >
            Export PDF
          </Button>
          <Button
            variant="outline"
            icon="download"
            onClick={() => {
              exportCsv(data);
              toast('Ranking CSV downloaded.', 'success');
            }}
          >
            Export Excel/CSV
          </Button>
        </div>
      </header>

      <div className="adm-analytics-grid">
        <Card className="table-card">
          <h2 className="section-title">Candidate Ranking</h2>
          <table className="data-table adm-compact-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Candidate</th>
                <th>Technology</th>
                <th>Interviews</th>
                <th>Best Score</th>
              </tr>
            </thead>
            <tbody>
              {data.ranking.map((row) => (
                <tr key={row.rank}>
                  <td className="data-table__strong">{row.rank}</td>
                  <td className="data-table__strong">{row.name}</td>
                  <td>{row.technology}</td>
                  <td>{row.interviews}</td>
                  <td className="data-table__strong">{row.score}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 className="section-title">AI Evaluation Accuracy</h2>
          <div className="adm-ai-accuracy">
            <DonutChart value={data.aiAccuracy} size={150} strokeWidth={14} color="var(--c-primary)" label="AI accuracy" />
            <p className="adm-muted">
              Agreement between AI scoring and a human interviewer panel on a benchmark set of 500 answers.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="section-title">Technology-wise Performance</h2>
          <ul className="adm-bar-list">
            {data.techPerformance.map((tech) => (
              <li key={tech.technology} className="adm-bar-list__row">
                <div className="adm-bar-list__meta">
                  <span>{tech.technology}</span>
                  <span className="adm-muted">
                    {tech.avgScore}% avg · {tech.interviews} interviews
                  </span>
                </div>
                <ProgressBar value={tech.avgScore} color="var(--c-primary)" height={7} label={tech.technology} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="section-title">Question Difficulty Analysis</h2>
          <ul className="adm-bar-list">
            {data.difficultyAnalysis.map((bucket) => (
              <li key={bucket.bucket} className="adm-bar-list__row">
                <div className="adm-bar-list__meta">
                  <span>{bucket.bucket}</span>
                  <span className="adm-muted">
                    {bucket.correctRate}% correct · {bucket.questions} questions
                  </span>
                </div>
                <ProgressBar
                  value={bucket.correctRate}
                  color={bucket.correctRate >= 70 ? 'var(--c-success)' : bucket.correctRate >= 45 ? 'var(--c-orange)' : 'var(--c-danger)'}
                  height={7}
                  label={`${bucket.bucket} difficulty`}
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
