// @ts-nocheck -- 从 cube daily-inspection inspect-plan-edit 迁入。
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { BasicInfo } from "./components/basic-info";
import { CubeLayout } from "@/compat/app-design";
import dayjs from "@/compat/dayjs";
import { InspectContentTable, type DataSourceType } from "@/components/inspect-content-table/inspect-content-table";
import { getDailyInspectionClient } from "@/domain-context";
import { Button, Space, message } from "@/pc-ui-runtime";

import styles from "./inspect-plan-edit.module.css";

const createType = new Set(["create", "copy"]);

function normalizeTypeTargets(raw: unknown): DataSourceType[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((item) => {
      if (Array.isArray(item)) return item as DataSourceType[];
      return [item as DataSourceType];
    })
    .map((item) => ({
      ...item,
      targetId: String(item.targetId ?? item.id ?? ""),
      targetName: String(item.targetName ?? item.name ?? ""),
      targetCategory: String(item.targetCategory ?? item.type ?? ""),
      standardDTOList: Array.isArray(item.standardDTOList) ? item.standardDTOList : Array.isArray(item.standardVOS) ? item.standardVOS : [],
    }));
}

export const InspectPlanEdit = defineComponent({
  name: "InspectPlanEdit",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const state = reactive<{
      formState: Record<string, unknown>;
      tableData: DataSourceType[];
      loading: boolean;
      page: Record<string, unknown>;
    }>({
      formState: {},
      tableData: [],
      loading: false,
      page: { total: 0 },
    });

    const title = computed(() => {
      const titleType = {
        info: "巡检计划详情",
        edit: "编辑巡检计划",
        create: "新增巡检计划",
        copy: "新增巡检计划",
      };
      return titleType[route.query.type as keyof typeof titleType] ?? "新增巡检计划";
    });

    const basicInfoRef = ref<{ handleSubmit: () => Promise<Record<string, unknown>> }>();
    const patrolContentRef = ref<{ getApiParams: () => unknown[] }>();

    const handleSubmit = async (): Promise<void> => {
      const type = String(route.query.type ?? "create");
      const formValue = (await basicInfoRef.value?.handleSubmit()) as Record<string, unknown>;
      const planRelationList = patrolContentRef.value?.getApiParams();
      if (!planRelationList?.length) {
        message.error("巡检内容不能为空");
        return;
      }
      const noStandardList = planRelationList.filter((item) => !(item as Record<string, string>).standardId);
      if (noStandardList.length) {
        message.error("请选择巡检标准");
        return;
      }
      try {
        state.loading = true;
        const receiveIds = Array.isArray(formValue.receiveIds) ? formValue.receiveIds : [];
        const checkUserIds = Array.isArray(formValue.checkUserIds) ? formValue.checkUserIds : [];
        const selection = Array.isArray(formValue.selection) ? formValue.selection : [];
        const params = {
          ...formValue,
          planRelationList,
          receiveIds: receiveIds.join(","),
          checkUserIds: checkUserIds.join(","),
          validBeginTime: formValue.beginTime,
          validEndTime: formValue.endTime,
          selection: selection.join(","),
          cronId: formValue.cronId === "custom" ? "" : formValue.cronId,
          enable: 1,
          id: createType.has(type) ? "" : formValue.id,
        };
        const client = getDailyInspectionClient();
        if (createType.has(type)) {
          await client.createPlan(params);
        } else {
          await client.updatePlan(params);
        }
        message.success("保存成功");
        router.back();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        state.loading = false;
      }
    };

    const getDetails = async (): Promise<void> => {
      const id = String(route.query.id ?? "");
      const type = String(route.query.type ?? "");
      if (!id) return;
      try {
        const res = await getDailyInspectionClient().getPlan({ id, notTarget: true });
        state.formState = {
          ...res,
          name: type === "copy" ? `${res.name}-副本-${dayjs().format("YYYY-MM-DD")}` : res.name,
          selection: res.selection ? String(res.selection).split(",") : null,
        };
      } catch (error) {
        message.error(error instanceof Error ? error.message : "计划详情加载失败");
      }
    };

    const getTableData = async (): Promise<void> => {
      if (String(route.query.type ?? "") === "create") return;
      const id = String(route.query.id ?? "");
      if (!id) return;
      const first = await getDailyInspectionClient().getPlan({ id, pageNumber: 1, pageSize: 10 });
      const total = Number(first?.total ?? first?.targetNum ?? 0);
      if (total <= 0) {
        state.tableData = [];
        return;
      }
      const pageSize = 50;
      const totalPages = Math.ceil(total / pageSize);
      let allData: DataSourceType[] = [];
      const batchSize = 5;
      for (let batchStart = 1; batchStart <= totalPages; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize - 1, totalPages);
        const batchPromises = [];
        for (let pageNumber = batchStart; pageNumber <= batchEnd; pageNumber++) {
          batchPromises.push(
            getDailyInspectionClient()
              .getPlan({ id, pageNumber, pageSize })
              .then((pageRes) => normalizeTypeTargets(pageRes.typeTargets))
              .catch(() => [] as DataSourceType[]),
          );
        }
        const batchResults = await Promise.all(batchPromises);
        allData = [...allData, ...batchResults.flat()];
      }
      state.tableData = allData;
    };

    onMounted(() => {
      void getDetails();
      void getTableData();
    });

    const layoutSlots = {
      "layout-content": () => (
        <div class={styles.editContent}>
          <div class={[styles.title, "g2-skin-section-title"]}>基础信息</div>
          <BasicInfo initFormState={state.formState} ref={basicInfoRef} />
          <div class={[styles.title, "g2-skin-section-title"]}>巡检对象</div>
          <InspectContentTable dataSource={state.tableData} ref={patrolContentRef} />
        </div>
      ),
      "footer-page": () => (
        <Space>
          <Button onClick={() => router.back()}>{route.query.type === "info" ? "返回" : "取消"}</Button>
          {route.query.type !== "info" ? (
            <Button type="primary" loading={state.loading} onClick={() => void handleSubmit()}>
              保存
            </Button>
          ) : null}
        </Space>
      ),
    };

    return () => <CubeLayout title={title.value} v-slots={layoutSlots} />;
  },
});

export default InspectPlanEdit;
