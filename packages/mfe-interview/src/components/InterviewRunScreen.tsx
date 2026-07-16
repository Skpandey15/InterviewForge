import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Icon, ProgressBar, type InterviewConfig } from '@aip/shared';
import { scoreAnswers, type MockQuestion } from '../lib/mockQuestions';

interface InterviewRunScreenProps {
  questions: MockQuestion[];
  config: InterviewConfig;
  labels: { technology: string; level: string; difficulty: string; questionType: string };
  onComplete: (scorePercent: number) => void;
  onAbort: () => void;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function InterviewRunScreen({ questions, config, labels, onComplete, onAbort }: InterviewRunScreenProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeLeft, setTimeLeft] = useState(Math.max(1, Number(config.durationMinutes) || 30) * 60);
  const submittedRef = useRef(false);

  const current = questions[index];
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length;

  const submit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onComplete(scoreAnswers(questions, answers));
  }, [answers, questions, onComplete]);

  // Countdown timer — auto-submits when it reaches zero.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          submit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [submit]);

  const setAnswer = (questionId: string, value: string | number) =>
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

  const isLast = index === questions.length - 1;
  const low = timeLeft <= 60;

  return (
    <div className="irun">
      <div className="irun__bar">
        <div className="irun__meta">
          <span className="irun__chip">{labels.technology}</span>
          <span className="irun__chip">{labels.level}</span>
          <span className="irun__chip">{labels.difficulty}</span>
          <span className="irun__chip">{labels.questionType}</span>
          {config.webcamEnabled && (
            <span className="irun__chip irun__chip--on">
              <Icon name="video" size={13} /> Webcam
            </span>
          )}
          {config.micEnabled && (
            <span className="irun__chip irun__chip--on">
              <Icon name="mic" size={13} /> Mic
            </span>
          )}
        </div>
        <div className={`irun__timer ${low ? 'irun__timer--low' : ''}`} aria-live="polite">
          <Icon name="clock" size={16} />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="irun__progress">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span className="irun__muted">{answeredCount} answered</span>
      </div>
      <ProgressBar value={Math.round(((index + 1) / questions.length) * 100)} />

      <Card className="irun__card">
        <div className="irun__qtype">
          <Icon name={current.type === 'MCQ' ? 'list' : 'code'} size={14} /> {current.type === 'MCQ' ? 'Multiple choice' : 'Coding / written'}
        </div>
        <h2 className="irun__question">{current.text}</h2>

        {current.type === 'MCQ' && current.options ? (
          <div className="irun__options">
            {current.options.map((option, i) => (
              <button
                key={i}
                type="button"
                className={`irun-option ${answers[current.id] === i ? 'irun-option--active' : ''}`}
                onClick={() => setAnswer(current.id, i)}
              >
                <span className="irun-option__marker">{String.fromCharCode(65 + i)}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>
        ) : (
          <textarea
            className="irun__answer"
            rows={8}
            placeholder="Write your answer or code here…"
            value={typeof answers[current.id] === 'string' ? (answers[current.id] as string) : ''}
            onChange={(e) => setAnswer(current.id, e.target.value)}
          />
        )}
      </Card>

      <div className="irun__footer">
        <Button variant="ghost" icon="x" onClick={onAbort}>
          Abandon
        </Button>
        <div className="irun__nav">
          <Button
            variant="outline"
            icon="arrow-left"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </Button>
          {isLast ? (
            <Button icon="check-circle" onClick={submit}>
              Submit Interview
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
