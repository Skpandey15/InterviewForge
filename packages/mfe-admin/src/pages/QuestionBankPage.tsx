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
  type BankQuestion,
  type QuestionType,
} from '@aip/shared';

const ALL = 'all';

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
  const [search, setSearch] = useState('');
  const [techFilter, setTechFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  const [draftText, setDraftText] = useState('');
  const [draftTech, setDraftTech] = useState(TECHNOLOGIES[0].label);
  const [draftType, setDraftType] = useState<QuestionType>('MCQ');
  const [draftDifficulty, setDraftDifficulty] = useState('Medium');
  const [draftTags, setDraftTags] = useState('');

  const reload = useCallback(async () => {
    setQuestions(await adminApi.getQuestions());
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
    setGenerating(true);
    try {
      const tech = techFilter !== ALL ? techFilter : TECHNOLOGIES[Math.floor(Math.random() * TECHNOLOGIES.length)].label;
      const type = (typeFilter !== ALL ? typeFilter : 'MCQ') as QuestionType;
      const question = await adminApi.generateAiQuestion(tech, type);
      toast(`AI generated a ${question.type} question for ${question.technology}.`, 'success');
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
        <div className="adm-page__actions">
          <Button variant="outline" icon="zap" loading={generating} onClick={handleGenerate}>
            AI Generate Question
          </Button>
          <Button icon="plus" onClick={() => setCreateOpen(true)}>
            Create Question
          </Button>
        </div>
      </header>

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
              options={TECHNOLOGIES.map((t) => ({ value: t.label, label: t.label }))}
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
