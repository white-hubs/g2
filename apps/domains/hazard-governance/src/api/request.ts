/**
 * Domain requests already use the authenticated composition clients. Keeping this
 * boundary makes that contract explicit without retaining the legacy compat API.
 */
export function useAuthRequest<T>(request: () => Promise<T>): Promise<T> {
  return request();
}
