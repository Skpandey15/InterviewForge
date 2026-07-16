import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DIFFICULTY_LEVELS,
  DURATIONS,
  EDITOR_THEMES,
  EXPERIENCE_LEVELS,
  Icon,
  Modal,
  PROGRAMMING_LANGUAGES,
  SelectField,
  TECHNOLOGIES,
  TextField,
  adminApi,
  toast,
  type AiSettings,
  type Candidate,
  type CodingSettings,
  type EvaluationWeights,
  type InterviewTemplate,
  type QuestionDistribution,
} from '@aip/shared';

const labelOfTech = (value: string): string =>
  TECHNOLOGIES.find((t) => t.value === value)?.label ?? value;

const DEFAULT_DISTRIBUTION: QuestionDistribution = { mcq: 10, coding: 5, systemDesign: 2, behavioral: 3 };

const DEFAULT_AI: AiSettings = {
  followUpQuestions: true,
  adaptiveDifficulty: true,
  webcamMonitoring: true,
  micMonitoring: true,
  tabSwitchDetection: true,
  randomizeQuestions: true,
  autoSubmit: true,
};

const DEFAULT_CODING: CodingSettings = {
  language: 'java',
  editorTheme: 'dark',
  allowedLibraries: 'Standard library only',
  testCasesPerQuestion: 5,
  timeLimitMinutes: 20,
};

const DEFAULT_WEIGHTS: EvaluationWeights = {
  technicalSkills: 30,
  communication: 15,
  problemSolving: 25,
  confidence: 10,
  grammar: 5,
  codeQuality: 15,
};

const AI_SETTING_LABELS: Array<{ key: keyof AiSettings; label: string }> = [
  { key: 'followUpQuestions', label: 'AI Follow-up Questions' },
  { key: 'adaptiveDifficulty', label: 'Adaptive Difficulty' },
  { key: 'webcamMonitoring', label: 'Webcam Monitoring' },
  { key: 'micMonitoring', label: 'Microphone Monitoring' },
  { key: 'tabSwitchDetection', label: 'Tab Switch Detection' },
  { key: 'randomizeQuestions', label: 'Randomize Questions' },
  { key: 'autoSubmit', label: 'Auto Submit' },
];

const DISTRIBUTION_LABELS: Array<{ key: keyof QuestionDistribution; label: string }> = [
  { key: 'mcq', label: 'MCQ' },
  { key: 'coding', label: 'Coding' },
  { key: 'systemDesign', label: 'System Design' },
  { key: 'behavioral', label: 'Behavioral' },
];

const WEIGHT_LABELS: Array<{ key: keyof EvaluationWeights; label: string }> = [
  { key: 'technicalSkills', label: 'Technical Skills' },
  { key: 'communication', label: 'Communication' },
  { key: 'problemSolving', label: 'Problem Solving' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'codeQuality', label: 'Code Quality' },
];

