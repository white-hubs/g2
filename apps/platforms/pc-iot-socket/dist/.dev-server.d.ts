
    export type RemoteKeys = 'REMOTE_ALIAS_IDENTIFIER/index' | 'REMOTE_ALIAS_IDENTIFIER/platform';
    type PackageType<T> = T extends 'REMOTE_ALIAS_IDENTIFIER/platform' ? typeof import('REMOTE_ALIAS_IDENTIFIER/platform') :T extends 'REMOTE_ALIAS_IDENTIFIER/index' ? typeof import('REMOTE_ALIAS_IDENTIFIER/index') :any;