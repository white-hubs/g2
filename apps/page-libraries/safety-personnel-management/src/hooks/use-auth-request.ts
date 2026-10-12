/** Authentication is supplied by the installed g2 client for every request. */
export async function useAuthRequest<T>(request: () => Promise<T>): Promise<T> {
  return request();
}
