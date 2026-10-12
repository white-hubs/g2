import { describe, expect, test } from "bun:test";

import { calcCertValidityFromIssueDate, isCertDateOrderInvalid } from "./cert-date";
import { resolveInitialReviewStatus, syncReviewStatusOnNeedReviewChange } from "./cert-review";
import { getExpireDisplay } from "./cert-status";
import { mapOrgTree, mapPersonCard } from "./mappers";
import { resolvePageNumberWhenCurrentEmpty } from "./pagination";

describe("legacy safety personnel business rules", () => {
  test("person identity uses personnel id, not account id, and retains all category labels", () => {
    expect(mapPersonCard({ id: "person-1", userId: "account-2", userName: "测试人员", typeCodes: ["SAFETY", "SPECIAL"] })).toMatchObject({
      personId: "person-1",
      name: "测试人员",
      personTypes: ["安全管理人员", "特种作业人员"],
    });
  });
  test("review state preserves overdue edits and resets when review is disabled", () => {
    expect(resolveInitialReviewStatus(true)).toBe("待复审");
    expect(resolveInitialReviewStatus(false)).toBe("无需复审");
    expect(syncReviewStatusOnNeedReviewChange(true, "复审逾期")).toBe("复审逾期");
    expect(syncReviewStatusOnNeedReviewChange(false, "已复审")).toBe("无需复审");
  });
  test("certificate validity uses an inclusive end date and validates date order", () => {
    expect(calcCertValidityFromIssueDate("2026-09-21", 1, "YEAR")).toEqual({ validStart: "2026-09-21", validEnd: "2027-09-20" });
    expect(calcCertValidityFromIssueDate("2026-09-21", 6, "MONTH").validEnd).toBe("2027-03-20");
    expect(isCertDateOrderInvalid("2026-09-21", "2026-09-20", "2027-09-20")).toBe(true);
  });
  test("expiry boundary and last-page removal match the legacy behavior", () => {
    expect(getExpireDisplay(-1, 30)).toBe("expired");
    expect(getExpireDisplay(30, 30)).toBe("expiring");
    expect(getExpireDisplay(31, 30)).toBe("normal");
    expect(resolvePageNumberWhenCurrentEmpty(3, 0, 20, 10)).toBe(2);
  });
  test("organization mapper retains members and hierarchy", () => {
    const tree = mapOrgTree([
      { id: "root", name: "安全部", members: [{ userId: "u1", userName: "成员" }], children: [{ id: "child", name: "班组" }] },
    ]);
    expect(tree[0]?.members[0]?.userId).toBe("u1");
    expect(tree[0]?.children[0]?.name).toBe("班组");
  });
});
