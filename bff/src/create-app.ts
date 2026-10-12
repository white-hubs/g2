import { Application, ConfigModule, type ApplicationOptions } from "@dangao/bun-server";

import { AppModule } from "./app.module";
import { loadAppConfig } from "./config/app.config";

export type CreateBffAppOptions = ApplicationOptions & {
  /** Override config before ConfigModule.forRoot (tests). */
  configOverrides?: Partial<ReturnType<typeof loadAppConfig>>;
};

/**
 * 构造并 listen 的 BFF 应用（供 main / 集成测复用）。
 */
export async function createBffApp(options: CreateBffAppOptions = {}): Promise<Application> {
  const { configOverrides, ...appOptions } = options;
  const config = { ...loadAppConfig(), ...configOverrides };

  ConfigModule.forRoot({
    defaultConfig: {
      app: {
        name: "@g2-server/bff",
        ...config,
      },
    },
  });

  const app = new Application({
    port: appOptions.port ?? config.port,
    hostname: appOptions.hostname ?? config.hostname ?? "0.0.0.0",
    enableSignalHandlers: appOptions.enableSignalHandlers ?? true,
    ...appOptions,
  });

  app.registerModule(AppModule);
  await app.listen();
  return app;
}
