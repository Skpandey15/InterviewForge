import { INTERVIEW_BASE_URL, authStore } from '@aip/shared';

export interface TurnEvents {
  onToken: (text: string) => void;
  onControl: (control: { action: string; sessionId: string }) => void;
  onError: (message: string) => void;
}

/**
 * Streams one interviewer turn over SSE. Uses fetch + ReadableStream rather
 * than EventSource so the JWT can ride in the Authorization header.
 */
export async function streamTurn(
  sessionId: string,
  body: { kind: 'start' | 'answer'; text: string },
  events: TurnEvents,
): Promise<void> {
  const token = authStore.getSession()?.token;
  let response: Response;
  try {
    response = await fetch(`${INTERVIEW_BASE_URL}/api/v1/interviews/${sessionId}/turns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    events.onError('Connection to the interviewer failed. Is the backend running?');
    return;
  }

  if (!response.ok || !response.body) {
    events.onError(`The interviewer rejected the request (${response.status}).`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (frame: string) => {
    let event = 'message';
    let data = '';
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return;
    try {
      const payload = JSON.parse(data);
      if (event === 'token') events.onToken(payload.text ?? '');
      else if (event === 'control') events.onControl(payload);
      else if (event === 'error') events.onError(payload.message ?? 'Interviewer error.');
    } catch {
      /* ignore malformed frame */
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separator = buffer.indexOf('\n\n');
    while (separator !== -1) {
      dispatch(buffer.slice(0, separator));
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) dispatch(buffer);
}
