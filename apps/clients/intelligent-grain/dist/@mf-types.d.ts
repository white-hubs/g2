
    export type RemoteKeys = 'REMOTE_ALIAS_IDENTIFIER/client';
    type PackageType<T> = T extends 'REMOTE_ALIAS_IDENTIFIER/client' ? typeof import('REMOTE_ALIAS_IDENTIFIER/client') :any;