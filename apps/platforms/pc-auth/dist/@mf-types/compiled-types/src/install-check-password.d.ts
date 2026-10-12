export interface PasswordState {
    passwordExpired: boolean;
    passwordForced: boolean;
    dismissedThisSession?: boolean;
}
export declare function shouldShowPasswordExpiredModal(state: PasswordState, currentPath: string): boolean;
//# sourceMappingURL=install-check-password.d.ts.map