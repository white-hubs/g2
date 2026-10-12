/**
 * qiankun 在 LOADING_SOURCE_CODE 时会同步查找 `container`；
 * 必须先把壳层挂到 DOM（含 `#workbench-container` / `#appContainer`），再 register/start。
 */
export async function runQiankunAfterShellMount(
  mountShell: () => void | Promise<void>,
  startQiankun: () => void | Promise<void>,
): Promise<void> {
  await mountShell();
  await startQiankun();
}
