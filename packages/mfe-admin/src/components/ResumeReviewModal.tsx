import { useCallback, useEffect, useState } from 'react';
import {
  ATS_THRESHOLD,
  Badge,
  Button,
  Modal,
  ProgressBar,
  Spinner,
  adminApi,
  defaultRejectionMessage,
  toast,
  useAuth,
  type Candidate,
  type Resume,
} from '@aip/shared';

interface ResumeReviewModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}

function atsTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= ATS_THRESHOLD) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}

/**
 * Staff view of a candidate's resume: full parsed detail plus the ATS score
 * and its breakdown. Below the ATS bar the candidature can be rejected with a
 * graceful, editable message.
 */
export function ResumeReviewModal({ candidate, onClose, onChanged }: ResumeReviewModalProps) {
  const { user } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!candidate) return;
    setLoading(true);
    setResume(await adminApi.getResume(candidate.email));
    setLoading(false);
    setRejecting(false);
  }, [candidate]);

  useEffect(() => {
    void load();
  }, [load]);

  const belowBar = resume != null && resume.atsScore < ATS_THRESHOLD;

  const reject = async () => {
    if (!candidate) return;
    setBusy(true);
    try {
      await adminApi.rejectCandidate(candidate.id, message, user?.name ?? 'Interviewer');
      toast(`${candidate.name}'s candidature was rejected and the message recorded.`, 'info');
      await onChanged();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not reject the candidature.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Resume — ${candidate?.name ?? ''}`} open={candidate !== null} onClose={onClose} width={640}>
      {loading ? (
        <div className="block-state">
          <Spinner size={24} />
          <p>Loading resume…</p>
        </div>
      ) : !resume ? (
        <div className="block-state">
          <p className="block-state__title">No resume uploaded</p>
          <p>{candidate?.name} hasn&apos;t uploaded a resume yet, so there is nothing to score.</p>
        </div>
      ) : candidate?.rejection ? (
        <div className="rsm">
          <Badge tone="neutral">Candidature rejected</Badge>
          <p className="adm-muted">
            Rejected by {candidate.rejection.by} on {new Date(candidate.rejection.at).toLocaleDateString()}
          </p>
          <pre className="rsm__message">{candidate.rejection.message}</pre>
        </div>
      ) : rejecting ? (
        <div className="rsm">
          <p>
            This message will be recorded against {candidate?.name}&apos;s candidature. Edit it as you see fit.
          </p>
          <textarea
            className="rsm__textarea"
            rows={12}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="rsm__actions">
            <Button variant="ghost" onClick={() => setRejecting(false)}>
              Back
            </Button>
            <Button variant="danger" loading={busy} onClick={reject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      ) : (
        <div className="rsm">
          <div className="rsm__ats">
            <div>
              <span className="rsm__label">ATS Score</span>
              <strong className={`rsm__score rsm__score--${atsTone(resume.atsScore)}`}>{resume.atsScore}%</strong>
            </div>
            <Badge tone={belowBar ? 'warning' : 'success'}>
              {belowBar ? `Below the ${ATS_THRESHOLD}% bar` : `Meets the ${ATS_THRESHOLD}% bar`}
            </Badge>
          </div>

          <div className="rsm__breakdown">
            {resume.atsBreakdown.map((c) => (
              <div key={c.key} className="rsm__criterion">
                <div className="rsm__criterion-head">
                  <span>{c.label}</span>
                  <strong>{c.score}%</strong>
                </div>
                <ProgressBar value={c.score} />
                <span className="adm-muted">{c.hint}</span>
              </div>
            ))}
          </div>

          <dl className="rsm__facts">
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
          </dl>

          <div>
            <span className="rsm__label">Skills</span>
            <div className="rsm__skills">
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

          <details className="rsm__raw">
            <summary>Full resume text</summary>
            <pre className="rsm__message">{resume.text}</pre>
          </details>

          {belowBar && (
            <div className="rsm__actions">
              <Button
                variant="danger"
                icon="x"
                onClick={() => {
                  setMessage(defaultRejectionMessage(candidate?.name ?? 'Candidate', resume.atsScore));
                  setRejecting(true);
                }}
              >
                Reject Candidature
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
