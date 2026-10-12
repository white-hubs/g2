// eslint-disable-next-line @typescript-eslint/naming-convention
export const command_dispatch_cards = {
  /** 指挥调度 */
  commandDispatch: {
    name: "指挥调度",
    cards: {
      /** 指挥调度-报警级别统计 */
      commandDispatchAlarmLevel: {
        title: "报警级别统计",
        code: "command-dispatch-alarm-level",
      },
      /** 指挥调度-报警处理排名*/
      commandDispatchAlarmRank: {
        title: "报警处理排名",
        code: "command-dispatch-alarm-rank",
      },
      /** 指挥调度-报警正确率*/
      commandDispatchAlarmAccuracy: {
        title: "报警正确率",
        code: "command-dispatch-alarm-accuracy",
      },
      /** 指挥调度-当日值班人员*/
      commandDispatchDutyPerson: {
        title: "当日值班人员",
        code: "command-dispatch-duty-person",
      },
      /** 指挥调度-应急广播使用情况*/
      commandDispatchEmergencyBroadcast: {
        title: "应急广播使用情况",
        code: "command-dispatch-emergency-broadcast",
      },
      /** 指挥调度-报警事件处理情况*/
      commandDispatchAlarmEvent: {
        title: "报警事件处理情况",
        code: "command-dispatch-alarm-event",
      },
      /** 指挥调度-报警区域TOP5*/
      commandDispatchAlarmAreaTop5: {
        title: "报警区域TOP5",
        code: "command-dispatch-alarm-area-top5",
      },
    },
  },
};
