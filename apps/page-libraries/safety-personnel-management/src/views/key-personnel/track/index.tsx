import { showApiError } from "../../../utils/api-error";

import layoutStyles from "../../../layout.module.css";
/** @jsxImportSource vue */
import type { KeyPersonOptionVO } from "@g2-contract/safety-personnel";
import {
  Button,
  RangePicker as DateRangePicker,
  Empty,
  Form,
  FormItem,
  Input,
  Modal,
  Select,
  SelectOption,
  Table,
  message,
} from "@g2-platform/pc-ui";
import { defineComponent, ref } from "vue";

import { getKeyPersonOptions } from "../../../api/safety-personnel";
import { GPagination } from "../../../components/common/pagination";
import { TrackMap, type TrackPoint } from "../../../components/key-personnel/track-map/track-map";
import { PageShell } from "../../../components/page-shell/page-shell";
import { KEY_PERSON_TRACK_PAGE_SIZE } from "../../../constants";
import { useAuthRequest } from "../../../hooks/use-auth-request";
import { usePageName } from "../../../utils/page-name";

import styles from "./index.module.css";

interface TrackRecord extends TrackPoint {
  id: string;
  name: string;
  location: string;
  time: string;
}

const FIXED_TRACK_POINTS: TrackPoint[] = [
  { lng: 104.0188, lat: 30.5658 },
  { lng: 104.0195, lat: 30.5658 },
  { lng: 104.0202, lat: 30.5658 },
  { lng: 104.0189, lat: 30.5654 },
  { lng: 104.0194, lat: 30.5653 },
  { lng: 104.0202, lat: 30.5654 },
  { lng: 104.0206, lat: 30.5658 },
  { lng: 104.0213, lat: 30.5658 },
  { lng: 104.0211, lat: 30.5654 },
  { lng: 104.02, lat: 30.5649 },
  { lng: 104.0192, lat: 30.5646 },
  { lng: 104.019, lat: 30.5641 },
  { lng: 104.0194, lat: 30.5638 },
  { lng: 104.0199, lat: 30.5642 },
  { lng: 104.0212, lat: 30.5646 },
  { lng: 104.0217, lat: 30.5656 },
  { lng: 104.0233, lat: 30.5655 },
  { lng: 104.0222, lat: 30.5649 },
  { lng: 104.0229, lat: 30.5642 },
  { lng: 104.0211, lat: 30.5637 },
  { lng: 104.0202, lat: 30.5637 },
];

const buildFixedTrackRecords = (name: string, timeRange?: string[]): TrackRecord[] => {
  const start = timeRange?.[0] ? new Date(timeRange[0]).getTime() : new Date("2026-07-07 09:00:00").getTime();
  return FIXED_TRACK_POINTS.map((point, index) => {
    const time = new Date(start + index * 3 * 60 * 1000);
    const pad = (value: number): string => String(value).padStart(2, "0");
    return {
      ...point,
      id: `fixed-track-${index + 1}`,
      name,
      location: `轨迹点${index + 1}（${point.lng.toFixed(4)}, ${point.lat.toFixed(4)}）`,
      time: `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`,
    };
  });
};

