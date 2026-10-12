import { CalendarOutlined } from "@ant-design/icons-vue";
import dayjs from "dayjs";
import { defineComponent, onBeforeUnmount, onMounted, shallowRef } from "vue";

import { Avatar } from "@/pc-ui-runtime";
import { resolveStaticResourceUrl } from "@/utils/resource";

import "./user-welcome.less";

interface CachedUser {
  name?: string;
  username?: string;
  nickName?: string;
  realName?: string;
  lastLoginTime?: string | number;
  fileVO?: {
    path?: string;
  };
}

/** 与壳层 legacy-qiankun-auth 派发事件同名；工作台只消费，不反向依赖 shell 包。 */
const LEGACY_USER_INFO_UPDATED_EVENT = "g2:legacy-user-info-updated";

const formatLastLoginTime = (value?: string | number): string => {
  if (value === undefined || value === null || value === "") return "暂无记录";
  const numericValue = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(numericValue) ? dayjs(numericValue < 100000000000 ? numericValue * 1000 : numericValue) : dayjs(value);
  return date.isValid() ? date.format("YYYY-MM-DD HH:mm:ss") : "暂无记录";
};

function firstNonEmptyString(...candidates: unknown[]): string {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function readGhUserInfo(): CachedUser {
  try {
    return JSON.parse(sessionStorage.getItem("GH-UserInfo") ?? "{}") as CachedUser;
  } catch {
    return {};
  }
}

/** 对齐壳层顶栏：优先资料 name，其次 JWT name / user_name。 */
function displayNameFromAccessTokenInSession(): string {
  try {
    const raw = sessionStorage.getItem("GH-Token");
    if (!raw) {
      return "";
    }
    const accessToken = (JSON.parse(raw) as { access_token?: unknown }).access_token;
    if (typeof accessToken !== "string" || !accessToken) {
      return "";
    }
    const payloadPart = accessToken.split(".")[1] ?? "";
    if (!payloadPart) {
      return "";
    }
    const padded = payloadPart + "=".repeat((4 - (payloadPart.length % 4)) % 4);
    const binary = atob(padded.replace(/-/gu, "+").replace(/_/gu, "/"));
    const bytes = Uint8Array.from(binary, (ch) => ch.codePointAt(0) ?? 0);
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    return firstNonEmptyString(payload.name, payload.user_name, payload.sub);
  } catch {
    return "";
  }
}

function resolveWelcomeUser(): { displayName: string; avatarText: string; avatarSrc?: string; lastLoginTime?: string | number } {
  const cached = readGhUserInfo();
  const displayName =
    firstNonEmptyString(cached.name, cached.nickName, cached.realName, cached.username) || displayNameFromAccessTokenInSession() || "用户";
  return {
    displayName,
    avatarText: displayName.trim().charAt(0) || "用",
    avatarSrc: cached.fileVO?.path ? resolveStaticResourceUrl(cached.fileVO.path) : undefined,
    lastLoginTime: cached.lastLoginTime,
  };
}

export default defineComponent({
  name: "UserWelcome",
  setup() {
    const welcome = shallowRef(resolveWelcomeUser());

    const refresh = (): void => {
      welcome.value = resolveWelcomeUser();
    };

    let retryTimer = 0;
    onMounted(() => {
      refresh();
      // 资料接口晚于工作台首屏时，短延迟再读一次并监听壳层写入事件。
      retryTimer = window.setTimeout(refresh, 400);
      window.addEventListener(LEGACY_USER_INFO_UPDATED_EVENT, refresh);
    });
    onBeforeUnmount(() => {
      window.clearTimeout(retryTimer);
      window.removeEventListener(LEGACY_USER_INFO_UPDATED_EVENT, refresh);
    });

    return () => (
      <section class="user-welcome">
        <div class="user-welcome__identity">
          <Avatar class="user-welcome__avatar" size={48} src={welcome.value.avatarSrc}>
            {welcome.value.avatarText}
          </Avatar>
          <div>
            <div>
              <strong>{welcome.value.displayName}</strong>，您好！祝你开心每一天
            </div>
            <small>上次登录时间：{formatLastLoginTime(welcome.value.lastLoginTime)}</small>
          </div>
        </div>
        <div class="user-welcome__date">
          <CalendarOutlined /> {dayjs().format("YYYY-MM-DD dddd")}
        </div>
      </section>
    );
  },
});
