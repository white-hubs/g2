
    export type RemoteKeys = 'REMOTE_ALIAS_IDENTIFIER/domain';
    type PackageType<T> = T extends 'REMOTE_ALIAS_IDENTIFIER/domain' ? typeof import('REMOTE_ALIAS_IDENTIFIER/domain') :any;