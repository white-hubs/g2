import { defineComponent, onMounted, reactive, ref, type Ref } from "vue";

import { cubeMessageCenterService } from "@/api/message-center-service";
import { NoticeUserSelect as UserFusionSelect } from "@/components/notice-user-select";
import { getEmergencySuppliesPcUi } from "@/domain-context";
import { getEmergencySuppliesClient } from "@/shared";

import styles from "./warning-config.module.less";

const { Alert, Button, InputNumber, PageLayout, Spin, Switch, message } = getEmergencySuppliesPcUi();

const BUSINESS_TYPE = "EMERGENCY_SUPPLIES";
const SCENE_YELLOW = "EMERGENCY_SUPPLIES_EXPIRY_YELLOW";
const SCENE_ORANGE = "EMERGENCY_SUPPLIES_EXPIRY_ORANGE";
const SCENE_RED = "EMERGENCY_SUPPLIES_EXPIRY_RED";
const SCENE_STOCK = "EMERGENCY_SUPPLIES_STOCK";

interface NoticeUserItem {
  type: string;
  ids?: string[];
}

interface NoticeWayDTO {
  noticeWay?: string | null;
}

interface NoticeObjDTO {
  objId?: string | null;
  objType?: string | null;
}

interface SceneConfigDTO {
  label?: string;
  sceneCode?: string;
  noticeWays?: NoticeWayDTO[] | null;
  noticeObjs?: NoticeObjDTO[] | null;
}

interface ExpiryLevelConfig {
  sceneCode: string;
  label: string;
  days: number;
  noticeWays: string[];
  noticeItems: NoticeUserItem;
}

interface StockLevelConfig {
  sceneCode: string;
  label: string;
  noticeWays: string[];
  noticeItems: NoticeUserItem;
}

function parseNoticeItems(raw?: { objId?: string | null; objType?: string | null }[] | null): NoticeUserItem {
  if (!raw?.length) {
    return { type: "USER", ids: [] };
  }
  return {
    type: raw[0]?.objType || "USER",
    ids: raw[0]?.objId?.split(",").filter(Boolean) ?? [],
  };
}

function toNoticeWaysDTO(ways?: string[]): Array<{ noticeWay: string }> {
  return (ways ?? []).map((noticeWay) => ({ noticeWay }));
}

function toNoticeObjsDTO(item: NoticeUserItem): Array<{
  objType: string;
  objId: string;
  objInfo: string;
}> {
  return [
    {
      objType: item.type || "USER",
      objId: item.ids?.join(",") ?? "",
      objInfo: JSON.stringify(item.ids ?? []),
    },
  ];
}

