export type NextFn = (request: Request) => Promise<Response>;
export type Middleware = (request: Request, next: NextFn) => Promise<Response>;
export declare function composeMiddleware(middlewares: Middleware[], finalHandler: NextFn): NextFn;
//# sourceMappingURL=middleware.d.ts.map