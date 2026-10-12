export const checkedDeviceColumns = [
  {
    dataIndex: "",
    title: "序号",
    customRender: ({ index }: { index: number }): number => index + 1,
  },
  {
    dataIndex: "deviceName",
    title: "设备名称",
  },
  {
    dataIndex: "deviceProdCategoryName",
    title: "产品品类",
  },
  {
    dataIndex: "deviceProdName",
    title: "产品名称",
  },
  {
    dataIndex: "areaName",
    title: "所属区域",
  },
  {
    dataIndex: "action",
    title: "操作",
    slots: {
      customRender: "action",
    },
  },
];
