
    export type RemoteKeys = 'mfe_auth/LoginPage' | 'mfe_auth/RegisterPage';
    type PackageType<T> = T extends 'mfe_auth/RegisterPage' ? typeof import('mfe_auth/RegisterPage') :T extends 'mfe_auth/LoginPage' ? typeof import('mfe_auth/LoginPage') :any;