export const WarningConfig = defineComponent({
  name: "WarningConfig",
  setup: () => {
    const loading = ref(false);
    const saving = ref(false);

    const expiry = reactive({
      warningType: "EXPIRY",
      enabled: true,
    });

    const yellow = reactive<ExpiryLevelConfig>({
      sceneCode: SCENE_YELLOW,
      label: "黄色预警",
      days: 90,
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
    });
    const orange = reactive<ExpiryLevelConfig>({
      sceneCode: SCENE_ORANGE,
      label: "橙色预警",
      days: 30,
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
    });
    const red = reactive<ExpiryLevelConfig>({
      sceneCode: SCENE_RED,
      label: "红色预警",
      days: 7,
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
    });
    const stock = reactive<StockLevelConfig>({
      sceneCode: SCENE_STOCK,
      label: "库存预警",
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
    });

    const yellowUserRef = ref<{
      checkFormData: () => Promise<unknown>;
      isValid: Ref<boolean>;
    }>();
    const orangeUserRef = ref<{
      checkFormData: () => Promise<unknown>;
      isValid: Ref<boolean>;
    }>();
    const redUserRef = ref<{
      checkFormData: () => Promise<unknown>;
      isValid: Ref<boolean>;
    }>();
    const stockUserRef = ref<{
      checkFormData: () => Promise<unknown>;
      isValid: Ref<boolean>;
    }>();

    const loadSceneConfig = (configs: SceneConfigDTO[], level: ExpiryLevelConfig | StockLevelConfig): void => {
      const scene = configs.find((item) => item.sceneCode === level.sceneCode);
      if (!scene) {
        return;
      }
      level.label = scene.label || level.label;
      level.noticeWays = (scene.noticeWays ?? []).map((way: NoticeWayDTO) => way.noticeWay ?? "").filter(Boolean);
      level.noticeItems = parseNoticeItems(scene.noticeObjs);
    };

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const [warningData, messageConfigs] = await Promise.all([
          getEmergencySuppliesClient().getWarningConfig(),
          cubeMessageCenterService.getMessageConfig({
            businessType: BUSINESS_TYPE,
          }),
        ]);
        const expiryConfig = warningData.find((item: { warningType: string }) => item.warningType === "EXPIRY");
        Object.assign(expiry, expiryConfig ?? {});
        yellow.days = expiryConfig?.yellowDays ?? 90;
        orange.days = expiryConfig?.orangeDays ?? 30;
        red.days = expiryConfig?.redDays ?? 7;
        loadSceneConfig(messageConfigs, yellow);
        loadSceneConfig(messageConfigs, orange);
        loadSceneConfig(messageConfigs, red);
        loadSceneConfig(messageConfigs, stock);
      } finally {
        loading.value = false;
      }
    };

    const validateNoticeUsers = async (): Promise<boolean> => {
      const checks = [
        ...(expiry.enabled
          ? [
              { ref: yellowUserRef, label: "黄色预警" },
              { ref: orangeUserRef, label: "橙色预警" },
              { ref: redUserRef, label: "红色预警" },
            ]
          : []),
        { ref: stockUserRef, label: "库存预警" },
      ];
      for (const item of checks) {
        try {
          await item.ref.value?.checkFormData();
        } catch {
          message.warning(`请配置${item.label}通知人员`);
          return false;
        }
      }
      return true;
    };

    const submit = async (): Promise<void> => {
      if (!(await validateNoticeUsers())) {
        return;
      }
      saving.value = true;
      try {
        await Promise.all([
          getEmergencySuppliesClient().updateWarningConfig([
            {
              ...expiry,
              yellowDays: yellow.days,
              orangeDays: orange.days,
              redDays: red.days,
            },
          ]),
          cubeMessageCenterService.addMessageConfig({
            businessType: BUSINESS_TYPE,
            sceneConfigDTOS: [
              ...[yellow, orange, red].map((level) => ({
                label: level.label,
                sceneCode: level.sceneCode,
                value: String(level.days),
                config: "",
                noticeWays: toNoticeWaysDTO(level.noticeWays),
                noticeObjs: toNoticeObjsDTO(level.noticeItems),
              })),
              {
                label: stock.label,
                sceneCode: stock.sceneCode,
                value: "",
                config: "",
                noticeWays: toNoticeWaysDTO(stock.noticeWays),
                noticeObjs: toNoticeObjsDTO(stock.noticeItems),
              },
            ],
          }),
        ]);
        message.success("操作成功");
        await load();
      } finally {
        saving.value = false;
      }
    };

    onMounted(() => {
      void load();
    });

    const renderExpiryCard = (level: ExpiryLevelConfig, cardClass: string, titleClass: string, userRef: typeof yellowUserRef) => (
      <div class={[styles.expiryCard, cardClass]}>
        <div class={[styles.cardTitle, titleClass]}>{level.label}</div>
        <div class={styles.daysRow}>
          <span>距到期 ≤</span>
          <InputNumber class={styles.daysInput} v-model:value={level.days} min={1} max={9999} precision={0} />
          <span>天</span>
        </div>
        <div class={styles.notifyLabel}>通知人员</div>
        <div class={styles.notifySelect}>
          <UserFusionSelect
            ref={userRef}
            typeValue={level.noticeItems}
            onUpdate:typeValue={(value: NoticeUserItem) => {
              level.noticeItems = value;
            }}
          />
        </div>
      </div>
    );

    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div class={styles.content}>
            <div class={styles.section}>
              <div class={styles.sectionHeader}>
                <h3 class={styles.sectionTitle}>有效期预警规则</h3>
                <Switch v-model:checked={expiry.enabled} />
              </div>
              <div class={styles.expiryCards}>
                {renderExpiryCard(yellow, styles.expiryCardYellow, styles.cardTitleYellow, yellowUserRef)}
                {renderExpiryCard(orange, styles.expiryCardOrange, styles.cardTitleOrange, orangeUserRef)}
                {renderExpiryCard(red, styles.expiryCardRed, styles.cardTitleRed, redUserRef)}
              </div>
              <div class={styles.expiredNote}>已过期：每日汇总推送</div>
            </div>

            <div class={styles.section}>
              <h3 class={styles.sectionTitle}>库存预警规则</h3>
              <div class={styles.stockCard}>
                <Alert
                  type="info"
                  showIcon
                  message="当前库存量 < 安全库存下限时自动触发预警。每次库存变动后实时比对。同一物资在库存恢复至下限以上前不重复推送。"
                />
                <div class={styles.notifyLabel}>通知人员</div>
                <div class={styles.notifySelect}>
                  <UserFusionSelect
                    ref={stockUserRef}
                    typeValue={stock.noticeItems}
                    onUpdate:typeValue={(value: NoticeUserItem) => {
                      stock.noticeItems = value;
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Spin>
      ),
      "footer-page": () => (
        <Button type="primary" loading={saving.value} onClick={submit}>
          保存设置
        </Button>
      ),
    };

    return () => <PageLayout title="预警规则配置" v-slots={slots} />;
  },
});
