
    export type RemoteKeys = 'mfe_admin/AdminApp';
    type PackageType<T> = T extends 'mfe_admin/AdminApp' ? typeof import('mfe_admin/AdminApp') :any;