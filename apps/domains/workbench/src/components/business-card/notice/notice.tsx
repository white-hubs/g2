import { defineComponent, reactive, onMounted } from "vue";

import PanelCard from "../../card/card";
import { cubeAnnouncementService } from "@/api/server";
import { Empty } from "@/pc-ui-runtime";
import { navigateToApplication } from "@/utils/navigate";

import "./notice.less";

interface NoticeItem {
  id: string;
  typeName: string;
  title: string;
  createBy: string;
  noticeTime: string;
}

interface NoticeState {
  list: NoticeItem[];
}

export default defineComponent({
  name: "Notice",
  emits: ["close"],
  setup(props, { emit }) {
    const state = reactive<NoticeState>({
      list: [],
    });

    const handleClose = (): void => {
      emit("close");
    };

    const getData = (): void => {
      cubeAnnouncementService
        .listAnnouncement({ pageNumber: 1, pageSize: 5 })
        .then((res: unknown) => {
          const records =
            res !== null && typeof res === "object" && Array.isArray((res as { records?: unknown }).records)
              ? (res as { records: NoticeItem[] }).records
              : [];
          state.list = [...records].toSorted((left, right) => new Date(right.noticeTime).getTime() - new Date(left.noticeTime).getTime());
        })
        .catch(() => {
          state.list = [];
        });
    };

    onMounted(() => {
      getData();
    });

    const goNotice = (id?: string): void => {
      navigateToApplication({
        code: "TECHNICAL_BULLETIN",
        params: { entry: "notice-info", ...(id ? { query: { id } } : {}) },
      });
    };

    return () => (
      <PanelCard title="系统通知公告" icon="icon-xitongtongzhigonggao" onClose={handleClose}>
        {{
          btn: () => <a onClick={() => goNotice()}>查看全部 &gt;</a>,
          default: () => (
            <div class="notice-container">
              {state.list.length > 0 ? (
                state.list.map((item) => (
                  <button class="notice-item" key={item.id} type="button" onClick={() => goNotice(item.id)}>
                    <div class="notice-info">
                      <span>【{item.typeName}】</span>
                      {item.title}
                    </div>
                    <div class="notice-time">{item.noticeTime}</div>
                  </button>
                ))
              ) : (
                <div style={{ width: "100%" }}>
                  <Empty description="暂无数据" />
                </div>
              )}
            </div>
          ),
        }}
      </PanelCard>
    );
  },
});
