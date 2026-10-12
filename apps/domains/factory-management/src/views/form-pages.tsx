import type { AppealRecord, EnterpriseRecord, InterviewRecord, RentalRecord, RoomRecord } from "@g2-contract/factory-management";
import { ref } from "vue";

import { createRecordFormPage } from "../components/record-form-page";
import { getFactoryManagementClient } from "../domain-context";
import { type CascaderOption, type SelectOption, cascaderOptions, fileIds, options } from "../shared";

export const EnterpriseFormPage = createRecordFormPage<EnterpriseRecord>(() => {
  const enterpriseTypes = ref<SelectOption[]>([]);
  const industryTypes = ref<SelectOption[]>([]);
  const scales = ref<SelectOption[]>([]);
  return {
    subject: "企业信息",
    initial: { name: "", corporation: "", contacts: "", contactsPhone: "", fileVOS: [] },
    fields: [
      { key: "name", label: "企业名称", required: true, placeholder: "请输入企业名称" },
      { key: "corporation", label: "企业法人", required: true, placeholder: "请输入企业法人" },
      {
        key: "type",
        label: "企业类型",
        kind: "select",
        required: true,
        options: enterpriseTypes,
        detailKey: "typeName",
        placeholder: "请选择企业类型",
      },
      {
        key: "industryTypeId",
        label: "企业行业",
        kind: "select",
        required: true,
        options: industryTypes,
        detailKey: "industryTypeName",
        placeholder: "请选择企业行业",
      },
      {
        key: "scale",
        label: "企业规模",
        kind: "select",
        required: true,
        options: scales,
        detailKey: "scaleName",
        placeholder: "请选择企业规模",
      },
      { key: "contacts", label: "企业联系人", placeholder: "请输入企业联系人" },
      {
        key: "contactsPhone",
        label: "联系人电话",
        required: true,
        pattern: /^\d+$/u,
        patternMessage: "请输入整数格式电话号",
        placeholder: "请输入联系人电话",
      },
      { key: "fileVOS", label: "附件图片", kind: "files" },
    ],
    loadReferences: async () => {
      const client = getFactoryManagementClient();
      const [typeRows, industryRows, scaleRows] = await Promise.all([
        client.listEnterpriseTypes(),
        client.listTypes("INDUSTRY"),
        client.listEnterpriseScales(),
      ]);
      enterpriseTypes.value = options(typeRows);
      industryTypes.value = options(industryRows);
      scales.value = options(scaleRows);
    },
    get: (id) => getFactoryManagementClient().getEnterprise(id),
    create: (body) => getFactoryManagementClient().createEnterprise(body),
    update: (id, body) => getFactoryManagementClient().updateEnterprise(id, body),
    fromRecord: (record) => ({ ...record, fileVOS: record.fileVOS ?? [] }),
    toPayload: (model) => ({
      name: model.name,
      corporation: model.corporation,
      type: model.type,
      industryTypeId: model.industryTypeId,
      scale: model.scale,
      contacts: model.contacts,
      contactsPhone: model.contactsPhone,
      fileIds: fileIds(model.fileVOS as never),
    }),
  };
});

export const RoomFormPage = createRecordFormPage<RoomRecord>(() => {
  const roomTypes = ref<SelectOption[]>([]);
  const areas = ref<CascaderOption[]>([]);
  const statuses = ref<SelectOption[]>([]);
  return {
    subject: "房间信息",
    initial: { name: "", areaId: [], fileVOS: [] },
    fields: [
      { key: "name", label: "房间名称", required: true, placeholder: "请输入房间名称" },
      {
        key: "roomTypeId",
        label: "房间类型",
        kind: "select",
        required: true,
        options: roomTypes,
        detailKey: "roomTypeName",
        placeholder: "请选择房间类型",
      },
      {
        key: "areaId",
        label: "所属区域",
        kind: "cascader",
        required: true,
        options: areas,
        detailKey: "areaName",
        placeholder: "请选择区域",
      },
      {
        key: "status",
        label: "使用状态",
        kind: "select",
        required: true,
        options: statuses,
        detailKey: "statusName",
        placeholder: "请选择使用状态",
      },
      { key: "floorage", label: "建筑面积", kind: "number", required: true, suffix: "㎡", placeholder: "请输入建筑面积" },
      { key: "floorageBilling", label: "计费面积", kind: "number", required: true, suffix: "㎡", placeholder: "请输入计费面积" },
      { key: "fileVOS", label: "附件图片", kind: "files" },
    ],
    loadReferences: async () => {
      const client = getFactoryManagementClient();
      const [typeRows, areaRows, statusRows] = await Promise.all([client.listTypes("ROOM"), client.listAreas(), client.listRoomStatuses()]);
      roomTypes.value = options(typeRows);
      areas.value = cascaderOptions(areaRows);
      statuses.value = options(statusRows);
    },
    get: (id) => getFactoryManagementClient().getRoom(id),
    create: (body) => getFactoryManagementClient().createRoom(body),
    update: (id, body) => getFactoryManagementClient().updateRoom(id, body),
    fromRecord: (record) => ({
      ...record,
      areaId: record.areaSequence ? record.areaSequence.split(",").filter(Boolean).toReversed() : record.areaId ? [record.areaId] : [],
      fileVOS: record.fileVOS ?? [],
    }),
    toPayload: (model) => {
      const areaPath = Array.isArray(model.areaId) ? model.areaId.map(String) : [];
      return {
        name: model.name,
        roomTypeId: model.roomTypeId,
        status: model.status,
        floorage: model.floorage,
        floorageBilling: model.floorageBilling,
        areaId: areaPath.at(-1),
        areaSequence: areaPath.toReversed().join(","),
        fileIds: fileIds(model.fileVOS as never),
      };
    },
  };
});

