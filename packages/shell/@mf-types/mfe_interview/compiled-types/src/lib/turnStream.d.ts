export interface TurnEvents {
    onToken: (text: string) => void;
    onControl: (control: {
        action: string;
        sessionId: string;
    }) => void;
    onError: (message: string) => void;
}
/**
 * Streams one interviewer turn over SSE. Uses fetch + ReadableStream rather
 * than EventSource so the JWT can ride in the Authorization header.
 */
export declare function streamTurn(sessionId: string, body: {
    kind: 'start' | 'answer';
    text: string;
}, events: TurnEvents): Promise<void>;
