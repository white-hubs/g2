import { describe, expect, test } from "bun:test";

import { type Middleware, composeMiddleware } from "./middleware";

describe("composeMiddleware", () => {
  test("按声明顺序洋葱式包裹，前置逻辑先进后出", () => {
    const trace: string[] = [];
    const mw1: Middleware = async (req, next) => {
      trace.push("mw1:before");
      const res = await next(req);
      trace.push("mw1:after");
      return res;
    };
    const mw2: Middleware = async (req, next) => {
      trace.push("mw2:before");
      const res = await next(req);
      trace.push("mw2:after");
      return res;
    };
    const finalHandler = async (_req: Request) => {
      trace.push("handler");
      return new Response("ok");
    };
    const composed = composeMiddleware([mw1, mw2], finalHandler);
    return composed(new Request("http://x")).then(() => {
      expect(trace).toEqual(["mw1:before", "mw2:before", "handler", "mw2:after", "mw1:after"]);
    });
  });

  test("空中间件列表直接调用 finalHandler", async () => {
    const composed = composeMiddleware([], async () => new Response("direct"));
    const res = await composed(new Request("http://x"));
    expect(await res.text()).toBe("direct");
  });
});
