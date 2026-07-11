import { buildPdf, downloadBlob, type InterviewResult, type PdfLine } from '@aip/shared';

export function downloadReport(result: InterviewResult, userName: string): void {
  const lines: PdfLine[] = [
    { text: 'AI Interview Portal - Interview Report', size: 16, gap: 30 },
    { text: `Candidate: ${userName}`, size: 11 },
    { text: `Technology: ${result.technology} (${result.level})`, size: 11 },
    { text: `Completed: ${new Date(result.completedAt).toLocaleString('en-GB')}`, size: 11, gap: 26 },
    { text: `Overall Score: ${result.overallScore}%  -  ${result.passed ? 'PASSED' : 'NOT PASSED'}`, size: 13 },
    { text: result.performanceLabel, size: 11, gap: 26 },
    { text: 'Score Breakdown', size: 13 },
    ...result.breakdown.map((item) => ({ text: `  -  ${item.label}: ${item.score}%`, size: 11 })),
    { text: '', size: 11, gap: 8 },
    { text: 'Strengths', size: 13 },
    ...result.strengths.map((s) => ({ text: `  -  ${s}`, size: 11 })),
    { text: '', size: 11, gap: 8 },
    { text: 'Areas of Improvement', size: 13 },
    ...result.improvements.map((s) => ({ text: `  -  ${s}`, size: 11 })),
  ];

  downloadBlob(buildPdf(lines), `interview-report-${result.id}.pdf`);
}