export const KeyPersonnelTrackPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const personModalVisible = ref(false);
    const personOptions = ref<KeyPersonOptionVO[]>([]);
    const selectedPersonId = ref<string | undefined>(undefined);
    const currentPerson = ref<KeyPersonOptionVO | null>(null);
    const personName = ref("");

    /** 与 alarm-record 一致：字符串数组，逗号拼接后传接口 */
    const timeRange = ref<string[] | undefined>(undefined);
    const pageNumber = ref(1);
    const trackRecords = ref<TrackRecord[]>([]);

    const openPersonModal = async (): Promise<void> => {
      personOptions.value = await useAuthRequest(() => getKeyPersonOptions());
      selectedPersonId.value = currentPerson.value ? String(currentPerson.value.id) : undefined;
      personModalVisible.value = true;
    };

    const confirmPerson = (): void => {
      if (!selectedPersonId.value) {
        message.warning("请选择重点人员");
        return;
      }
      currentPerson.value = personOptions.value.find((p) => String(p.id) === selectedPersonId.value) ?? null;
      personName.value = currentPerson.value?.name ?? "";
      personModalVisible.value = false;
    };

    const personLabel = (): string => {
      if (!currentPerson.value) {
        return "";
      }
      return `当前人员：${currentPerson.value.name} (区域：${currentPerson.value.areaName ?? "--"})`;
    };

    const onQuery = (): void => {
      if (!currentPerson.value) {
        message.warning("请先选择人员");
        return;
      }
      pageNumber.value = 1;
      trackRecords.value = buildFixedTrackRecords(currentPerson.value.name ?? "重点人员", timeRange.value);
      message.success("轨迹查询成功");
    };

    const onReset = (): void => {
      timeRange.value = undefined;
      currentPerson.value = null;
      personName.value = "";
      pageNumber.value = 1;
      trackRecords.value = [];
    };

    const columns = [
      { title: "姓名", dataIndex: "name" },
      { title: "地点", dataIndex: "location" },
      { title: "时间", dataIndex: "time" },
    ];

    const pagedTrackRecords = (): TrackRecord[] =>
      trackRecords.value.slice((pageNumber.value - 1) * KEY_PERSON_TRACK_PAGE_SIZE, pageNumber.value * KEY_PERSON_TRACK_PAGE_SIZE);

    const layoutSlots = {
      "layout-content": () => (
        <>
          <Form layout="inline" class={styles.searchForm} data-layout-toolbar>
            <FormItem class={styles.searchItem}>
              <div
                class={styles.personField}
                onClick={() => {
                  void openPersonModal().catch((error) => showApiError(error));
                }}
              >
                <Input
                  v-model:value={personName.value}
                  placeholder="请选择人员"
                  readonly
                  showCount={false}
                  allowClear={false}
                  maxlength={50}
                  style={{ width: "200px", cursor: "pointer" }}
                />
              </div>
            </FormItem>
            <FormItem class={styles.searchItem}>
              <Button
                type="primary"
                onClick={() => {
                  void openPersonModal().catch((error) => showApiError(error));
                }}
              >
                选择人员
              </Button>
            </FormItem>
            <FormItem label="时间范围" class={styles.searchItem}>
              <DateRangePicker
                v-model:value={timeRange.value}
                showTime={{ format: "HH:mm:ss" }}
                format="YYYY-MM-DD HH:mm:ss"
                valueFormat="YYYY-MM-DD HH:mm:ss"
                allowClear
              />
            </FormItem>
            <FormItem class={styles.searchItem}>
              <Button type="primary" onClick={onQuery}>
                查询
              </Button>
              <Button style={{ marginLeft: "10px" }} onClick={onReset}>
                重置
              </Button>
            </FormItem>
          </Form>

          <TrackMap personLabel={personLabel()} trackPoints={trackRecords.value} />

          <div class={styles.listTitle}>轨迹列表</div>
          <Table
            rowKey="id"
            dataSource={pagedTrackRecords()}
            columns={columns}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无轨迹数据" /> }}
          />
        </>
      ),
      "footer-page": () => (
        <GPagination
          total={trackRecords.value.length}
          current={pageNumber.value}
          pageSize={KEY_PERSON_TRACK_PAGE_SIZE}
          onChange={(page: number) => {
            pageNumber.value = page;
          }}
        />
      ),
    };

    return () => (
      <div class={layoutStyles.route}>
        <PageShell title={pageTitle.value} v-slots={layoutSlots} />
        <Modal
          open={personModalVisible.value}
          title="选择轨迹查询人员"
          onOk={confirmPerson}
          onCancel={() => {
            personModalVisible.value = false;
          }}
        >
          <Select v-model:value={selectedPersonId.value} style={{ width: "100%" }} placeholder="请选择重点人员">
            {personOptions.value.map((p) => (
              <SelectOption key={p.id} value={String(p.id)}>
                {p.name} ({p.areaName})
              </SelectOption>
            ))}
          </Select>
        </Modal>
      </div>
    );
  },
});
