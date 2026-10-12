/** Authentication is supplied by the installed g2 HTTP platform for each request. */
export const useAuthRequest = <T>(request: () => Promise<T>): Promise<T> => request();
