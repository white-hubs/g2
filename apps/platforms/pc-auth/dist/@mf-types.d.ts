
    export type RemoteKeys = 'REMOTE_ALIAS_IDENTIFIER/platform';
    type PackageType<T> = T extends 'REMOTE_ALIAS_IDENTIFIER/platform' ? typeof import('REMOTE_ALIAS_IDENTIFIER/platform') :any;