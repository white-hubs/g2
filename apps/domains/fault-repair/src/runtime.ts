/**
 * 故障报修 / 投诉建议共用页面的运行时差异。
 * 二者同一套页面与 Client，仅靠 applicationCode 与文案前缀区分。
 */
export interface FaultMaintainRuntime {
  applicationCode: string;
  basePath: string;
  /** 业务前缀：故障 / 投诉 */
  businessPrefix: string;
  labels: {
    listTitle: string;
    recordTitle: string;
    typeTitle: string;
    workOrderStatTitle: string;
    personnelStatTitle: string;
    /** 列表「对象」列：故障对象 / 投诉内容 */
    objectColumn: string;
    typeColumn: string;
    instanceNameColumn: string;
    flowTitle: string;
    recordFlowTitle: string;
  };
}

export function resolveFaultMaintainRuntime(input: { applicationCode?: string; basePath?: string }): FaultMaintainRuntime {
  const applicationCode = input.applicationCode?.trim() || "FAULT";
  const isComplaint = applicationCode === "COMPLAINT";
  const businessPrefix = isComplaint ? "投诉" : "故障";
  const basePath = input.basePath?.trim() || (isComplaint ? "/d/complaint" : "/d/fault-repair");
  return {
    applicationCode,
    basePath,
    businessPrefix,
    labels: {
      listTitle: isComplaint ? "投诉建议" : "故障单",
      recordTitle: isComplaint ? "投诉建议记录" : "报修记录",
      typeTitle: isComplaint ? "类型配置" : "故障类型",
      workOrderStatTitle: isComplaint ? "投诉建议工单统计" : "故障报修工单统计",
      personnelStatTitle: isComplaint ? "投诉建议人员统计" : "故障报修人员统计",
      objectColumn: isComplaint ? "投诉内容" : `${businessPrefix}对象`,
      typeColumn: `${businessPrefix}类型`,
      instanceNameColumn: isComplaint ? "工单名称" : `${businessPrefix}单名称`,
      flowTitle: isComplaint ? "投诉建议" : "故障报修",
      recordFlowTitle: isComplaint ? "投诉建议记录" : "报修记录",
    },
  };
}
