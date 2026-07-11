import { type InterviewSessionData } from '@aip/shared';
export interface LiveInterviewScreenProps {
    session: InterviewSessionData;
    webcamEnabled: boolean;
    micEnabled: boolean;
    onComplete: () => void;
    onAbort: () => void;
}
/**
 * The AI Interview Screen: streaming chat with the AI interviewer, webcam
 * self-view, elapsed timer and tab-switch proctoring. SSE tokens arrive via
 * interview-platform (Java owns the workflow — ARCHITECTURE.md P1/§5).
 */
export declare function LiveInterviewScreen({ session, webcamEnabled, micEnabled, onComplete, onAbort }: LiveInterviewScreenProps): import("react").JSX.Element;
