
    export type RemoteKeys = 'mfe_results/ResultPage';
    type PackageType<T> = T extends 'mfe_results/ResultPage' ? typeof import('mfe_results/ResultPage') :any;