import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  API_MODE,
  ApiError,
  Badge,
  Button,
  Card,
  DIFFICULTY_LEVELS,
  EXPERIENCE_LEVELS,
  Icon,
  QUESTION_TYPES,
  Spinner,
  TECHNOLOGIES,
  adminApi,
  api,
  interviewApi,
  toast,
  useAuth,
  type InterviewConfig,
  type InterviewSessionData,
  type InterviewTemplate,
} from '@aip/shared';
import { LiveInterviewScreen } from '../components/LiveInterviewScreen';
import { InterviewRunScreen } from '../components/InterviewRunScreen';
import { generateQuestions, generateQuestionsFromLlm, type MockQuestion } from '../lib/mockQuestions';
import '../styles/interview.css';

function labelOf(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/**
 * The run config comes entirely from the assigned interview — the candidate
 * does not choose technology, difficulty, duration or question mix.
 */
function configFromTemplate(template: InterviewTemplate): InterviewConfig {
  const d = template.distribution;
  const total = d.mcq + d.coding + d.systemDesign + d.behavioral;
  const hasMcq = d.mcq > 0;
  const hasOpen = d.coding + d.systemDesign + d.behavioral > 0;
  return {
    technology: template.technology,
    experienceLevel: template.experienceLevel,
    difficulty: template.difficulty,
    durationMinutes: template.durationMinutes,
    questionCount: total > 0 ? total : 5,
    questionType: hasMcq && hasOpen ? 'mixed' : hasMcq ? 'mcq' : 'coding',
    aiVoice: 'female',
    webcamEnabled: template.aiSettings.webcamMonitoring,
    micEnabled: template.aiSettings.micMonitoring,
  };
}

export default function InterviewSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assigned, setAssigned] = useState<InterviewTemplate[] | null>(null);
  const [session, setSession] = useState<InterviewSessionData | null>(null);
  const [startingId, setStartingId] = useState('');
  /** Mock mode: the interactive run (question set + the config it was built from). */
  const [run, setRun] = useState<{ questions: MockQuestion[]; config: InterviewConfig } | null>(null);

  const load = useCallback(async () => {
    if (!user?.email) {
      setAssigned([]);
      return;
    }
    setAssigned(await adminApi.getAssignedInterviews(user.email));
  }, [user?.email]);

  useEffect(() => {
    void load();
  }, [load]);

  const startTemplate = async (template: InterviewTemplate) => {
    const config = configFromTemplate(template);

    if (API_MODE === 'real') {
      setStartingId(template.id);
      try {
        setSession(await interviewApi.start(config));
      } catch (error) {
        toast(error instanceof ApiError ? error.message : 'Could not start the interview.', 'error');
      } finally {
        setStartingId('');
      }
      return;
    }

    // Real LLM questions when the deployment has a key; curated bank otherwise.
    setStartingId(template.id);
    try {
      const llm = await generateQuestionsFromLlm(config, {
        technology: labelOf(TECHNOLOGIES, template.technology),
        level: labelOf(EXPERIENCE_LEVELS, template.experienceLevel),
      });
      if (!llm) {
        toast('No LLM configured — using the built-in question bank.', 'info');
      }
      setRun({ questions: llm ?? generateQuestions(config), config });
    } finally {
      setStartingId('');
    }
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

  // Real backend: the live streaming interviewer screen.
  if (session) {
    return (
      <div className="page interview-setup">
        <header className="interview-setup__header">
          <div>
            <h1 className="page__title">{labelOf(TECHNOLOGIES, session.technology)} Interview</h1>
            <p className="page__subtitle">
              {labelOf(EXPERIENCE_LEVELS, session.level)} · {labelOf(DIFFICULTY_LEVELS, session.difficulty)}
            </p>
          </div>
        </header>
        <LiveInterviewScreen
          session={session}
          webcamEnabled
          micEnabled
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
          <h1 className="page__title">Start Interview</h1>
          <p className="page__subtitle">Interviews assigned to you by your interviewer.</p>
        </div>
        <span className="interview-setup__header-icon" aria-hidden="true">
          <Icon name="message-square" size={26} />
        </span>
      </header>

      {!assigned ? (
        <div className="block-state">
          <Spinner size={28} />
          <p>Loading your assigned interviews…</p>
        </div>
      ) : assigned.length === 0 ? (
        <Card>
          <div className="block-state">
            <Icon name="clock" size={34} />
            <p className="block-state__title">No interview assigned yet</p>
            <p>
              Your interviewer hasn&apos;t assigned an interview to you yet. Once they do, it will appear here
              and you can start it.
            </p>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
      ) : (
        <div className="assigned-list">
          {assigned.map((template) => {
            const config = configFromTemplate(template);
            const proctoring = [
              template.aiSettings.webcamMonitoring && 'Webcam',
              template.aiSettings.micMonitoring && 'Mic',
              template.aiSettings.tabSwitchDetection && 'Tab-switch detection',
            ].filter(Boolean) as string[];
            return (
              <Card key={template.id} className="assigned">
                <div className="assigned__main">
                  <h2 className="assigned__name">{template.name}</h2>
                  <div className="assigned__badges">
                    <Badge tone="info">{labelOf(TECHNOLOGIES, template.technology)}</Badge>
                    <Badge tone="neutral">{labelOf(EXPERIENCE_LEVELS, template.experienceLevel)}</Badge>
                    <Badge tone="warning">{labelOf(DIFFICULTY_LEVELS, template.difficulty)}</Badge>
                  </div>
                  <dl className="assigned__facts">
                    <div>
                      <dt>Duration</dt>
                      <dd>{template.durationMinutes} minutes</dd>
                    </div>
                    <div>
                      <dt>Questions</dt>
                      <dd>{config.questionCount}</dd>
                    </div>
                    <div>
                      <dt>Distribution</dt>
                      <dd>
                        {template.distribution.mcq} MCQ · {template.distribution.coding} Coding ·{' '}
                        {template.distribution.systemDesign} System Design · {template.distribution.behavioral}{' '}
                        Behavioral
                      </dd>
                    </div>
                    <div>
                      <dt>Proctoring</dt>
                      <dd>{proctoring.length > 0 ? proctoring.join(' · ') : 'Off'}</dd>
                    </div>
                  </dl>
                </div>
                <div className="assigned__action">
                  <Button
                    size="lg"
                    icon="play"
                    loading={startingId === template.id}
                    onClick={() => void startTemplate(template)}
                  >
                    Start Interview
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
