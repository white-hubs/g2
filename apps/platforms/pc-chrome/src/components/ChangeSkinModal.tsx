import {
  createCustomTheme,
  getTheme,
  isBuiltInTheme,
  readThemeLibrary,
  removeBuiltInThemeOverride,
  removeCustomTheme,
  saveBuiltInThemeOverride,
  saveCustomTheme,
  type UserTheme,
} from "@g2-platform/theme-contract";
import { defineComponent, reactive, ref } from "vue";

import { Button, Input, Modal } from "../pc-ui-runtime";
import { BIMOPS_ICON_SKIN, resolveStaticResourceUrl } from "../resource-api";
import { SKIN_PRESETS, type SkinPreset, applyCustomTheme, applySkinTheme } from "../skin-theme";

import "./ChangeSkinModal.css";

export type { SkinPreset };
export { SKIN_PRESETS };

type ThemeDraft = {
  id: string;
  name: string;
  mode: UserTheme["mode"];
  primary: string;
  pageBg: string;
  surfaceBg: string;
  secondarySurfaceBg: string;
  text: string;
  border: string;
  buttonText: string;
  navigationText: string;
  sideMenuBg: string;
  sideMenuText: string;
};
const COLOR_FIELDS: ReadonlyArray<{
  label: string;
  token: keyof Pick<
    ThemeDraft,
    | "primary"
    | "pageBg"
    | "surfaceBg"
    | "secondarySurfaceBg"
    | "text"
    | "border"
    | "buttonText"
    | "navigationText"
    | "sideMenuBg"
    | "sideMenuText"
  >;
}> = [
  { label: "主色", token: "primary" },
  { label: "页面背景", token: "pageBg" },
  { label: "容器背景", token: "surfaceBg" },
  { label: "副容器背景", token: "secondarySurfaceBg" },
  { label: "主文字", token: "text" },
  { label: "边框", token: "border" },
  { label: "按钮文字", token: "buttonText" },
  { label: "导航菜单文字", token: "navigationText" },
  { label: "左侧菜单背景", token: "sideMenuBg" },
  { label: "左侧菜单文字", token: "sideMenuText" },
];

function draftFromTheme(theme: UserTheme): ThemeDraft {
  return {
    id: theme.id,
    name: theme.name,
    mode: theme.mode,
    primary: theme.tokens.primary,
    pageBg: theme.tokens.pageBg,
    surfaceBg: theme.tokens.surfaceBg,
    secondarySurfaceBg: theme.tokens.secondarySurfaceBg,
    text: theme.tokens.text,
    border: theme.tokens.border,
    buttonText: theme.tokens.buttonText,
    navigationText: theme.tokens.navigationText,
    sideMenuBg: theme.tokens.sideMenuBg,
    sideMenuText: theme.tokens.sideMenuText,
  };
}

