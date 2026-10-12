import { Button, Form, FormItem, Input, PageLayout, Select, Space, Textarea, Upload, message } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
  name: "LineLossDrawingManagementEdit",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(false);
    const saving = ref(false);
    const form = reactive({
      name: "",
      type: undefined as string | undefined,
      description: "",
      fileList: [] as Array<{ uid: string; name: string; status?: string }>,
    });
    const mode = computed(() => String(route.query.type ?? "create"));
    const readonly = computed(() => mode.value === "info");
    const title = computed(
      () => ({ info: "电气图纸-详情", edit: "电气图纸-编辑", create: "电气图纸-新增" })[mode.value] ?? "电气图纸-新增",
    );

    const loadDetail = async (): Promise<void> => {
      const id = String(route.query.id ?? "");
      if (!id) {
        return;
      }
      loading.value = true;
      try {
        // 旧仓详情仍为本地 mock；保留字段回填形态，避免详情态空白
        Object.assign(form, {
          name: "蔬菜A区电路布局图",
          type: "1",
          description: "",
          fileList: [],
        });
      } finally {
        loading.value = false;
      }
    };

    const save = async (): Promise<void> => {
      if (saving.value || readonly.value) {
        return;
      }
      if (!form.name.trim()) {
        message.warning("请输入图纸名称");
        return;
      }
      if (!form.type) {
        message.warning("请选择图纸类型");
        return;
      }
      if (form.fileList.length === 0) {
        message.warning("请上传附件");
        return;
      }
      saving.value = true;
      try {
        // 旧仓保存亦为 mock；保持成功回退，待图纸接口开放后替换为 Client
        message.success("保存成功");
        router.back();
      } finally {
        saving.value = false;
      }
    };

    onMounted(() => {
      void loadDetail();
    });

    return () => (
      <PageLayout
        title={title.value}
        showFooter
        v-slots={{
          "layout-content": () => (
            <section class="line-loss-section">
              <h3>基础信息</h3>
              <Form model={form} labelCol={{ style: { width: "100px" } }} wrapperCol={{ span: 12 }}>
                <FormItem label="图纸名称" required>
                  <Input v-model:value={form.name} disabled={readonly.value || loading.value} placeholder="请输入图纸名称" />
                </FormItem>
                <FormItem label="图纸类型" required>
                  <Select
                    v-model:value={form.type}
                    disabled={readonly.value || loading.value}
                    placeholder="请选择图纸类型"
                    options={[
                      { label: "文件类型1", value: "1" },
                      { label: "文件类型2", value: "2" },
                    ]}
                  />
                </FormItem>
                <FormItem label="备注">
                  <Textarea
                    v-model:value={form.description}
                    disabled={readonly.value || loading.value}
                    placeholder="请输入备注"
                    maxlength={200}
                    showCount
                    rows={4}
                  />
                </FormItem>
                <FormItem label="附件" required>
                  <Upload
                    v-model:fileList={form.fileList}
                    disabled={readonly.value || loading.value}
                    beforeUpload={() => false}
                    maxCount={1}
                  >
                    <Button disabled={readonly.value || loading.value}>选择附件</Button>
                  </Upload>
                  <p class="line-loss-muted">支持上传文件最大为20MB，只能上传一个文件</p>
                </FormItem>
              </Form>
            </section>
          ),
          "footer-page": () => (
            <Space>
              <Button onClick={() => router.back()}>返回</Button>
              {!readonly.value && (
                <Button type="primary" loading={saving.value} onClick={() => void save()}>
                  保存
                </Button>
              )}
            </Space>
          ),
        }}
      />
    );
  },
});
