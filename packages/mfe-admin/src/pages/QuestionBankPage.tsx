import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  Modal,
  SelectField,
  Spinner,
  TextField,
  adminApi,
  toast,
  BANK_DIFFICULTIES,
  QUESTION_TYPE_OPTIONS,
  TECHNOLOGIES,
  type AiDistribution,
  type BankQuestion,
  type QuestionType,
  type Technology,
} from '@aip/shared';

const ALL = 'all';

const GENERATE_COUNTS = [1, 3, 5, 10, 15, 20].map((n) => ({
  value: String(n),
  label: `${n} question${n === 1 ? '' : 's'}`,
}));

const DISTRIBUTION_OPTIONS: { value: AiDistribution; label: string }[] = [
  { value: 'mixed', label: 'Mixed (all types)' },
  { value: 'MCQ', label: 'MCQ only' },
  { value: 'Coding', label: 'Coding only' },
  { value: 'System Design', label: 'System Design only' },
  { value: 'Behavioral', label: 'Behavioral only' },
];

function difficultyTone(difficulty: BankQuestion['difficulty']): 'success' | 'info' | 'warning' | 'neutral' {
  switch (difficulty) {
    case 'Easy':
      return 'success';
    case 'Medium':
      return 'info';
    case 'Hard':
      return 'warning';
    default:
      return 'neutral';
  }
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<BankQuestion[] | null>(null);
  const [catalogue, setCatalogue] = useState<Technology[]>([]);
  const [search, setSearch] = useState('');
  const [techFilter, setTechFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  // AI generator controls.
  const [genCount, setGenCount] = useState('5');
  const [genTech, setGenTech] = useState(TECHNOLOGIES[0].label);
  const [genDifficulty, setGenDifficulty] = useState('Medium');
  const [genDistribution, setGenDistribution] = useState<AiDistribution>('mixed');

  const [draftText, setDraftText] = useState('');
  const [draftTech, setDraftTech] = useState(TECHNOLOGIES[0].label);
  const [draftType, setDraftType] = useState<QuestionType>('MCQ');
  const [draftDifficulty, setDraftDifficulty] = useState('Medium');
  const [draftTags, setDraftTags] = useState('');

  const reload = useCallback(async () => {
    const [list, techs] = await Promise.all([adminApi.getQuestions(), adminApi.getTechnologies()]);
    setQuestions(list);
    setCatalogue(techs);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!questions) return null;
    const query = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (techFilter !== ALL && q.technology !== techFilter) return false;
      if (typeFilter !== ALL && q.type !== typeFilter) return false;
      if (query && !q.text.toLowerCase().includes(query) && !q.tags.some((t) => t.includes(query))) return false;
      return true;
    });
  }, [questions, search, techFilter, typeFilter]);

  const technologies = useMemo(() => {
    const set = new Set((questions ?? []).map((q) => q.technology));
    return [...set].sort();
  }, [questions]);

  /** Generator/create options come from the managed Technologies catalogue. */
  const techOptions = useMemo(() => {
    const names = catalogue.length > 0 ? catalogue.map((t) => t.name) : TECHNOLOGIES.map((t) => t.label);
    return names.map((name) => ({ value: name, label: name }));
  }, [catalogue]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (draftText.trim().length < 12) {
      toast('Question text is too short.', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminApi.addQuestion({
        text: draftText.trim(),
        technology: draftTech,
        type: draftType,
        difficulty: draftDifficulty as BankQuestion['difficulty'],
        tags: draftTags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      });
      toast('Question added to the bank.', 'success');
      setCreateOpen(false);
      setDraftText('');
      setDraftTags('');
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    const requested = Number(genCount);
    setGenerating(true);
    try {
      const created = await adminApi.generateAiQuestions({
        technology: genTech,
        difficulty: genDifficulty as BankQuestion['difficulty'],
        count: requested,
        distribution: genDistribution,
      });
      if (created.length === 0) {
        toast(`No new questions — the bank already has every ${genTech} question we can generate.`, 'info');
      } else if (created.length < requested) {
        // Be honest about the shortfall rather than silently adding duplicates.
        toast(`Generated ${created.length} of ${requested} — the rest would have duplicated existing questions.`, 'info');
      } else {
        toast(`AI generated ${created.length} ${genTech} question${created.length === 1 ? '' : 's'}.`, 'success');
      }
      await reload();
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (question: BankQuestion) => {
    await adminApi.deleteQuestion(question.id);
    toast('Question removed.', 'info');
    await reload();
  };

  return (
    <div className="page adm-page">
      <header className="adm-page__header">
        <div>
          <h1 className="page__title">Question Bank</h1>
          <p className="page__subtitle">Curate, tag and generate the questions used in interviews.</p>
        </div>
      </header>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <SelectField
            label="Number of Questions"
            options={GENERATE_COUNTS}
            value={genCount}
            onChange={(e) => setGenCount(e.target.value)}
          />
          <SelectField
            label="Technology"
            options={techOptions}
            value={genTech}
            onChange={(e) => setGenTech(e.target.value)}
          />
          <SelectField
            label="Difficulty"
            options={BANK_DIFFICULTIES}
            value={genDifficulty}
            onChange={(e) => setGenDifficulty(e.target.value)}
          />
          <SelectField
            label="Question Distribution"
            options={DISTRIBUTION_OPTIONS}
            value={genDistribution}
            onChange={(e) => setGenDistribution(e.target.value as AiDistribution)}
          />
        </div>
        <div
          style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}
        >
          <Button variant="outline" icon="zap" loading={generating} onClick={handleGenerate}>
            AI Generate Question
          </Button>
          <Button
            icon="plus"
            onClick={() => {
              // Carry the panel's choices into the manual form.
              setDraftTech(genTech);
              setDraftDifficulty(genDifficulty);
              setCreateOpen(true);
            }}
          >
            Create Question
          </Button>
        </div>
      </Card>

      <div className="adm-toolbar">
        <TextField
          icon="search"
          placeholder="Search questions or tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search questions"
        />
        <SelectField
          aria-label="Filter by technology"
          options={[{ value: ALL, label: 'All technologies' }, ...technologies.map((t) => ({ value: t, label: t }))]}
          value={techFilter}
          onChange={(e) => setTechFilter(e.target.value)}
        />
        <SelectField
          aria-label="Filter by type"
          options={[{ value: ALL, label: 'All types' }, ...QUESTION_TYPE_OPTIONS]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        />
      </div>

      {!filtered ? (
        <div className="block-state">
          <Spinner size={28} />
          <p>Loading question bank…</p>
        </div>
      ) : (
        <div className="adm-question-list">
          {filtered.map((question) => (
            <Card key={question.id} className="adm-question">
              <div className="adm-question__main">
                <p className="adm-question__text">{question.text}</p>
                <div className="adm-question__meta">
                  <Badge tone="info">{question.technology}</Badge>
                  <Badge tone="neutral">{question.type}</Badge>
                  <Badge tone={difficultyTone(question.difficulty)}>{question.difficulty}</Badge>
                  {question.source === 'AI Generated' && <Badge tone="warning">AI Generated</Badge>}
                  {question.tags.map((tag) => (
                    <span key={tag} className="adm-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="adm-question__side">
                <span className="adm-muted">used {question.timesUsed}×</span>
                <button
                  type="button"
                  className="adm-link-danger"
                  onClick={() => handleDelete(question)}
                  aria-label={`Delete question ${question.id}`}
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <div className="block-state">No questions match the current filters.</div>}
        </div>
      )}

      <Modal title="Create Question" open={createOpen} onClose={() => setCreateOpen(false)} width={520}>
        <form className="adm-form" onSubmit={handleCreate}>
          <div className="field">
            <label className="field__label" htmlFor="q-text">
              Question Text
            </label>
            <textarea
              id="q-text"
              className="field__input adm-textarea"
              rows={3}
              placeholder="Write the question exactly as the candidate will see it…"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
          </div>
          <div className="adm-grid adm-grid--3">
            <SelectField
              label="Technology"
              options={techOptions}
              value={draftTech}
              onChange={(e) => setDraftTech(e.target.value)}
            />
            <SelectField
              label="Type"
              options={QUESTION_TYPE_OPTIONS}
              value={draftType}
              onChange={(e) => setDraftType(e.target.value as QuestionType)}
            />
            <SelectField
              label="Difficulty"
              options={BANK_DIFFICULTIES}
              value={draftDifficulty}
              onChange={(e) => setDraftDifficulty(e.target.value)}
            />
          </div>
          <TextField
            label="Tags (comma separated)"
            placeholder="e.g. collections, core-java"
            value={draftTags}
            onChange={(e) => setDraftTags(e.target.value)}
          />
          <Button type="submit" block loading={busy}>
            Add to Question Bank
          </Button>
        </form>
      </Modal>
    </div>
  );
}
