import { spawn } from "bun";

const DEFAULT_SERVICE_URLS = {
  videoMonitorUrl: "http://192.168.4.119:10208",
  metadataUrl: "http://192.168.0.243:3200/mdata",
  deviceCenterUrl: "http://192.168.0.243:3200/device-center",
  ouaaUrl: "http://192.168.0.243:3200/ouaa",
  dictionaryUrl: "http://192.168.0.243:3200/dictionary",
  safetyPersonnelUrl: "https://cube.guhecloud.com:3000/",
  securityManagementUrl: "http://192.168.4.246:10245",
  accessControlUrl: "http://192.168.0.243:3200",
};

const { env } = Bun;

function arg(name: string, value: string | undefined): string[] {
  return value && value !== "" ? [`--${name}=${value}`] : [];
}

function envOrDefault(name: string, defaultValue: string): string {
  return env[name] ?? defaultValue;
}

/**
 * Debug 启动脚本，可以直接通过 vscode 调试快捷键快速调试（需要提前安装 bun vscode 插件）
 * OAuth client secret 等敏感配置从 ignored app.json 或环境变量读取，不写入本文件。
 */
async function main() {
  const args = [
    "src/main.ts",
    `--config=${env.APP_CONFIG_PATH ?? "app.json"}`,
    ...arg("port", env.PORT),
    ...arg("hostname", env.HOSTNAME),
    ...arg("log-level", env.LOG_LEVEL),
    `--video-monitor-url=${envOrDefault("VIDEO_MONITOR_URL", DEFAULT_SERVICE_URLS.videoMonitorUrl)}`,
    `--metadata-url=${envOrDefault("METADATA_URL", DEFAULT_SERVICE_URLS.metadataUrl)}`,
    `--device-center-url=${envOrDefault("DEVICE_CENTER_URL", DEFAULT_SERVICE_URLS.deviceCenterUrl)}`,
    `--ouaa-url=${envOrDefault("OUAA_URL", DEFAULT_SERVICE_URLS.ouaaUrl)}`,
    `--dictionary-url=${envOrDefault("DICTIONARY_URL", DEFAULT_SERVICE_URLS.dictionaryUrl)}`,
    `--safety-personnel-url=${envOrDefault("SAFETY_PERSONNEL_URL", DEFAULT_SERVICE_URLS.safetyPersonnelUrl)}`,
    `--security-management-url=${envOrDefault("SECURITY_MANAGEMENT_URL", DEFAULT_SERVICE_URLS.securityManagementUrl)}`,
    "--emergency-url=http://192.168.0.243:3200/emergency",
    "--flow-url=http://192.168.0.243:3200/ai-center",
    `--file-service-url=${envOrDefault("FILE_SERVICE_URL", "http://192.168.0.243:3200/file")}`,
    `--daily-inspection-url=${envOrDefault("DAILY_INSPECTION_URL", "http://192.168.0.243:3200/maintain")}`,
    `--daily-task-url=${envOrDefault("DAILY_TASK_URL", "http://192.168.0.243:3200")}`,
    `--security-monitor-url=${envOrDefault("SECURITY_MONITOR_URL", "http://192.168.0.243:3200")}`,
    `--ai-application-url=${envOrDefault("AI_APPLICATION_URL", "http://192.168.0.243:3200//ai-center")}`,
  ];

  const proc = spawn({
    cmd: ["bun", ...args],
    cwd: import.meta.dir,
    stdio: ["inherit", "inherit", "inherit"],
  });

  // 等待进程退出
  await proc.exited;
}

main().catch((_error) => {
  process.exit(1);
});
