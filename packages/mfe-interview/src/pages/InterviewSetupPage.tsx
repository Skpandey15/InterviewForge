import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  API_MODE,
  ApiError,
  Button,
  Card,
  Checkbox,
  DIFFICULTY_LEVELS,
  DURATIONS,
  EXPERIENCE_LEVELS,
  Icon,
  QUESTION_COUNTS,
  QUESTION_TYPES,
  Radio,
  SelectField,
  TECHNOLOGIES,
  api,
  getSettings,
  interviewApi,
  toast,
  useAuth,
  type AiVoice,
  type InterviewConfig,
  type InterviewSessionData,
} from '@aip/shared';
import { LiveInterviewScreen } from '../components/LiveInterviewScreen';
import { InterviewRunScreen } from '../components/InterviewRunScreen';
import { generateQuestions, type MockQuestion } from '../lib/mockQuestions';
import '../styles/interview.css';

function labelOf(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export default function InterviewSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Prefilled from the user's saved Settings → Interview Defaults.
  const [defaults] = useState(() => getSettings(user?.id).defaults);
  const [technology, setTechnology] = useState(defaults.technology);
  const [experienceLevel, setExperienceLevel] = useState(defaults.experienceLevel);
  const [difficulty, setDifficulty] = useState(defaults.difficulty);
  const [duration, setDuration] = useState(defaults.duration);
  const [questionCount, setQuestionCount] = useState(defaults.questionCount);
  const [questionType, setQuestionType] = useState(defaults.questionType);
  const [aiVoice, setAiVoice] = useState<AiVoice>(defaults.aiVoice);
  const [webcamEnabled, setWebcamEnabled] = useState(defaults.webcamEnabled);
  const [micEnabled, setMicEnabled] = useState(defaults.micEnabled);

  const [session, setSession] = useState<InterviewSessionData | null>(null);
  const [starting, setStarting] = useState(false);
  /** Mock mode: the interactive run (question set + the config it was built from). */
  const [run, setRun] = useState<{ questions: MockQuestion[]; config: InterviewConfig } | null>(null);

  const buildConfig = (): InterviewConfig => ({
    technology,
    experienceLevel,
    difficulty,
    durationMinutes: Number(duration),
    questionCount: Number(questionCount),
    questionType,
    aiVoice,
    webcamEnabled,
    micEnabled,
  });

  /** Real backend: create the session and move into the answer screen. */
  const startRealInterview = async () => {
    setStarting(true);
    try {
      setSession(await interviewApi.start(buildConfig()));
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not start the interview.', 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (starting || run) return;

    if (API_MODE === 'real') {
      void startRealInterview();
      return;
    }

    // Mock mode: build the question set and enter the interactive run screen.
    const config = buildConfig();
    setRun({ questions: generateQuestions(config), config });
  };

  /** Called by the run screen on submit (or when the timer expires). */
  const finishMockRun = async (scorePercent: number) => {
    if (!run) return;
    try {
      const resultId = await api.completeInterview(
        run.config,
        {
          technology: labelOf(TECHNOLOGIES, run.config.technology),
          level: labelOf(EXPERIENCE_LEVELS, run.config.experienceLevel),
        },
        scorePercent,
      );
      toast('Interview submitted — here is your result!', 'success');
      navigate(`/results/${resultId}`);
    } catch {
      toast('Could not submit the interview. Please try again.', 'error');
    }
  };

  // Mock mode: the interactive interview (questions + answers + timer).
  if (run) {
    return (
      <div className="page interview-setup">
        <header className="interview-setup__header">
          <div>
            <h1 className="page__title">{labelOf(TECHNOLOGIES, run.config.technology)} Interview</h1>
            <p className="page__subtitle">
              {labelOf(EXPERIENCE_LEVELS, run.config.experienceLevel)} ·{' '}
              {labelOf(DIFFICULTY_LEVELS, run.config.difficulty)} · {run.questions.length} questions
            </p>
          </div>
        </header>
        <InterviewRunScreen
          questions={run.questions}
          config={run.config}
          labels={{
            technology: labelOf(TECHNOLOGIES, run.config.technology),
            level: labelOf(EXPERIENCE_LEVELS, run.config.experienceLevel),
            difficulty: labelOf(DIFFICULTY_LEVELS, run.config.difficulty),
            questionType: labelOf(QUESTION_TYPES, run.config.questionType),
          }}
          onComplete={finishMockRun}
          onAbort={() => {
            setRun(null);
            toast('Interview abandoned.', 'info');
          }}
        />
      </div>
    );
  }

  if (session) {
    return (
      <div className="page interview-setup">
        <header className="interview-setup__header">
          <div>
            <h1 className="page__title">
              {labelOf(TECHNOLOGIES, session.technology)} Interview
            </h1>
            <p className="page__subtitle">
              {labelOf(EXPERIENCE_LEVELS, session.level)} · {labelOf(DIFFICULTY_LEVELS, session.difficulty)}
            </p>
          </div>
        </header>
        <LiveInterviewScreen
          session={session}
          webcamEnabled={webcamEnabled}
          micEnabled={micEnabled}
          onComplete={() => navigate(`/results/${session.id}`)}
          onAbort={() => {
            setSession(null);
            toast('Interview abandoned.', 'info');
          }}
        />
      </div>
    );
  }

  return (
    <div className="page interview-setup">
      <header className="interview-setup__header">
        <div>
          <h1 className="page__title">Configure Your Interview</h1>
          <p className="page__subtitle">Select the preferences for your AI interview</p>
        </div>
        <span className="interview-setup__header-icon" aria-hidden="true">
          <Icon name="message-square" size={26} />
        </span>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="interview-setup__grid">
          <Card>
            <SelectField
              label="Technology"
              options={TECHNOLOGIES}
              value={technology}
              onChange={(e) => setTechnology(e.target.value)}
            />
          </Card>
          <Card>
            <SelectField
              label="Experience Level"
              options={EXPERIENCE_LEVELS}
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
            />
          </Card>
          <Card>
            <SelectField
              label="Difficulty Level"
              options={DIFFICULTY_LEVELS}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            />
          </Card>
          <Card>
            <SelectField
              label="Interview Duration"
              options={DURATIONS}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Card>
          <Card>
            <SelectField
              label="Number of Questions"
              options={QUESTION_COUNTS}
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
            />
          </Card>
          <Card>
            <SelectField
              label="Question Type"
              options={QUESTION_TYPES}
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
            />
          </Card>
          <Card>
            <fieldset className="option-group">
              <legend className="field__label">AI Voice</legend>
              <div className="option-group__options">
                <Radio
                  name="ai-voice"
                  label="Male"
                  value="male"
                  checked={aiVoice === 'male'}
                  onChange={() => setAiVoice('male')}
                />
                <Radio
                  name="ai-voice"
                  label="Female"
                  value="female"
                  checked={aiVoice === 'female'}
                  onChange={() => setAiVoice('female')}
                />
              </div>
            </fieldset>
          </Card>
          <Card>
            <div className="option-group">
              <span className="field__label">
                <Icon name="video" size={14} /> Camera
              </span>
              <Checkbox
                label="Enable Webcam"
                checked={webcamEnabled}
                onChange={(e) => setWebcamEnabled(e.target.checked)}
              />
            </div>
          </Card>
          <Card>
            <div className="option-group">
              <span className="field__label">
                <Icon name="mic" size={14} /> Microphone
              </span>
              <Checkbox
                label="Enable Microphone"
                checked={micEnabled}
                onChange={(e) => setMicEnabled(e.target.checked)}
              />
            </div>
          </Card>
        </div>

        <div className="interview-setup__actions">
          <Button type="submit" size="lg" icon="play" loading={starting}>
            Start Interview
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/dashboard')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
