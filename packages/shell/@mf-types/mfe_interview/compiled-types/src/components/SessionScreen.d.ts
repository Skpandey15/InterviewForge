import { type InterviewSessionData } from '@aip/shared';
export interface SessionScreenProps {
    session: InterviewSessionData;
    submitting: boolean;
    onSubmit: (answers: Array<{
        index: number;
        text: string;
    }>) => void;
    onAbort: () => void;
}
/**
 * Real-backend answer screen: one question at a time, free-text answers,
 * submit-all at the end. (The full AI Interview Screen — camera, chat,
 * coding editor — layers on top of this flow later.)
 */
export declare function SessionScreen({ session, submitting, onSubmit, onAbort }: SessionScreenProps): import("react").JSX.Element;
