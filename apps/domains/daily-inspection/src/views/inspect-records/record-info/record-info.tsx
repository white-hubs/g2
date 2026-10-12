// @ts-nocheck
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { defineComponent, onMounted, reactive, ref, type VNode } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ResultItem } from "./components/result-item/result-item";
import { CubeLayout } from "@/compat/app-design";
import { OBJECT_STATUS_MAP, formatDisplayTime } from "@/compat/constants";
import { getDailyInspectionClient } from "@/domain-context";
import { Button, Col, Image, ImagePreviewGroup, Row, Space, Spin, message } from "@/pc-ui-runtime";

import styles from "./record-info.module.css";

const BASE = "/d/daily-inspection";

export const RecordInfo = defineComponent({
  name: "InspectRecordInfo",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(true);
    const state = reactive<{ formData: InspectionRecord }>({ formData: {} });

    const schemaData: Array<{
      fieldName: string;
      label: string;
      customRender?: (value: unknown) => VNode | string;
    }> = [
      { fieldName: "createTimeFormat", label: "发布时间" },
      { fieldName: "targetName", label: "巡检对象" },
      {
        fieldName: "taskName",
        label: "任务名称",
        customRender: (value) =>
          value ? (
            <a
              onClick={(event: Event) => {
                event.preventDefault();
                void router.push({
                  path: `${BASE}/inspect-task-info`,
                  query: { type: "info", id: String(state.formData.taskId ?? "") },
                });
              }}
            >
              {String(value)}
            </a>
          ) : (
            "--"
          ),
      },
      {
        fieldName: "planName",
        label: "巡检计划",
        customRender: (value) =>
          value ? (
            <a
              onClick={(event: Event) => {
                event.preventDefault();
                void router.push({
                  path: `${BASE}/inspect-plan-edit`,
                  query: { type: "info", id: String(state.formData.planId ?? "") },
                });
              }}
            >
              {String(value)}
            </a>
          ) : (
            "--"
          ),
      },
      { fieldName: "nickname", label: "巡检人员" },
      { fieldName: "timeFormat", label: "巡检时间" },
      { fieldName: "statusName", label: "状态" },
      { fieldName: "resultName", label: "巡检结果" },
      { fieldName: "assistNames", label: "协同人" },
      { fieldName: "organizationName", label: "所属部门" },
      { fieldName: "areaName", label: "所在区域" },
      { fieldName: "remark", label: "备注" },
    ];

    onMounted(async () => {
      const id = String(route.query.id ?? "");
      if (!id) {
        loading.value = false;
        return;
      }
      try {
        const result = await getDailyInspectionClient().getRecord(id);
        const resultKey = String(result.result ?? "");
        state.formData = {
          ...result,
          createTimeFormat: formatDisplayTime(result.createTime),
          timeFormat: result.time ? formatDisplayTime(result.time) : "--",
          resultName: resultKey === "ABNORMAL" ? "异常" : resultKey === "NORMAL" ? "正常" : "--",
          statusName: OBJECT_STATUS_MAP[String(result.status ?? "")] ?? result.status ?? "--",
        };
      } catch {
        message.error("巡检记录详情加载失败");
      } finally {
        loading.value = false;
      }
    });

    const FieldComponent = (props: { label: string; fieldName: string; customRender?: (value: unknown) => VNode | string }): VNode => (
      <Col xxl={8} xl={8} lg={8} md={12} sm={12} xs={24}>
        <div class={styles["item-content"]}>
          <label>{props.label}：</label>
          <span>
            {props.customRender
              ? props.customRender(state.formData[props.fieldName])
              : String(state.formData[props.fieldName] ?? "--") || "--"}
          </span>
        </div>
      </Col>
    );

    const slots = {
      "layout-content": () => {
        const snapUrls = Array.isArray(state.formData.snapCaptureUrls) ? state.formData.snapCaptureUrls : [];
        const standards = Array.isArray(state.formData.standardVOS) ? state.formData.standardVOS : [];
        const handled = Array.isArray(state.formData.recordHandledManuallyPOS) ? state.formData.recordHandledManuallyPOS : [];
        const workOrders = Array.isArray(state.formData.recordToBusinessVOS) ? state.formData.recordToBusinessVOS : [];
        return (
          <Spin spinning={loading.value}>
            <div class={styles.container}>
              <div class={styles["item-title"]}>基本信息</div>
              <Row gutter={[0, 24]}>
                {schemaData.map((item) => (
                  <FieldComponent key={item.fieldName} label={item.label} fieldName={item.fieldName} customRender={item.customRender} />
                ))}
                <Col xxl={8} xl={8} lg={8} md={12} sm={12} xs={24}>
                  <div class={styles["item-content"]}>
                    <label>巡检抓拍：</label>
                    <div class={styles["snap-list"]}>
                      {snapUrls.length ? (
                        <ImagePreviewGroup>
                          {snapUrls.map((url: string, index: number) => (
                            <Image key={`${url}-${index}`} src={url} style={{ width: "100px", height: "100px" }} width={100} height={100} />
                          ))}
                        </ImagePreviewGroup>
                      ) : (
                        "--"
                      )}
                    </div>
                  </div>
                </Col>
              </Row>

              {workOrders.length ? (
                <>
                  <div class={styles["item-title"]} style={{ marginTop: "32px" }}>
                    关联工单
                  </div>
                  <Row gutter={[0, 12]}>
                    {workOrders.map((item: InspectionRecord, index: number) => (
                      <Col span={24} key={String(item.id ?? index)}>
                        <div class={styles["item-content"]}>
                          <label>工单{index + 1}：</label>
                          <span>
                            {String(item.businessName ?? item.workOrderName ?? item.name ?? item.businessId ?? "--")}
                            {item.businessStatus ? `（${String(item.businessStatus)}）` : ""}
                          </span>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </>
              ) : null}

              {standards.length ? (
                <>
                  <div class={styles["item-title"]} style={{ marginTop: "32px" }}>
                    巡检结果
                  </div>
                  <ResultItem patrolResult={standards} />
                </>
              ) : null}

              {handled.length ? (
                <>
                  <div class={styles["item-title"]} style={{ marginTop: "32px" }}>
                    异常处理
                  </div>
                  <Row gutter={[0, 16]}>
                    {handled.map((item: InspectionRecord, index: number) => (
                      <Col span={24} key={String(item.id ?? index)}>
                        <div class={styles["item-content"]}>
                          <label>处理时间：</label>
                          <span>{formatDisplayTime(item.createTime ?? item.handleTime)}</span>
                        </div>
                        <div class={styles["item-content"]}>
                          <label>处理人：</label>
                          <span>{String(item.handlerName ?? item.nickname ?? "--")}</span>
                        </div>
                        <div class={styles["item-content"]}>
                          <label>处理说明：</label>
                          <span>{String(item.remark ?? item.handleDesc ?? "--")}</span>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </>
              ) : null}

              {state.formData.cancelReason || (Array.isArray(state.formData.cancelFileList) && state.formData.cancelFileList.length) ? (
                <>
                  <div class={styles["item-title"]} style={{ marginTop: "32px" }}>
                    取消巡检说明
                  </div>
                  <div class={styles["item-content"]}>
                    <label>说明：</label>
                    <span>{String(state.formData.cancelReason ?? "--")}</span>
                  </div>
                </>
              ) : null}
            </div>
          </Spin>
        );
      },
      "footer-page": () => (
        <Space>
          <Button onClick={() => router.back()}>返回</Button>
        </Space>
      ),
    };

    return () => <CubeLayout title="巡检记录详情" v-slots={slots} />;
  },
});
