import type { HazardDetailBasicInfoVO, HazardRectificationProgressVO } from "@g2-contract/hazard-governance";
import type { VNodeChild } from "vue";

import { ReadonlyFileUpload } from "../../shared/readonly-file-upload";
import { renderValue, toNumber } from "../detail-utils";
import { LedgerStepCard } from "./step-shared";
import { formatTime } from "@/utils/format-time";

const sortRecords = (records: HazardRectificationProgressVO[]): HazardRectificationProgressVO[] =>
  records.toSorted((prev, next) => String(next.recordTime ?? "").localeCompare(String(prev.recordTime ?? "")));

export const RectificationExecutionStep = (props: {
  basicInfo: HazardDetailBasicInfoVO;
  records?: HazardRectificationProgressVO[] | undefined;
  activeStep: number;
}): VNodeChild => {
  const records = sortRecords(props.records ?? []);
  const latestProgress = toNumber(props.basicInfo.latestProgressPercent ?? records[0]?.progressPercent, 0);
  const meta = `${records.length} 次汇报`;

  return LedgerStepCard({
    index: 5,
    title: "整改执行过程",
    meta,
    locked: props.activeStep < 4,
    children: (
      <>
        <div class="hazard-ledger-progress-bar">
          <i style={{ width: `${Math.min(100, Math.max(0, latestProgress))}%` }} />
        </div>
        {records.length > 0 ? (
          <div class="hazard-ledger-progress-records">
            {records.map((record) => (
              <article key={String(record.id)}>
                <header>
                  <span>
                    {formatTime(record.recordTime)} · {renderValue(record.recordUserName ?? record.recordUserId)} · 进度{" "}
                    {renderValue(record.progressPercent)}%
                  </span>
                </header>
                <p>{renderValue(record.progressContent)}</p>
                <ReadonlyFileUpload files={record.afterImages ?? []} emptyText="暂无整改后照片" />
              </article>
            ))}
          </div>
        ) : (
          <div class="hazard-ledger-empty">暂无整改汇报记录</div>
        )}
      </>
    ),
  });
};
