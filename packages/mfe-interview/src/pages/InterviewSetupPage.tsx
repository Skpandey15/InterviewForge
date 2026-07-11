import { useEffect, useRef, useState, type FormEvent } from 'react';
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
  ProgressBar,
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
import '../styles/interview.css';

const SIMULATION_STEPS = [
  'Generating your question set…',
  'Preparing the AI interviewer…',
  'Conducting the interview…',
  'Evaluating your answers…',
];

const STEP_DURATION_MS = 1200;

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

  const [runningStep, setRunningStep] = useState<number | null>(null);
  const [session, setSession] = useState<InterviewSessionData | null>(null);
  const [starting, setStarting] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => () => timersRef.current.forEach((t) => window.clearTimeout(t)), []);

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
    if (runningStep !== null || starting) return;

    if (API_MODE === 'real') {
      void startRealInterview();
      return;
    }

    const config = buildConfig();

    setRunningStep(0);
    SIMULATION_STEPS.forEach((_, index) => {
      if (index === 0) return;
      timersRef.current.push(window.setTimeout(() => setRunningStep(index), index * STEP_DURATION_MS));
    });
    timersRef.current.push(
      window.setTimeout(async () => {
        try {
          const resultId = await api.completeInterview(config, {
            technology: labelOf(TECHNOLOGIES, technology),
            level: labelOf(EXPERIENCE_LEVELS, experienceLevel),
          });
          toast('Interview completed — here is your result!', 'success');
          navigate(`/results/${resultId}`);
        } catch {
          setRunningStep(null);
          toast('Could not complete the interview. Please try again.', 'error');
        }
      }, SIMULATION_STEPS.length * STEP_DURATION_MS),
    );
  };

  const progress =
    runningStep === null ? 0 : Math.round(((runningStep + 1) / SIMULATION_STEPS.length) * 100);

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

      {runningStep !== null && (
        <div className="interview-run" role="dialog" aria-modal="true" aria-label="Interview in progress">
          <div className="interview-run__card">
            <span className="interview-run__pulse">
              <Icon name="message-square" size={28} />
            </span>
            <h2>Interview in progress</h2>
            <p className="interview-run__step">{SIMULATION_STEPS[runningStep]}</p>
            <ProgressBar value={progress} label="Interview progress" />
            <p className="interview-run__hint">
              {labelOf(TECHNOLOGIES, technology)} · {labelOf(DIFFICULTY_LEVELS, difficulty)} ·{' '}
              {labelOf(QUESTION_COUNTS, questionCount)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