export const AppealFormPage = createRecordFormPage<AppealRecord>(() => {
  const appealTypes = ref<SelectOption[]>([]);
  const enterprises = ref<SelectOption[]>([]);
  return {
    subject: "企业诉求",
    initial: { name: "", username: "", description: "", measure: "", fileVOS: [] },
    fields: [
      { key: "name", label: "诉求名称", required: true, placeholder: "请输入诉求名称" },
      {
        key: "appealTypeId",
        label: "诉求类型",
        kind: "select",
        required: true,
        options: appealTypes,
        detailKey: "appealTypeName",
        placeholder: "请选择诉求类型",
      },
      { key: "time", label: "诉求时间", kind: "date", required: true, placeholder: "请选择诉求时间" },
      { key: "username", label: "反馈人员", required: true, placeholder: "请输入反馈人员" },
      {
        key: "enterpriseId",
        label: "企业名称",
        kind: "select",
        required: true,
        options: enterprises,
        detailKey: "enterpriseName",
        placeholder: "请选择企业名称",
      },
      { key: "description", label: "诉求描述", kind: "textarea", required: true, maxLength: 200, placeholder: "请输入诉求描述（限200字）" },
      { key: "measure", label: "解决措施", kind: "textarea", maxLength: 200, placeholder: "请输入解决措施（限200字）" },
      { key: "fileVOS", label: "附件图片", kind: "files" },
    ],
    loadReferences: async () => {
      const client = getFactoryManagementClient();
      const [typeRows, enterpriseRows] = await Promise.all([client.listTypes("APPEAL"), client.listEnterprises()]);
      appealTypes.value = options(typeRows);
      enterprises.value = options(enterpriseRows);
    },
    get: (id) => getFactoryManagementClient().getAppeal(id),
    create: (body) => getFactoryManagementClient().createAppeal(body),
    update: (id, body) => getFactoryManagementClient().updateAppeal(id, body),
    fromRecord: (record) => ({ ...record, fileVOS: record.fileVOS ?? [] }),
    toPayload: (model) => ({
      name: model.name,
      appealTypeId: model.appealTypeId,
      time: model.time,
      username: model.username,
      enterpriseId: model.enterpriseId,
      description: model.description,
      measure: model.measure,
      fileIds: fileIds(model.fileVOS as never),
    }),
  };
});

