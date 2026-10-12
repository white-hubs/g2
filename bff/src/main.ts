import { createBffApp } from "./create-app";

async function bootstrap(): Promise<void> {
  await createBffApp();
}

bootstrap().catch((error: unknown) => {
  console.error("[g2-bff] startup failed", error);
  process.exit(1);
});
