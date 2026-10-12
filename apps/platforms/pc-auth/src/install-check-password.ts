export interface PasswordState {
  passwordExpired: boolean;
  passwordForced: boolean;
  dismissedThisSession?: boolean;
}

export function shouldShowPasswordExpiredModal(state: PasswordState, currentPath: string): boolean {
  if (currentPath !== "/index") {
    return false;
  }
  if (!state.passwordExpired) {
    return false;
  }
  if (state.passwordForced) {
    return true;
  }
  return !state.dismissedThisSession;
}