export const InterviewFormPage = createRecordFormPage<InterviewRecord>(() => {
  const enterprises = ref<SelectOption[]>([]);
  const interviewTypes = ref<SelectOption[]>([]);
  const appeals = ref<SelectOption[]>([]);
  return {
    subject: "企业走访",
    initial: { person: "", receptionPerson: "", recordContent: "", appealIds: [], fileVOS: [] },
    fields: [
      {
        key: "enterpriseId",
        label: "走访企业",
        kind: "select",
        required: true,
        options: enterprises,
        detailKey: "enterpriseName",
        placeholder: "请选择企业名称",
      },
      { key: "time", label: "走访时间", kind: "date", required: true, placeholder: "请选择走访时间" },
      {
        key: "interviewTypeId",
        label: "走访类型",
        kind: "select",
        options: interviewTypes,
        detailKey: "interviewTypeName",
        placeholder: "请选择走访类型",
      },
      { key: "person", label: "走访人员", maxLength: 15, placeholder: "请输入走访人员" },
      { key: "receptionPerson", label: "企业对接人", placeholder: "请输入企业对接人" },
      { key: "recordContent", label: "走访记录", kind: "textarea", maxLength: 200, placeholder: "请输入走访记录" },
      {
        key: "appealIds",
        label: "企业诉求",
        kind: "multi-select",
        options: appeals,
        detailKey: "appealNames",
        placeholder: "请选择企业诉求",
      },
      { key: "fileVOS", label: "附件图片", kind: "files" },
    ],
    loadReferences: async () => {
      const client = getFactoryManagementClient();
      const [enterpriseRows, typeRows, appealRows] = await Promise.all([
        client.listEnterprises(),
        client.listTypes("INTERVIEW"),
        client.listAppeals(),
      ]);
      enterprises.value = options(enterpriseRows);
      interviewTypes.value = options(typeRows);
      appeals.value = options(appealRows);
    },
    get: (id) => getFactoryManagementClient().getInterview(id),
    create: (body) => getFactoryManagementClient().createInterview(body),
    update: (id, body) => getFactoryManagementClient().updateInterview(id, body),
    fromRecord: (record) => ({
      ...record,
      appealIds: (record.appealListVOS ?? []).map((item) => item.id),
      appealNames: (record.appealListVOS ?? []).map((item) => item.name).join("、"),
      fileVOS: record.fileVOS ?? [],
    }),
    toPayload: (model) => ({
      enterpriseId: model.enterpriseId,
      time: model.time,
      interviewTypeId: model.interviewTypeId,
      person: model.person,
      receptionPerson: model.receptionPerson,
      recordContent: model.recordContent,
      appealIds: Array.isArray(model.appealIds) ? model.appealIds.join(",") : "",
      fileIds: fileIds(model.fileVOS as never),
    }),
  };
});

export const RentalFormPage = createRecordFormPage<RentalRecord>(() => {
  const enterprises = ref<SelectOption[]>([]);
  const rooms = ref<SelectOption[]>([]);
  return {
    subject: "租赁信息",
    initial: { rentRoomsId: [], fileVOS: [] },
    fields: [
      {
        key: "enterpriseId",
        label: "租赁企业",
        kind: "select",
        required: true,
        options: enterprises,
        detailKey: "enterpriseName",
        placeholder: "请选择租赁企业",
      },
      {
        key: "rentRoomsId",
        label: "租赁房间",
        kind: "multi-select",
        required: true,
        options: rooms,
        detailKey: "roomNames",
        placeholder: "请选择租赁房间",
      },
      { key: "signTime", label: "签订时间", kind: "date", required: true, placeholder: "请选择签订时间" },
      { key: "beginTime", label: "开始时间", kind: "date", required: true, editableModes: ["add"], placeholder: "请选择开始时间" },
      { key: "endTime", label: "结束时间", kind: "date", required: true, editableModes: ["add"], placeholder: "请选择结束时间" },
      { key: "fileVOS", label: "附件图片", kind: "files" },
    ],
    loadReferences: async () => {
      const client = getFactoryManagementClient();
      const [enterpriseRows, roomRows] = await Promise.all([client.listEnterprises(), client.listRooms()]);
      enterprises.value = options(enterpriseRows);
      rooms.value = options(roomRows);
    },
    get: (id) => getFactoryManagementClient().getRental(id),
    create: (body) => getFactoryManagementClient().createRental(body),
    update: (id, body) => getFactoryManagementClient().updateRental(id, body),
    fromRecord: (record) => ({
      ...record,
      rentRoomsId: (record.rentRooms ?? []).map((item) => item.roomId),
      fileVOS: record.fileVOS ?? [],
    }),
    toPayload: (model, mode) => {
      const roomIds = Array.isArray(model.rentRoomsId) ? model.rentRoomsId.map(String) : [];
      const roomMap = new Map(rooms.value.map((item) => [item.value, item.label]));
      if (mode === "add" && model.beginTime && model.endTime && String(model.beginTime) > String(model.endTime)) {
        throw new Error("开始时间不能大于结束时间");
      }
      return {
        enterpriseId: model.enterpriseId,
        signTime: model.signTime,
        beginTime: model.beginTime,
        endTime: model.endTime,
        rentRoomsId: roomIds,
        rentRooms: roomIds.map((roomId) => ({ roomId, roomName: roomMap.get(roomId) ?? "" })),
        fileIds: fileIds(model.fileVOS as never),
      };
    },
  };
});