function CheckMarkIcon() {
  return (
    <svg class="pc-chrome-change-skin-check" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path
        d="M2.2 6.2 4.8 8.7 9.8 3.4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export default defineComponent({
  name: "ChangeSkinModal",
  emits: ["skinChange"],
  setup(_props, { emit }) {
    const open = ref(false);
    const activeThemeId = ref<string>(getTheme().id);
    const themes = ref<UserTheme[]>(readThemeLibrary());
    const editing = ref(false);
    const error = ref("");
    const draft = reactive<ThemeDraft>(draftFromTheme(getTheme()));
    const iconSkin = resolveStaticResourceUrl(BIMOPS_ICON_SKIN);

    function applyThemeOption(theme: UserTheme): void {
      // 未改动的内置主题走原生预设；用户编辑后的内置主题读取本地覆盖 Token。
      if (isBuiltInTheme(theme.id) && theme.createdBy === "system") {
        const skin = applySkinTheme(theme.id);
        activeThemeId.value = skin.key;
        emit("skinChange", skin.key);
        return;
      }
      applyCustomTheme(theme);
      activeThemeId.value = theme.id;
      emit("skinChange", theme.id);
    }

    function startCreate(): void {
      Object.assign(draft, draftFromTheme(getTheme()), { id: `custom-${Date.now()}`, name: "我的主题" });
      error.value = "";
      editing.value = true;
    }

    function startEdit(theme: UserTheme): void {
      Object.assign(draft, draftFromTheme(theme));
      error.value = "";
      editing.value = true;
    }

    function saveTheme(): void {
      try {
        const theme = createCustomTheme(draft.id, draft.name, draft.primary, draft.mode, {
          pageBg: draft.pageBg,
          surfaceBg: draft.surfaceBg,
          secondarySurfaceBg: draft.secondarySurfaceBg,
          text: draft.text,
          border: draft.border,
          buttonText: draft.buttonText,
          navigationText: draft.navigationText,
          sideMenuBg: draft.sideMenuBg,
          sideMenuText: draft.sideMenuText,
        });
        themes.value = isBuiltInTheme(theme.id) ? saveBuiltInThemeOverride(theme) : saveCustomTheme(theme);
        applyThemeOption(theme);
        editing.value = false;
      } catch (caught) {
        error.value = caught instanceof Error ? "主题颜色格式不正确" : "无法保存主题";
      }
    }

    function deleteTheme(theme: UserTheme): void {
      themes.value = removeCustomTheme(theme.id);
      if (activeThemeId.value === theme.id) applyThemeOption(readThemeLibrary().find((item) => item.id === "kaihe-blue")!);
    }

    function restoreBuiltInTheme(theme: UserTheme): void {
      themes.value = removeBuiltInThemeOverride(theme.id);
      const restored = themes.value.find((item) => item.id === theme.id)!;
      if (activeThemeId.value === theme.id) applyThemeOption(restored);
    }

    return () => (
      <div class="pc-chrome-change-skin">
        <button
          type="button"
          class="pc-chrome-change-skin-trigger tw:g2-focus-ring tw:transition-opacity tw:duration-200 tw:hover:opacity-90"
          data-testid="change-skin"
          aria-label="换肤"
          onClick={() => {
            open.value = true;
          }}
        >
          <img class="pc-chrome-change-skin-trigger__icon" src={iconSkin} alt="" />
        </button>
        <Modal
          open={open.value}
          onUpdate:open={(value: boolean) => {
            open.value = value;
          }}
          title="主题设置"
          width={680}
          footer={null}
          centered
          destroyOnClose
          class="pc-chrome-change-skin-modal"
        >
          <div class="pc-chrome-theme-console">
            <div class="pc-chrome-theme-console__heading">
              <span>主题</span>
              <Button size="small" type="primary" onClick={startCreate}>
                新建主题
              </Button>
            </div>
            <div class="pc-chrome-theme-console__list" role="listbox" aria-label="主题列表">
              {themes.value.map((theme) => {
                const builtIn = isBuiltInTheme(theme.id);
                const active = activeThemeId.value === theme.id;
                return (
                  <div class={["pc-chrome-theme-console__item", { active }]} key={theme.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      class="pc-chrome-theme-console__apply"
                      onClick={() => applyThemeOption(theme)}
                    >
                      <i style={{ background: theme.tokens.primary }}></i>
                      <span>{theme.name}</span>
                      {active ? <CheckMarkIcon /> : null}
                    </button>
                    {builtIn ? <small class="pc-chrome-theme-console__built-in">默认主题</small> : null}
                    <>
                      <Button size="small" type="link" onClick={() => startEdit(theme)}>
                        编辑
                      </Button>
                      {builtIn && theme.createdBy !== "system" ? (
                        <Button size="small" type="link" onClick={() => restoreBuiltInTheme(theme)}>
                          恢复默认
                        </Button>
                      ) : null}
                    </>
                    {!builtIn ? (
                      <>
                        <Button danger size="small" type="link" onClick={() => deleteTheme(theme)}>
                          删除
                        </Button>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          {editing.value ? (
            <div class="pc-chrome-theme-editor">
              <label>
                名称
                <Input
                  value={draft.name}
                  onUpdate:value={(value: string) => {
                    draft.name = value;
                  }}
                />
              </label>
              {COLOR_FIELDS.map((field) => (
                <label key={field.token}>
                  {field.label}
                  <input
                    type="color"
                    value={draft[field.token]}
                    onInput={(event: Event) => {
                      draft[field.token] = (event.target as HTMLInputElement).value;
                    }}
                  />
                  <code>{draft[field.token]}</code>
                </label>
              ))}
              {error.value ? <p class="pc-chrome-theme-editor__error">{error.value}</p> : null}
              <div class="pc-chrome-theme-editor__actions">
                <Button
                  onClick={() => {
                    editing.value = false;
                  }}
                >
                  取消
                </Button>
                <Button type="primary" onClick={saveTheme}>
                  保存并应用
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    );
  },
});
