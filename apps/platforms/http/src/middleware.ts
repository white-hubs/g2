export type NextFn = (request: Request) => Promise<Response>;
export type Middleware = (request: Request, next: NextFn) => Promise<Response>;

export function composeMiddleware(middlewares: Middleware[], finalHandler: NextFn): NextFn {
  return middlewares.reduceRight<NextFn>((next, middleware) => (request) => middleware(request, next), finalHandler);
}
