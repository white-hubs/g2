import type { OrgNodeMemberVO } from "@g2-contract/safety-personnel";

import { getCubeFileService } from "../api/file-service";
import type { OrgMemberUI, OrgNodeUI } from "../types/ui";
import { toImageSrc } from "./file-url";

/** 解析组织成员头像展示地址（后端 avatar: FileVO，优先相对 path 如 /minio/...） */
export function resolveMemberAvatarUrl(member: Pick<OrgNodeMemberVO, "avatar">): string {
  if (!member.avatar) {
    return "";
  }
  return toImageSrc(member.avatar);
}

/** 从 UI 成员对象解析头像地址 */
export function resolveOrgMemberAvatarUrl(member: OrgMemberUI): string {
  return member.avatarUrl?.trim() || resolveMemberAvatarUrl(member);
}

/** 接口已带 path 时无需再查 file-service */
export async function enrichOrgTreeAvatars(nodes: OrgNodeUI[]): Promise<void> {
  const fileService = getCubeFileService();

  const visit = async (node: OrgNodeUI): Promise<void> => {
    await Promise.all(
      node.members.map(async (member) => {
        const existing = resolveOrgMemberAvatarUrl(member);
        if (existing) {
          member.avatarUrl = existing;
          return;
        }
        const fileId = member.avatar?.id;
        if (!fileId) {
          return;
        }
        try {
          const info = await fileService.getFileInfo(String(fileId));
          const path = toImageSrc({ path: info.path ?? undefined });
          if (path) {
            member.avatarUrl = path;
            member.avatar = {
              ...member.avatar!,
              path: info.path || member.avatar?.path,
            };
          }
        } catch {
          // 保留组织架构接口返回的 avatar
        }
      }),
    );
    await Promise.all(node.children.map(visit));
  };

  await Promise.all(nodes.map(visit));
}
