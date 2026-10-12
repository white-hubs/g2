import { defineComponent, reactive } from "vue";

import { Button, Form, FormItem, Input, PageLayout, Space, Tabs, TabPane } from "../pc-ui-runtime";

export const LinkageReservePlanPage = defineComponent({
  name: "LinkageReservePlanPage",
  setup() {
    const basics = reactive({ name: "", remark: "" });
    return () => <PageLayout title="预案设置" v-slots={{
      "layout-content": () => <Tabs activeKey="plan"><TabPane key="plan" tab="联动预案">
        <Form layout="vertical"><FormItem label="预案名称"><Input value={basics.name} placeholder="请输入预案名称" onUpdate:value={(value: string) => basics.name = value} /></FormItem>
          <FormItem label="备注"><Input value={basics.remark} maxlength={20} placeholder="请输入备注，不超过20字" onUpdate:value={(value: string) => basics.remark = value} /></FormItem>
        </Form>
        <p>监控、设备和消息动作配置尚需按旧版联动预案组件逐项迁移。</p>
      </TabPane></Tabs>,
      "footer-page": () => <Space><Button>返回</Button></Space>,
    }} />;
  },
});
