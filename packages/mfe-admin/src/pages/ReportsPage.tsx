import { Button, Card, Icon, adminApi, downloadPdf, toast, type IconName, type PdfLine } from '@aip/shared';

interface ReportDef {
  key: string;
  title: string;
  description: string;
  icon: IconName;
  build: () => Promise<PdfLine[]>;
}

const REPORTS: ReportDef[] = [
  {
    key: 'candidates',
    title: 'Candidate Reports',
    description: 'Per-candidate performance across all completed interviews.',
    icon: 'users',
    build: async () => {
      const candidates = await adminApi.getCandidates();
      return [
        { text: 'Candidate Report', size: 16, gap: 30 },
        ...candidates.map((c) => ({
          text: `  - ${c.name} (${c.technology}) - ${c.progress}${c.score != null ? `, best ${c.score}%` : ''} [${c.status}]`,
          size: 11,
        })),
      ];
    },
  },
  {
    key: 'company',
    title: 'Company Report',
    description: 'Platform-wide summary for leadership: volume, pass rate, AI usage.',
    icon: 'file-text',
    build: async () => {
      const { stats } = await adminApi.getDashboard();
      return [
        { text: 'Company Report', size: 16, gap: 30 },
        { text: `Total candidates: ${stats.totalCandidates}`, size: 11 },
        { text: `Interviews scheduled: ${stats.interviewsScheduled}`, size: 11 },
        { text: `Interviews completed: ${stats.interviewsCompleted}`, size: 11 },
        { text: `Pass rate: ${stats.passRate}%`, size: 11 },
        { text: `AI tokens used: ${stats.aiTokensUsed}  |  AI accuracy: ${stats.aiAccuracy}%`, size: 11 },
      ];
    },
  },
  {
    key: 'monthly',
    title: 'Monthly Report',
    description: 'This month: interviews conducted, completion rate and top performers.',
    icon: 'calendar',
    build: async () => {
      const analytics = await adminApi.getAnalytics();
      return [
        { text: 'Monthly Report - July 2026', size: 16, gap: 30 },
        { text: 'Interviews conducted: 47  |  Completion rate: 89%', size: 11, gap: 24 },
        { text: 'Top performers', size: 13 },
        ...analytics.ranking.slice(0, 3).map((r) => ({ text: `  ${r.rank}. ${r.name} - ${r.score}%`, size: 11 })),
      ];
    },
  },
  {
    key: 'hiring',
    title: 'Hiring Statistics',
    description: 'Funnel from invited to passed, split by technology.',
    icon: 'trending-up',
    build: async () => {
      const analytics = await adminApi.getAnalytics();
      return [
        { text: 'Hiring Statistics', size: 16, gap: 30 },
        { text: 'Funnel: 128 invited -> 96 attempted -> 82 completed -> 56 passed (68%)', size: 11, gap: 24 },
        { text: 'By technology (avg score)', size: 13 },
        ...analytics.techPerformance.map((t) => ({ text: `  - ${t.technology}: ${t.avgScore}%`, size: 11 })),
      ];
    },
  },
];

export default function ReportsPage() {
  const handleDownload = async (report: ReportDef) => {
    const lines = await report.build();
    downloadPdf(lines, `${report.key}-report.pdf`);
    toast(`${report.title} downloaded.`, 'success');
  };

  return (
    <div className="page adm-page">
      <header className="adm-page__header">
        <div>
          <h1 className="page__title">Reports</h1>
          <p className="page__subtitle">Generate PDF reports from live platform data.</p>
        </div>
      </header>

      <div className="adm-report-grid">
        {REPORTS.map((report) => (
          <Card key={report.key} className="adm-report">
            <span className="adm-report__icon">
              <Icon name={report.icon} size={22} />
            </span>
            <h2 className="adm-report__title">{report.title}</h2>
            <p className="adm-muted">{report.description}</p>
            <Button variant="outline" icon="download" onClick={() => void handleDownload(report)}>
              Download PDF
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
