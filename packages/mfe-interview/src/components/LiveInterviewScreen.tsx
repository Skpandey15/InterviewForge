import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Icon, toast, type InterviewSessionData } from '@aip/shared';
import { streamTurn } from '../lib/turnStream';

interface ChatMessage {
  id: number;
  role: 'ai' | 'user';
  text: string;
}

export interface LiveInterviewScreenProps {
  session: InterviewSessionData;
  webcamEnabled: boolean;
  micEnabled: boolean;
  onComplete: () => void;
  onAbort: () => void;
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * The AI Interview Screen: streaming chat with the AI interviewer, webcam
 * self-view, elapsed timer and tab-switch proctoring. SSE tokens arrive via
 * interview-platform (Java owns the workflow — ARCHITECTURE.md P1/§5).
 */
export function LiveInterviewScreen({ session, webcamEnabled, micEnabled, onComplete, onAbort }: LiveInterviewScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [finished, setFinished] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [cameraState, setCameraState] = useState<'off' | 'on' | 'blocked'>(webcamEnabled ? 'off' : 'blocked');

  const nextId = useRef(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const appendMessage = useCallback((role: ChatMessage['role'], text = ''): number => {
    const id = nextId.current++;
    setMessages((prev) => [...prev, { id, role, text }]);
    return id;
  }, []);

  const appendToMessage = useCallback((id: number, text: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)));
  }, []);

  const runTurn = useCallback(
    async (body: { kind: 'start' | 'answer'; text: string }) => {
      setStreaming(true);
      const aiMessageId = appendMessage('ai');
      await streamTurn(session.id, body, {
        onToken: (text) => appendToMessage(aiMessageId, text),
        onControl: (control) => {
          if (control.action === 'next') {
            setQuestionNumber((n) => Math.min(n + 1, session.questions.length));
          }
          if (control.action === 'complete') {
            setFinished(true);
            window.setTimeout(onComplete, 2200);
          }
        },
        onError: (message) => {
          appendToMessage(aiMessageId, `⚠ ${message}`);
          toast(message, 'error');
        },
      });
      setStreaming(false);
    },
    [appendMessage, appendToMessage, onComplete, session.id, session.questions.length],
  );

  /* Kick off the interview exactly once. */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runTurn({ kind: 'start', text: '' });
  }, [runTurn]);

  /* Webcam self-view. Denied/unavailable degrades to a placeholder. */
  useEffect(() => {
    if (!webcamEnabled) return;
    let stream: MediaStream | undefined;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((media) => {
        stream = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          setCameraState('on');
        }
      })
      .catch(() => setCameraState('blocked'));
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [webcamEnabled]);

  /* Elapsed timer. */
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  /* Proctoring: tab-switch detection (the admin-builder setting, made real). */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setTabSwitches((n) => n + 1);
        toast('Tab switch detected — this is recorded during interviews.', 'error');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* Keep the transcript pinned to the latest message. */
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendAnswer = () => {
    const text = draft.trim();
    if (!text || streaming || finished) return;
    appendMessage('user', text);
    setDraft('');
    void runTurn({ kind: 'answer', text });
  };

  return (
    <div className="live">
      <div className="live__chat card">
        <div className="live__transcript" ref={transcriptRef} aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`live__bubble live__bubble--${message.role}`}>
              {message.role === 'ai' && (
                <span className="live__avatar" aria-hidden="true">
                  <Icon name="message-square" size={14} />
                </span>
              )}
              <p>{message.text || '…'}</p>
            </div>
          ))}
          {streaming && <p className="live__typing">AI interviewer is typing…</p>}
        </div>
        <div className="live__composer">
          <textarea
            className="field__input live__input"
            rows={3}
            placeholder={finished ? 'Interview finished — preparing your results…' : 'Type your answer… (Ctrl+Enter to send)'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendAnswer();
            }}
            disabled={streaming || finished}
          />
          <Button icon="play" onClick={sendAnswer} disabled={streaming || finished || !draft.trim()}>
            Send
          </Button>
        </div>
      </div>

      <aside className="live__side">
        <div className="card live__camera">
          <video ref={videoRef} autoPlay muted playsInline className={cameraState === 'on' ? '' : 'live__video--hidden'} />
          {cameraState !== 'on' && (
            <div className="live__camera-placeholder">
              <Icon name="video" size={26} />
              <span>{webcamEnabled ? 'Camera unavailable' : 'Camera disabled'}</span>
            </div>
          )}
          <div className="live__camera-status">
            <Badge tone={cameraState === 'on' ? 'success' : 'neutral'}>
              {cameraState === 'on' ? 'Camera on' : 'No camera'}
            </Badge>
            <Badge tone={micEnabled ? 'success' : 'neutral'}>{micEnabled ? 'Mic on' : 'Mic off'}</Badge>
          </div>
        </div>

        <div className="card live__panel">
          <div className="live__stat">
            <span>Question</span>
            <strong>
              {Math.min(questionNumber, session.questions.length)} / {session.questions.length}
            </strong>
          </div>
          <div className="live__stat">
            <span>Elapsed</span>
            <strong>{formatClock(elapsed)}</strong>
          </div>
          <div className="live__stat">
            <span>Tab switches</span>
            <strong className={tabSwitches > 0 ? 'live__stat--warn' : ''}>{tabSwitches}</strong>
          </div>
          <div className="live__stat">
            <span>Questions</span>
            <Badge tone={session.questionSource.startsWith('ai-gateway') ? 'success' : 'warning'}>
              {session.questionSource.startsWith('ai-gateway') ? 'AI-grounded' : 'Curated bank'}
            </Badge>
          </div>
          <Button variant="danger" block disabled={streaming || finished} onClick={onAbort}>
            End Interview
          </Button>
        </div>
      </aside>
    </div>
  );
}
