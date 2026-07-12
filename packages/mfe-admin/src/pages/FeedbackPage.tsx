import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  SelectField,
  Spinner,
  adminApi,
  downloadPdf,
  toast,
  type Candidate,
  type CandidateFeedback,
  type FeedbackVerdict,
  type PdfLine,
} from '@aip/shared';

const toLines = (items: string[]): string => items.join('\n');
const fromLines = (text: string): string[] => text.split('\n').map((s) => s.trim()).filter(Boolean);

/**
 * Interviewer + admin: generate AI-assisted feedback for a candidate
 * (strengths, weaknesses, areas of improvement, selected / not selected),
 * edit it, save it, and export an overall feedback PDF.
 */
export default function FeedbackPage() {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<CandidateFeedback | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const list = await adminApi.getCandidates();
    setCandidates(list);
    setSelectedId((current) => current || list[0]?.id || '');
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selected = useMemo(
    () => candidates?.find((c) => c.id === selectedId) ?? null,
    [candidates, selectedId],
  );

  // Load any previously-saved feedback when the candidate changes.
  useEffect(() => {
    setDraft(selected?.feedback ?? null);
  }, [selected]);

  const generate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const feedback = await adminApi.generateFeedback(selected.id);
      setDraft(feedback);
      toast('AI drafted the feedback — review and edit before saving.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to generate feedback.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!selected || !draft) return;
    setSaving(true);
    try {
      await adminApi.saveFeedback(selected.id, draft);
      toast(`Feedback saved for ${selected.name}.`, 'success');
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save feedback.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const downloadReport = () => {
    if (!selected || !draft) return;
    const lines: PdfLine[] = [
      { text: 'Candidate Feedback Report', size: 22, gap: 30 },
      { text: `Candidate: ${selected.name}`, size: 13 },
      { text: `Email: ${selected.email}`, size: 12 },
      { text: `Technology: ${selected.technology}`, size: 12 },
      { text: `Interview: ${selected.assignedInterview ?? '—'}`, size: 12, gap: 20 },
      { text: `Verdict: ${draft.verdict}`, size: 15, gap: 18 },
      { text: 'Summary', size: 14 },
      { text: draft.summary || '—', size: 11, gap: 16 },
      { text: 'Strengths', size: 14 },
      ...draft.strengths.map((s) => ({ text: `- ${s}`, size: 11 })),
      { text: '', size: 6 },
      { text: 'Weaknesses', size: 14 },
      ...draft.weaknesses.map((s) => ({ text: `- ${s}`, size: 11 })),
      { text: '', size: 6 },
      { text: 'Areas of Improvement', size: 14 },
      ...draft.improvements.map((s) => ({ text: `- ${s}`, size: 11 })),
      { text: '', size: 12 },
      { text: `Reviewed by: ${draft.by || '—'}`, size: 11 },
    ];
    downloadPdf(lines, `feedback-${selected.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    toast('Feedback PDF downloaded.', 'success');
  };

  return (
    <div className="page adm-page">
      <header className="adm-page__header">
        <div>
          <h1 className="page__title">Candidate Feedback</h1>
          <p className="page__subtitle">
            Generate AI-assisted feedback, set the verdict, and export an overall report.
          </p>
        </div>
      </header>

      {!candidates ? (
        <div className="block-state">
          <Spinner size={28} />
          <p>Loading candidates…</p>
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <div className="block-state">No candidates yet — add candidates first.</div>
        </Card>
      ) : (
        <div className="adm-feedback">
          <Card className="adm-feedback__picker">
            <SelectField
              label="Candidate"
              options={candidates.map((c) => ({ value: c.id, label: `${c.name} — ${c.technology}` }))}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            />
            {selected && (
              <div className="adm-feedback__meta">
                <div>
                  <span className="adm-muted">Interview</span>
                  <strong>{selected.assignedInterview ?? 'Not assigned'}</strong>
                </div>
                <div>
                  <span className="adm-muted">Score</span>
                  <strong>{selected.score != null ? `${selected.score}%` : '—'}</strong>
                </div>
                <div>
                  <span className="adm-muted">Interviewer</span>
                  <strong>{selected.assignedInterviewer ?? '—'}</strong>
                </div>
              </div>
            )}
            <Button icon="zap" onClick={generate} loading={generating} block>
              {draft ? 'Regenerate with AI' : 'Generate with AI'}
            </Button>
          </Card>

          <Card className="adm-feedback__editor">
            {!draft ? (
              <div className="block-state">Select a candidate and generate feedback to begin.</div>
            ) : (
              <div className="adm-form">
                <div className="adm-field">
                  <span>Verdict</span>
                  <div className="adm-verdict">
                    {(['Selected', 'Not Selected'] as FeedbackVerdict[]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`adm-verdict__btn ${draft.verdict === v ? `adm-verdict__btn--${v === 'Selected' ? 'yes' : 'no'}` : ''}`}
                        onClick={() => setDraft({ ...draft, verdict: v })}
                      >
                        {v === 'Selected' ? '✓ ' : '✕ '}
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="adm-field">
                  <span>Summary</span>
                  <textarea
                    className="adm-textarea"
                    rows={3}
                    value={draft.summary}
                    onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                  />
                </label>
                <label className="adm-field">
                  <span>Strengths (one per line)</span>
                  <textarea
                    className="adm-textarea"
                    rows={4}
                    value={toLines(draft.strengths)}
                    onChange={(e) => setDraft({ ...draft, strengths: fromLines(e.target.value) })}
                  />
                </label>
                <label className="adm-field">
                  <span>Weaknesses (one per line)</span>
                  <textarea
                    className="adm-textarea"
                    rows={3}
                    value={toLines(draft.weaknesses)}
                    onChange={(e) => setDraft({ ...draft, weaknesses: fromLines(e.target.value) })}
                  />
                </label>
                <label className="adm-field">
                  <span>Areas of Improvement (one per line)</span>
                  <textarea
                    className="adm-textarea"
                    rows={3}
                    value={toLines(draft.improvements)}
                    onChange={(e) => setDraft({ ...draft, improvements: fromLines(e.target.value) })}
                  />
                </label>
                <div className="adm-feedback__actions">
                  <Button variant="outline" icon="download" onClick={downloadReport}>
                    Download PDF
                  </Button>
                  <Button icon="check" onClick={save} loading={saving}>
                    Save Feedback
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
