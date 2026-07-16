import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Button,
  Card,
  Icon,
  Spinner,
  adminApi,
  analyzeResume,
  extractText,
  toast,
  useAuth,
  type Resume,
} from '@aip/shared';

/**
 * Candidate: upload a resume and see the summary parsed out of it.
 * The ATS score is deliberately not shown here — it is an internal hiring
 * signal shown to interviewers, not feedback for the candidate.
 */
export function ResumeCard() {
  const { user } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user?.email) return;
    setResume(await adminApi.getResume(user.email));
    setLoading(false);
  }, [user?.email]);

  useEffect(() => {
    void load();
  }, [load]);

  const store = async (fileName: string, text: string) => {
    if (!user?.email) return;
    setBusy(true);
    try {
      const analysed = analyzeResume(fileName, text);
      await adminApi.saveResume(user.email, analysed);
      setResume(analysed);
      setPasteOpen(false);
      setPasted('');
      toast('Resume uploaded and analysed.', 'success');
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    const { ok, text } = await extractText(file);
    setBusy(false);
    if (!ok) {
      // Be honest instead of inventing an analysis for a file we couldn't read.
      toast('Could not read text from that file. Upload a .txt/.md resume or paste the text.', 'error');
      setPasteOpen(true);
      return;
    }
    await store(file.name, text);
  };

  if (loading) {
    return (
      <Card>
        <div className="block-state">
          <Spinner size={24} />
          <p>Loading your resume…</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="resume-card">
      <div className="resume-card__head">
        <h2 className="section-title">My Resume</h2>
        <div className="resume-card__actions">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx"
            hidden
            onChange={onFile}
            aria-label="Upload resume"
          />
          <Button variant="outline" icon="upload" loading={busy} onClick={() => fileRef.current?.click()}>
            {resume ? 'Replace Resume' : 'Upload Resume'}
          </Button>
          <Button variant="ghost" onClick={() => setPasteOpen((v) => !v)}>
            {pasteOpen ? 'Cancel' : 'Paste text'}
          </Button>
        </div>
      </div>

      {pasteOpen && (
        <div className="resume-card__paste">
          <textarea
            className="resume-card__textarea"
            rows={6}
            placeholder="Paste your resume text here…"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
          <Button
            loading={busy}
            onClick={() => {
              if (pasted.trim().split(/\s+/).length < 50) {
                toast('Paste a bit more of your resume (at least ~50 words).', 'error');
                return;
              }
              void store('pasted-resume.txt', pasted);
            }}
          >
            Analyse Resume
          </Button>
        </div>
      )}

      {!resume ? (
        <div className="block-state">
          <Icon name="file-text" size={30} />
          <p>No resume uploaded yet. Upload one so your interviewer can review your profile.</p>
        </div>
      ) : (
        <div className="resume-summary">
          <p className="resume-summary__line">{resume.summary}</p>
          <div className="resume-summary__facts">
            <div>
              <dt>Current role</dt>
              <dd>{resume.currentRole || '—'}</dd>
            </div>
            <div>
              <dt>Experience</dt>
              <dd>{resume.experienceYears ? `${resume.experienceYears} years` : '—'}</dd>
            </div>
            <div>
              <dt>Education</dt>
              <dd>{resume.education || '—'}</dd>
            </div>
            <div>
              <dt>File</dt>
              <dd>{resume.fileName}</dd>
            </div>
          </div>
          <div>
            <dt className="resume-summary__label">Skills detected</dt>
            <div className="resume-summary__skills">
              {resume.skills.length > 0 ? (
                resume.skills.map((s) => (
                  <span key={s} className="resume-chip">
                    {s}
                  </span>
                ))
              ) : (
                <span className="adm-muted">None recognised</span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
