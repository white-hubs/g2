import type { EmployeeCertVO, PersonProfileVO } from "@g2-contract/safety-personnel";
import { Drawer, Empty, TabPane, Tabs } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent, ref } from "vue";

import { getPersonCertificates, getPersonProfile } from "../../../../api/safety-personnel";
import { RESUME_TABS } from "../../../../constants";
import { PERSON_TYPE_CODE_LABEL } from "../../../../constants";
import { useAuthRequest } from "../../../../hooks/use-auth-request";
import type { PersonnelCardUI } from "../../../../types/ui";
import { showApiError } from "../../../../utils/api-error";
import { maskPhone } from "../../../../utils/mask-phone";
import { TaskTableTab } from "./task-table-tab";
import { TimelineTab } from "./timeline-tab";

import styles from "./drawer.module.css";

export const SafetyResumeDrawer = defineComponent({
  setup(_, { expose }) {
    const open = ref(false);
    const personId = ref<string | null>(null);
    const personName = ref("");
    const activeTab = ref("timeline");
    const profile = ref<PersonProfileVO | null>(null);
    const certs = ref<EmployeeCertVO[]>([]);

    const loadProfile = async (id: string): Promise<void> => {
      try {
        profile.value = await useAuthRequest(() => getPersonProfile(id));
        certs.value = await useAuthRequest(() => getPersonCertificates(id));
      } catch (e) {
        showApiError(e);
        profile.value = null;
        certs.value = [];
      }
    };

    const openDrawer = (person: PersonnelCardUI): void => {
      personId.value = person.personId;
      personName.value = person.name;
      activeTab.value = "timeline";
      open.value = true;
      void loadProfile(person.personId);
    };

    expose({ open: openDrawer });

    const typeLabels = (): string => {
      const codes = profile.value?.typeCodes ?? [];
      return codes.map((c) => PERSON_TYPE_CODE_LABEL[c] ?? c).join("、") || "--";
    };

    return () => (
      <Drawer
        open={open.value}
        title={`安全履历 · ${personName.value}`}
        width="min(960px, 92vw)"
        rootClassName="safety-resume-drawer"
        destroyOnClose
        bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClose={() => {
          open.value = false;
        }}
      >
        <div class={styles.drawerBody}>
          <div class={styles.left}>
            <div class={styles.infoCard}>
              <h4>基础信息</h4>
              <div class={styles.infoRow}>姓名：{(profile.value?.userName ?? personName.value) || "--"}</div>
              <div class={styles.infoRow}>部门：{profile.value?.deptName ?? "--"}</div>
              <div class={styles.infoRow}>岗位：{profile.value?.postName ?? "--"}</div>
              <div class={styles.infoRow}>单位：{profile.value?.companyName ?? "--"}</div>
              <div class={styles.infoRow}>手机号：{maskPhone(profile.value?.phone ?? "")}</div>
              <div class={styles.infoRow}>类型：{typeLabels()}</div>
            </div>
            <div class={styles.infoCard}>
              <h4>持有证书</h4>
              {certs.value.length === 0 ? (
                <Empty description="暂无证书信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <ul class={styles.certList}>
                  {certs.value.map((c) => (
                    <li key={c.id}>
                      {c.certName ?? "--"} {c.certNo ? `(${c.certNo})` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div class={styles.right}>
            <Tabs v-model:activeKey={activeTab.value}>
              {RESUME_TABS.map((t) => (
                <TabPane key={t.key} tab={t.label}>
                  {personId.value == null ? (
                    <Empty description="暂无数据" />
                  ) : t.key === "timeline" ? (
                    <TimelineTab personId={personId.value} />
                  ) : (
                    <TaskTableTab personId={personId.value} resumeType={t.key} />
                  )}
                </TabPane>
              ))}
            </Tabs>
          </div>
        </div>
      </Drawer>
    );
  },
});
