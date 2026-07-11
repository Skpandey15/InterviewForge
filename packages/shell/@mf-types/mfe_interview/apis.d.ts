
    export type RemoteKeys = 'mfe_interview/InterviewSetupPage';
    type PackageType<T> = T extends 'mfe_interview/InterviewSetupPage' ? typeof import('mfe_interview/InterviewSetupPage') :any;