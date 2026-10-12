// @ts-nocheck
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { BasicInfo } from "./components/basic-info";
import { CubeLayout, joinIds } from "@/compat/app-design";
import { InspectContentTable, type DataSourceType } from "@/components/inspect-content-table/inspect-content-table";
import { getDailyInspectionClient } from "@/domain-context";
import { Button, Space, message } from "@/pc-ui-runtime";

import styles from "./inspect-task-edit.module.css";

function flattenTargets(detail: InspectionRecord): DataSourceType[] {
  const typeTargets = detail.typeTargets;
  const raw = Array.isArray(typeTargets)
    ? typeTargets.flat()
    : Array.isArray(detail.taskTargetDTOList)
      ? detail.taskTargetDTOList
      : Array.isArray(detail.targets)
        ? detail.targets
        : [];
  return (raw as InspectionRecord[])
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      targetId: String(item.targetId ?? item.id ?? ""),
      targetName: String(item.targetName ?? item.name ?? ""),
      targetCategory: String(item.targetCategory ?? item.type ?? ""),
      standardDTOList: Array.isArray(item.standardDTOList)
        ? item.standardDTOList
        : Array.isArray(item.standardVOS)
          ? item.standardVOS
          : item.standardId
            ? [{ id: item.standardId, name: item.standardName }]
            : [],
    }));
}

export const InspectTaskEdit = defineComponent({
  name: "InspectTaskEdit",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const state = reactive<{ formState: InspectionRecord; tableData: DataSourceType[]; loading: boolean }>({
      formState: {},
      tableData: [],
      loading: false,
    });
    const basicInfoRef = ref<{ handleSubmit: () => Promise<InspectionRecord> }>();
    const patrolContentRef = ref<{ getApiParams: () => unknown[] }>();

    const title = computed(() => {
      const map = { info: "巡检任务详情", create: "新增巡检任务", edit: "编辑巡检任务", copy: "新增巡检任务" };
      return map[String(route.query.type ?? "create") as keyof typeof map] ?? "新增巡检任务";
    });

    const loadDetail = async (): Promise<void> => {
      const id = String(route.query.id ?? "");
      if (!id) return;
      try {
        const res = await getDailyInspectionClient().getTask({ id });
        state.formState = res;
        state.tableData = flattenTargets(res);
      } catch {
        message.error("巡检任务详情加载失败");
      }
    };

    const handleSubmit = async (): Promise<void> => {
      try {
        const formValue = await basicInfoRef.value?.handleSubmit();
        if (!formValue) return;
        const taskTargetDTOList = patrolContentRef.value?.getApiParams() ?? [];
        if (!taskTargetDTOList.length) {
          message.error("巡检内容不能为空");
          return;
        }
        if (taskTargetDTOList.some((item) => !(item as InspectionRecord).standardId)) {
          message.error("请选择巡检标准");
          return;
        }
        state.loading = true;
        await getDailyInspectionClient().createTask({
          ...formValue,
          ...(route.query.id && route.query.type !== "copy" ? { id: String(route.query.id) } : {}),
          taskTargetDTOList,
          receiveIds: joinIds(formValue.receiveIds),
          checkUserIds: joinIds(formValue.checkUserIds),
          validBeginTime: formValue.beginTime,
          validEndTime: formValue.endTime,
          cronId: formValue.cronId === "custom" ? "" : formValue.cronId,
          enable: 1,
        });
        message.success("保存成功");
        router.back();
      } catch {
        message.error("保存失败，请检查填写内容后重试");
      } finally {
        state.loading = false;
      }
    };

    onMounted(() => void loadDetail());

    const slots = {
      "layout-content": () => (
        <div class={styles["edit-content"]}>
          <div class={styles.title}>基础信息</div>
          <BasicInfo initFormState={state.formState} ref={basicInfoRef} />
          <div class={styles.title}>巡检内容</div>
          <InspectContentTable dataSource={state.tableData} ref={patrolContentRef} />
        </div>
      ),
      "footer-page": () => (
        <Space>
          <Button onClick={() => router.back()}>返回</Button>
          <Button type="primary" loading={state.loading} onClick={() => void handleSubmit()}>
            保存
          </Button>
        </Space>
      ),
    };

    return () => <CubeLayout title={title.value} v-slots={slots} />;
  },
});
