import type { HazardDetailBasicInfoVO } from "@g2-contract/hazard-governance";
import type { VNodeChild } from "vue";

import { type DetailRecord, readCategoryName, readRecordText, readText, renderSourceTag, renderValue } from "../detail-utils";
import { DetailField, DetailGrid, FileBlock, LedgerStepCard } from "./step-shared";
import { formatTime } from "@/utils/format-time";

const recognitionModeChannelText: Record<string, string> = {
  IMAGE: "OCR",
  DESCRIPTION: "NLP",
  IMAGE_DESCRIPTION: "OCR+NLP",
};

const readAnalysisChannel = (record: DetailRecord): string => {
  const mode = readRecordText(record, ["aiRecognitionMode"]);
  return recognitionModeChannelText[mode] || readRecordText(record, ["analysisChannel", "aiAnalysisChannel", "recognitionChannel"]);
};

export const ReportStep = (props: { basicInfo: HazardDetailBasicInfoVO }): VNodeChild => {
  const record = props.basicInfo as DetailRecord;
  const aiRecognitionCategoryName = readRecordText(record, ["aiRecommendedCategoryName"]);
  const categoryName = readCategoryName(record);
  const reporterName = readText(record, ["reporterName", "reporterId", "reportedByName", "foundByName", "createdByName"]);
  const analysisChannel = readAnalysisChannel(record);
  const aiRecognitionType = aiRecognitionCategoryName || readRecordText(record, ["aiRecommendedCategoryId"]);
  const showAiRecognitionResult = Boolean(aiRecognitionType || analysisChannel);

  return LedgerStepCard({
    index: 1,
    title: "隐患上报",
    meta: formatTime(props.basicInfo.reportedTime),
    children: (
      <>
        {FileBlock({ label: "现场照片", files: props.basicInfo.sceneImages })}
        {showAiRecognitionResult ? (
          <div class="hazard-ledger-ai-result">
            <strong>AI 识别结果</strong>
            {DetailGrid({
              children: (
                <>
                  {DetailField({
                    label: "隐患类型",
                    value: aiRecognitionType,
                  })}
                  {DetailField({ label: "分析通道", value: analysisChannel || "--" })}
                </>
              ),
            })}
          </div>
        ) : null}
        {DetailGrid({
          children: (
            <>
              {DetailField({ label: "隐患类型", value: categoryName || props.basicInfo.categoryId })}
              {DetailField({ label: "来源", value: renderSourceTag(props.basicInfo.sourceType) })}
              {DetailField({ label: "位置", value: props.basicInfo.locationName })}
              {DetailField({ label: "发现人", value: reporterName })}
              {DetailField({ label: "发现时间", value: formatTime(props.basicInfo.reportedTime) })}
            </>
          ),
        })}
        <div class="hazard-ledger-description-line">
          <span>隐患描述</span>
          <p>{renderValue(props.basicInfo.description)}</p>
        </div>
      </>
    ),
  });
};
