interface CurrentUserStorage {
  id?: string | number;
  userId?: string | number;
  name?: string;
  username?: string;
}

function readCurrentUser(): CurrentUserStorage | null {
  try {
    const raw = sessionStorage.getItem("GH-UserInfo");
    if (!raw) return null;
    return JSON.parse(raw) as CurrentUserStorage;
  } catch {
    return null;
  }
}

export function readCurrentUserId(): string | undefined {
  const user = readCurrentUser();
  const id = user?.id ?? user?.userId;
  return id == null ? undefined : String(id);
}

export function readCurrentUserDisplayName(): string {
  const user = readCurrentUser();
  const name = user?.name?.trim() || user?.username?.trim();
  return name ? `${name}（当前用户）` : "当前用户";
}