function labelOf(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export default function InterviewBuilderPage() {
  const [editingId, setEditingId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [technology, setTechnology] = useState('java-backend');
  const [experienceLevel, setExperienceLevel] = useState('senior-8-12');
  const [difficulty, setDifficulty] = useState('hard');
  const [duration, setDuration] = useState('60');
  const [distribution, setDistribution] = useState<QuestionDistribution>(DEFAULT_DISTRIBUTION);
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI);
  const [codingSettings, setCodingSettings] = useState<CodingSettings>(DEFAULT_CODING);
  const [weights, setWeights] = useState<EvaluationWeights>(DEFAULT_WEIGHTS);

  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);

  // "Build from resume": candidates who have actually uploaded one.
  const [resumePickerOpen, setResumePickerOpen] = useState(false);
  const [resumeCandidates, setResumeCandidates] = useState<Candidate[]>([]);
  const [pickedResumeEmail, setPickedResumeEmail] = useState('');
  const [buildingFromResume, setBuildingFromResume] = useState(false);

  useEffect(() => {
    void (async () => {
      const candidates = await adminApi.getCandidates();
      const withResume: Candidate[] = [];
      for (const candidate of candidates) {
        if (await adminApi.getResume(candidate.email)) withResume.push(candidate);
      }
      setResumeCandidates(withResume);
      setPickedResumeEmail((current) => current || withResume[0]?.email || '');
    })();
  }, []);

  /** Map the resume's strongest skill + years onto the builder's fields. */
  const buildFromResume = async () => {
    const candidate = resumeCandidates.find((c) => c.email === pickedResumeEmail);
    if (!candidate) return;
    setBuildingFromResume(true);
    try {
      const resume = await adminApi.getResume(candidate.email);
      if (!resume) {
        toast('That candidate no longer has a resume.', 'error');
        return;
      }
      // Match a detected skill to a technology option; fall back to the current one.
      const tech =
        TECHNOLOGIES.find((t) => resume.skills.some((s) => s.toLowerCase() === t.label.toLowerCase()))?.value ??
        TECHNOLOGIES.find((t) =>
          resume.skills.some((s) => t.label.toLowerCase().includes(s.toLowerCase())),
        )?.value ??
        technology;
      const years = resume.experienceYears;
      const level =
        years >= 12 ? 'principal' : years >= 8 ? 'senior-8-12' : years >= 5 ? 'senior-5-8' : years >= 3 ? 'mid' : 'junior';

      setEditingId(undefined);
      setName(`${candidate.name} — ${labelOfTech(tech)} (from resume)`);
      setTechnology(tech);
      setExperienceLevel(level);
      setDifficulty(years >= 8 ? 'hard' : years >= 3 ? 'medium' : 'easy');
      setResumePickerOpen(false);
      toast(`Pre-filled from ${candidate.name}'s resume — review and publish.`, 'success');
    } finally {
      setBuildingFromResume(false);
    }
  };

  useEffect(() => {
    void adminApi.getTemplates().then(setTemplates);
  }, []);

  const totalQuestions = useMemo(
    () => Object.values(distribution).reduce((sum, n) => sum + n, 0),
    [distribution],
  );
  const totalWeight = useMemo(() => Object.values(weights).reduce((sum, n) => sum + n, 0), [weights]);
  const hasCoding = distribution.coding > 0;

  const setDistributionValue = (key: keyof QuestionDistribution, raw: string) => {
    const value = Math.max(0, Math.min(50, Number(raw) || 0));
    setDistribution((prev) => ({ ...prev, [key]: value }));
  };

  const setWeightValue = (key: keyof EvaluationWeights, raw: string) => {
    const value = Math.max(0, Math.min(100, Number(raw) || 0));
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (forPublish: boolean): string | null => {
    if (!name.trim()) return 'Give the interview a name.';
    if (totalQuestions === 0) return 'Question distribution must contain at least one question.';
    if (forPublish && totalWeight !== 100) return `Evaluation weights must total 100% (currently ${totalWeight}%).`;
    return null;
  };

  const handleSave = async (status: 'Draft' | 'Published') => {
    const error = validate(status === 'Published');
    if (error) {
      toast(error, 'error');
      return;
    }
    setSaving(status === 'Draft' ? 'draft' : 'publish');
    try {
      const saved = await adminApi.saveTemplate(
        {
          id: editingId,
          name: name.trim(),
          technology,
          experienceLevel,
          difficulty,
          durationMinutes: Number(duration),
          distribution,
          aiSettings,
          codingSettings,
          evaluationWeights: weights,
        },
        status,
      );
      setEditingId(saved.id);
      setTemplates(await adminApi.getTemplates());
      toast(
        status === 'Published'
          ? `🚀 "${saved.name}" published — it can now be assigned to candidates.`
          : `Draft "${saved.name}" saved.`,
        'success',
      );
    } finally {
      setSaving(null);
    }
  };

  const loadTemplate = (template: InterviewTemplate) => {
    setEditingId(template.id);
    setName(template.name);
    setTechnology(template.technology);
    setExperienceLevel(template.experienceLevel);
    setDifficulty(template.difficulty);
    setDuration(String(template.durationMinutes));
    setDistribution(template.distribution);
    setAiSettings(template.aiSettings);
    setCodingSettings(template.codingSettings);
    setWeights(template.evaluationWeights);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`Editing "${template.name}".`, 'info');
  };

  const resetForm = () => {
    setEditingId(undefined);
    setName('');
    setDistribution(DEFAULT_DISTRIBUTION);
    setAiSettings(DEFAULT_AI);
    setCodingSettings(DEFAULT_CODING);
    setWeights(DEFAULT_WEIGHTS);
  };

  return (
    <div className="page adm-page">
      <header className="adm-page__header">
        <div>
          <h1 className="page__title">Interview Builder</h1>
          <p className="page__subtitle">
            Design the interview candidates will take — questions, AI behaviour and scoring.
          </p>
        </div>
        <div className="adm-page__actions">
          <Button variant="outline" icon="file-text" onClick={() => setResumePickerOpen(true)}>
            Build from Resume
          </Button>
          {editingId && (
            <Button variant="ghost" icon="plus" onClick={resetForm}>
              New Interview
            </Button>
          )}
        </div>
      </header>

      <Modal
        title="Build interview from a candidate's resume"
        open={resumePickerOpen}
        onClose={() => setResumePickerOpen(false)}
        width={520}
      >
        {resumeCandidates.length === 0 ? (
          <p>No candidate has uploaded a resume yet. Once they do, you can tailor an interview to it here.</p>
        ) : (
          <div className="adm-form">
            <p className="adm-muted">
              The interview is pre-filled from the resume: technology from the candidate&apos;s strongest
              detected skill, level from their years of experience.
            </p>
            <SelectField
              label="Candidate"
              options={resumeCandidates.map((c) => ({ value: c.email, label: `${c.name} — ${c.email}` }))}
              value={pickedResumeEmail}
              onChange={(e) => setPickedResumeEmail(e.target.value)}
            />
            <Button block loading={buildingFromResume} onClick={() => void buildFromResume()}>
              Pre-fill Interview
            </Button>
          </div>
        )}
      </Modal>

      <div className="adm-builder">
        <Card className="adm-builder__section">
          <h2 className="section-title">Basics</h2>
          <div className="adm-grid adm-grid--3">
            <TextField
              label="Interview Name"
              placeholder="e.g. Java Backend — Senior"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <SelectField label="Technology" options={TECHNOLOGIES} value={technology} onChange={(e) => setTechnology(e.target.value)} />
            <SelectField
              label="Experience Level"
              options={EXPERIENCE_LEVELS}
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
            />
            <SelectField label="Difficulty" options={DIFFICULTY_LEVELS} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
            <SelectField label="Duration" options={DURATIONS} value={duration} onChange={(e) => setDuration(e.target.value)} />
            <div className="field">
              <span className="field__label">Number of Questions</span>
              <div className="adm-total-pill">
                <Icon name="list" size={15} /> {totalQuestions} questions (from distribution)
              </div>
            </div>
          </div>
        </Card>

        <Card className="adm-builder__section">
          <h2 className="section-title">Question Distribution</h2>
          <div className="adm-grid adm-grid--4">
            {DISTRIBUTION_LABELS.map(({ key, label }) => (
              <TextField
                key={key}
                label={label}
                type="number"
                min={0}
                max={50}
                value={String(distribution[key])}
                onChange={(e) => setDistributionValue(key, e.target.value)}
              />
            ))}
          </div>
        </Card>

        <Card className="adm-builder__section">
          <h2 className="section-title">AI Settings</h2>
          <div className="adm-check-grid">
            {AI_SETTING_LABELS.map(({ key, label }) => (
              <Checkbox
                key={key}
                label={label}
                checked={aiSettings[key]}
                onChange={(e) => setAiSettings((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
            ))}
          </div>
        </Card>

        <Card className={`adm-builder__section ${hasCoding ? '' : 'adm-builder__section--muted'}`}>
          <h2 className="section-title">
            Coding Settings{' '}
            {!hasCoding && <span className="adm-muted">(no coding questions in the distribution)</span>}
          </h2>
          <div className="adm-grid adm-grid--3">
            <SelectField
              label="Programming Language"
              options={PROGRAMMING_LANGUAGES}
              value={codingSettings.language}
              onChange={(e) => setCodingSettings((prev) => ({ ...prev, language: e.target.value }))}
              disabled={!hasCoding}
            />
            <SelectField
              label="Code Editor Theme"
              options={EDITOR_THEMES}
              value={codingSettings.editorTheme}
              onChange={(e) => setCodingSettings((prev) => ({ ...prev, editorTheme: e.target.value }))}
              disabled={!hasCoding}
            />
            <TextField
              label="Allowed Libraries"
              placeholder="e.g. java.util.*"
              value={codingSettings.allowedLibraries}
              onChange={(e) => setCodingSettings((prev) => ({ ...prev, allowedLibraries: e.target.value }))}
              disabled={!hasCoding}
            />
            <TextField
              label="Test Cases per Question"
              type="number"
              min={1}
              max={20}
              value={String(codingSettings.testCasesPerQuestion)}
              onChange={(e) =>
                setCodingSettings((prev) => ({ ...prev, testCasesPerQuestion: Math.max(1, Number(e.target.value) || 1) }))
              }
              disabled={!hasCoding}
            />
            <TextField
              label="Time Limit per Question (min)"
              type="number"
              min={5}
              max={90}
              value={String(codingSettings.timeLimitMinutes)}
              onChange={(e) =>
                setCodingSettings((prev) => ({ ...prev, timeLimitMinutes: Math.max(5, Number(e.target.value) || 5) }))
              }
              disabled={!hasCoding}
            />
          </div>
        </Card>

        <Card className="adm-builder__section">
          <h2 className="section-title">
            Evaluation Settings{' '}
            <span className={totalWeight === 100 ? 'adm-weight-ok' : 'adm-weight-bad'}>
              total {totalWeight}%{totalWeight !== 100 && ' — must be 100%'}
            </span>
          </h2>
          <div className="adm-grid adm-grid--3">
            {WEIGHT_LABELS.map(({ key, label }) => (
              <TextField
                key={key}
                label={`${label} (%)`}
                type="number"
                min={0}
                max={100}
                value={String(weights[key])}
                onChange={(e) => setWeightValue(key, e.target.value)}
              />
            ))}
          </div>
        </Card>

        <div className="adm-builder__actions">
          <Button variant="outline" icon="download" loading={saving === 'draft'} onClick={() => handleSave('Draft')}>
            Save Draft
          </Button>
          <Button variant="outline" icon="eye" onClick={() => setPreviewOpen(true)}>
            Preview Interview
          </Button>
          <Button icon="play" loading={saving === 'publish'} onClick={() => handleSave('Published')}>
            Publish Interview
          </Button>
        </div>
      </div>

      <section aria-label="Existing interviews">
        <h2 className="section-title">Your Interviews</h2>
        <Card padding="none" className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Technology</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Updated</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="data-table__strong">{template.name}</td>
                  <td>{labelOf(TECHNOLOGIES, template.technology)}</td>
                  <td>{Object.values(template.distribution).reduce((s, n) => s + n, 0)}</td>
                  <td>
                    <Badge tone={template.status === 'Published' ? 'success' : 'warning'}>{template.status}</Badge>
                  </td>
                  <td>{new Date(template.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                  <td>
                    <button type="button" className="data-table__view" onClick={() => loadTemplate(template)}>
                      <Icon name="edit" size={12} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <Modal title="Interview Preview" open={previewOpen} onClose={() => setPreviewOpen(false)} width={520}>
        <div className="adm-preview">
          <h3 className="adm-preview__name">{name.trim() || 'Untitled interview'}</h3>
          <p className="adm-muted">
            {labelOf(TECHNOLOGIES, technology)} · {labelOf(EXPERIENCE_LEVELS, experienceLevel)} ·{' '}
            {labelOf(DIFFICULTY_LEVELS, difficulty)} · {duration} minutes
          </p>
          <div className="adm-preview__row">
            {DISTRIBUTION_LABELS.map(({ key, label }) => (
              <span key={key} className="adm-total-pill">
                {label}: {distribution[key]}
              </span>
            ))}
          </div>
          <h4 className="section-title">Candidate experience</h4>
          <ol className="adm-preview__steps">
            <li>Identity check{aiSettings.webcamMonitoring ? ' with webcam monitoring' : ''}.</li>
            <li>
              {totalQuestions} questions{aiSettings.randomizeQuestions ? ' in randomized order' : ''}
              {aiSettings.adaptiveDifficulty ? ', difficulty adapting to answers' : ''}.
            </li>
            {aiSettings.followUpQuestions && <li>AI asks follow-ups on weak or interesting answers.</li>}
            {hasCoding && (
              <li>
                Coding in {labelOf(PROGRAMMING_LANGUAGES, codingSettings.language)} (
                {codingSettings.testCasesPerQuestion} hidden test cases, {codingSettings.timeLimitMinutes} min each).
              </li>
            )}
            <li>{aiSettings.autoSubmit ? 'Auto-submits when time runs out.' : 'Manual submit.'}</li>
            <li>Scored across {WEIGHT_LABELS.filter(({ key }) => weights[key] > 0).length} weighted criteria.</li>
          </ol>
        </div>
      </Modal>
    </div>
  );
}
