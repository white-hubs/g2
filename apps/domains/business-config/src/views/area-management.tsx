import type { AreaFile, BusinessArea, BusinessAreaInput } from "@g2-contract/business-config";
import type { UploadRequestOption } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getBusinessConfigClient } from "../domain-context";
import { Button, Form, FormItem, Input, InputNumber, Modal, PageLayout, PopConfirm, RadioGroup, Space, Text, Upload, message, usePcForm, usePcTable } from "../pc-ui-runtime";

interface AreaDraft {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: number;
  areaManagerIds: string[];
  areaManagerName: string[];
  aliasName: string;
  visualizationAreaType?: string;
  introduce: string;
  floorPlanFileId: string | null;
  coordinateAxis: Record<string, { x?: number; y?: number }>;
  pictureFiles: AreaFile[];
  videoFiles: AreaFile[];
}

const emptyDraft = (): AreaDraft => ({
  id: "", name: "", code: "", parentId: null, level: 1, areaManagerIds: [], areaManagerName: [], aliasName: "", visualizationAreaType: undefined,
  introduce: "", floorPlanFileId: null,
  coordinateAxis: { bottomLeft: { x: 0, y: 0 }, topRight: { x: undefined, y: undefined } },
  pictureFiles: [], videoFiles: [],
});
const errorText = (error: unknown): string => error instanceof Error ? error.message : "请求失败";
const valuesOf = (value: AreaFile[] | string | null | undefined): AreaFile[] =>
  Array.isArray(value) ? value : typeof value === "string" ? value.split(",").filter(Boolean).map((id) => ({ id })) : [];
const sceneCode = "MDATA::SPACE_LIST";

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const AreaManagementPage = defineComponent({
  name: "BusinessConfigAreaManagementPage",
  setup() {
    const keyword = ref("");
    const showThreeVisualization = ref(false);
    const modalOpen = ref(false);
    const modalTitle = ref("新增区域");
    const saving = ref(false);
    const loadingDetail = ref(false);
    const uploadingPlan = ref(false);
    const uploadingPictures = ref(false);
    const uploadingVideos = ref(false);
    const draft = reactive<AreaDraft>(emptyDraft());
    const importOpen = ref(false);
    const importBusy = ref(false);
    const importFile = ref<File>();
    const importResult = ref<{ success: number; fail: number; errors: string[] }>();
    const draggedAreaId = ref<string>();

    const [PcTable, tableApi] = usePcTable({
      tableCode: "BUSINESS_CONFIG_AREA",
      rowKey: "id",
      pagination: false,
      childrenColumnName: "children",
      autoFetch: false,
      customRow: (record) => ({
        style: { cursor: "move" },
        onMouseenter: (event: Event) => { (event.currentTarget as HTMLElement).draggable = true; },
        onDragstart: (event: DragEvent) => { event.stopPropagation(); draggedAreaId.value = (record as BusinessArea).id; },
        onDragover: (event: DragEvent) => event.preventDefault(),
        onDrop: (event: DragEvent) => {
          event.preventDefault(); event.stopPropagation();
          const target = record as BusinessArea;
          if (!draggedAreaId.value || draggedAreaId.value === target.id) return;
          const source = findArea(tableApi.getDataSource() as BusinessArea[] ?? [], draggedAreaId.value);
          if (!source || source.parentId !== target.parentId) return;
          const moved = moveArea(tableApi.getDataSource() as BusinessArea[] ?? [], draggedAreaId.value, target.id);
          if (moved) {
            tableApi.setDataSource(moved);
            void getBusinessConfigClient().saveBusinessAreaSort(moved)
              .then(() => message.success("排序已保存"))
              .catch((error: unknown) => message.error(errorText(error)))
              .finally(() => tableApi.query());
          }
          draggedAreaId.value = undefined;
        },
      }),
      fetchApi: async () => {
        try {
          const records = await getBusinessConfigClient().listBusinessAreaTree({ keyword: keyword.value.trim() || undefined });
          const term = keyword.value.trim().toLocaleLowerCase();
          const filterTree = (areas: BusinessArea[]): BusinessArea[] => areas.flatMap((area) => {
            if (`${area.name} ${area.code}`.toLocaleLowerCase().includes(term)) return [area];
            const children = area.children ? filterTree(area.children) : [];
            return children.length ? [{ ...area, children }] : [];
          });
          const visibleRecords = term ? filterTree(records) : records;
          return { records: visibleRecords, total: visibleRecords.length, pages: 1 };
        } catch (error) {
          message.error(errorText(error));
          return { records: [], total: 0, pages: 0 };
        }
      },
      columns: [
        { title: "区域名称", dataIndex: "name", ellipsis: true },
        { title: "区域编号", dataIndex: "code", ellipsis: true },
        ...(showThreeVisualization.value ? [
          { title: "模型区域", dataIndex: "aliasName", ellipsis: true },
          { title: "区域类型", dataIndex: "visualizationAreaType", customRender: ({ text }: { text: unknown }) => ({ BUILDING: "楼栋", FLOOR: "楼层", OTHER: "其他" }[String(text)] ?? "--") },
        ] : []),
        {
          title: "操作", dataIndex: "action", width: 220, fixed: "right",
          customRender: ({ record }) => {
            const area = record as BusinessArea;
            return <Space size={4}>
              {area.level < 4 && <Button type="link" size="small" onClick={() => openCreate(area)}>新增下级</Button>}
              <Button type="link" size="small" onClick={() => void openEdit(area)}>编辑</Button>
              <PopConfirm title="确认删除当前区域？" okText="确定" cancelText="取消" onConfirm={() => void remove(area)}>
                <Button type="link" size="small" danger disabled={Boolean(area.children?.length)}>删除</Button>
              </PopConfirm>
            </Space>;
          },
        },
      ],
    });

    const [PcForm] = usePcForm({
      layout: "inline", cache: false, actionsInline: true, submitText: "查询", resetText: "重置",
      schema: [{ component: "Input", fieldName: "keyword", label: "", defaultValue: "", componentProps: { allowClear: true, placeholder: "区域名称" } }],
      handleSubmit(values) { keyword.value = String(values.keyword ?? "").trim(); tableApi.query(); },
      handleReset() { keyword.value = ""; tableApi.query(); },
    });

    function openCreate(parent?: BusinessArea): void {
      Object.assign(draft, emptyDraft(), { parentId: parent?.id ?? null, level: (parent?.level ?? 0) + 1 });
      modalTitle.value = parent ? `新增下级-${parent.name}` : "新增区域";
      modalOpen.value = true;
    }

    async function openEdit(area: BusinessArea): Promise<void> {
      modalTitle.value = "编辑区域";
      modalOpen.value = true;
      loadingDetail.value = true;
      try {
        const detail = await getBusinessConfigClient().getBusinessArea(area.id);
        const ext = detail.areaExtend ?? {};
        const pictures = valuesOf(ext.pictureFiles);
        const videos = valuesOf(ext.videoFiles);
        const floorId = ext.floorPlanFileId ?? ext.floorPlanFile?.id ?? null;
        Object.assign(draft, emptyDraft(), {
          ...detail,
          id: detail.id,
          level: detail.level ?? 1,
          areaManagerIds: detail.areaManagerIds ?? [],
          areaManagerName: detail.areaManagerName ?? [],
          name: detail.name ?? "",
          code: detail.code ?? "",
          aliasName: detail.aliasName ?? "",
          visualizationAreaType: detail.visualizationAreaType ?? undefined,
          introduce: ext.introduce ?? "",
          pictureFiles: await Promise.all(pictures.map((file) => file.path ? file : getBusinessConfigClient().getBusinessConfigFile(file.id))),
          videoFiles: await Promise.all(videos.map((file) => file.path ? file : getBusinessConfigClient().getBusinessConfigFile(file.id))),
          floorPlanFileId: floorId == null ? null : String(floorId),
        });
        if (floorId && !ext.floorPlanFile?.path) {
          const floorPlan = await getBusinessConfigClient().getBusinessConfigFile(String(floorId));
          draft.floorPlanFileId = String(floorId);
          draft.coordinateAxis = parseCoordinates(ext.coordinateAxis);
          draft.pictureFiles = draft.pictureFiles;
          // 文件详情用于预览，坐标数据仍以旧接口原值为准。
          (draft as AreaDraft & { floorPlanFile?: AreaFile }).floorPlanFile = floorPlan;
        } else {
          draft.coordinateAxis = parseCoordinates(ext.coordinateAxis);
          (draft as AreaDraft & { floorPlanFile?: AreaFile }).floorPlanFile = ext.floorPlanFile ?? undefined;
        }
      } catch (error) {
        modalOpen.value = false;
        message.error(errorText(error));
      } finally {
        loadingDetail.value = false;
      }
    }

    function parseCoordinates(value?: string | null): AreaDraft["coordinateAxis"] {
      const fallback = { bottomLeft: { x: 0, y: 0 }, topRight: { x: undefined, y: undefined } };
      if (!value) return fallback;
      try {
        const parsed = JSON.parse(value) as AreaDraft["coordinateAxis"];
        return { bottomLeft: parsed.bottomLeft ?? fallback.bottomLeft, topRight: parsed.topRight ?? fallback.topRight };
      } catch {
        message.warning("该区域坐标配置格式异常，已按空坐标展示");
        return fallback;
      }
    }

    async function uploadSingle(options: UploadRequestOption, type: "floor" | "picture" | "video"): Promise<void> {
      const file = options.file as File;
      const extension = file.name.split(".").at(-1)?.toLocaleLowerCase();
      const allowedExtensions = type === "video" ? ["mp4"] : ["jpg", "jpeg", "png", "webp"];
      const maximumBytes = type === "floor" ? 20 * 1024 * 1024 : 500 * 1024 * 1024;
      if (!extension || !allowedExtensions.includes(extension)) {
        message.warning(type === "video" ? "仅支持 MP4 视频" : "仅支持 JPG、PNG、WebP 图片");
        options.onError?.(new Error("文件类型不支持"));
        return;
      }
      if (file.size > maximumBytes) {
        message.warning(type === "floor" ? "平面图不能超过 20 MB" : "附件不能超过 500 MB");
        options.onError?.(new Error("文件超过大小限制"));
        return;
      }
      const setBusy = type === "floor" ? uploadingPlan : type === "picture" ? uploadingPictures : uploadingVideos;
      if (setBusy.value) return;
      setBusy.value = true;
      try {
        const uploaded = await getBusinessConfigClient().uploadBusinessConfigFile({
          file: options.file as File, sceneCode, useTemporary: type === "floor",
        });
        if (type === "floor") {
          draft.floorPlanFileId = uploaded.id;
          (draft as AreaDraft & { floorPlanFile?: AreaFile }).floorPlanFile = uploaded;
        } else if (type === "picture") draft.pictureFiles.push(uploaded);
        else draft.videoFiles.push(uploaded);
        options.onSuccess?.(uploaded);
        message.success("上传成功");
      } catch (error) {
        options.onError?.(error instanceof Error ? error : new Error("上传失败"));
        message.error(errorText(error));
      } finally {
        setBusy.value = false;
      }
    }

    function dropFile(target: "pictureFiles" | "videoFiles", index: number): void {
      draft[target].splice(index, 1);
    }

    function validCoordinates(): boolean {
      if (!draft.floorPlanFileId && !coordinateJson()) return true;
      const { bottomLeft, topRight } = draft.coordinateAxis;
      if ([bottomLeft.x, bottomLeft.y, topRight.x, topRight.y].some((value) => typeof value !== "number" || !Number.isFinite(value))) {
        message.warning("请填写平面图左下角与右上角的完整坐标");
        return false;
      }
      if ((topRight.x ?? 0) <= (bottomLeft.x ?? 0) || (topRight.y ?? 0) <= (bottomLeft.y ?? 0)) {
        message.warning("右上角 X、Y 坐标必须大于左下角坐标");
        return false;
      }
      return true;
    }

    function coordinateJson(): string | null {
      const coords = draft.coordinateAxis;
      const hasValue = Boolean(draft.floorPlanFileId) || coords.topRight.x !== undefined || coords.topRight.y !== undefined;
      return hasValue ? JSON.stringify(coords) : null;
    }

    function findArea(items: BusinessArea[], id: string): BusinessArea | undefined {
      for (const item of items) {
        if (item.id === id) return item;
        const child = item.children ? findArea(item.children, id) : undefined;
        if (child) return child;
      }
      return undefined;
    }

    function findParent(items: BusinessArea[], id: string): BusinessArea[] | undefined {
      for (const item of items) {
        if (item.children?.some((child) => child.id === id)) return item.children;
        const nested = item.children ? findParent(item.children, id) : undefined;
        if (nested) return nested;
      }
      return undefined;
    }

    function moveArea(items: BusinessArea[], sourceId: string, targetId: string): BusinessArea[] | undefined {
      const parent = findParent(items, sourceId);
      if (parent !== findParent(items, targetId)) return undefined;
      const siblings = parent ?? items;
      const sourceIndex = siblings.findIndex((item) => item.id === sourceId);
      const targetIndex = siblings.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return undefined;
      const next = [...siblings];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved!);
      if (!parent) return next;
      const replace = (nodes: BusinessArea[]): BusinessArea[] => nodes.map((node) => node.children?.some((child) => child.id === sourceId)
        ? { ...node, children: next }
        : { ...node, children: node.children ? replace(node.children) : undefined });
      return replace(items);
    }

    async function saveArea(): Promise<void> {
      if (saving.value || loadingDetail.value || uploadingPlan.value || uploadingPictures.value || uploadingVideos.value) return;
      if (!draft.name.trim() || !draft.code.trim()) {
        message.warning(!draft.name.trim() ? "请输入区域名称" : "请输入区域编号");
        return;
      }
      if (!validCoordinates()) return;
      saving.value = true;
      try {
        const input: BusinessAreaInput = {
          ...(draft.id ? { id: draft.id } : {}),
          name: draft.name.trim(), code: draft.code.trim(), parentId: draft.parentId, level: draft.level,
          areaManagerIds: draft.areaManagerIds, areaManagerName: draft.areaManagerName,
          aliasName: draft.aliasName || undefined, visualizationAreaType: draft.visualizationAreaType,
          areaExtend: {
            introduce: draft.introduce,
            pictureFiles: draft.pictureFiles.map((file) => file.id),
            videoFiles: draft.videoFiles.map((file) => file.id),
            floorPlanFileId: draft.floorPlanFileId,
            coordinateAxis: coordinateJson(),
          },
        };
        if (input.id) await getBusinessConfigClient().updateBusinessArea(input);
        else await getBusinessConfigClient().createBusinessArea(input);
        message.success("保存成功");
        modalOpen.value = false;
        tableApi.query();
      } catch (error) {
        message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    }

    async function remove(area: BusinessArea): Promise<void> {
      if (area.children?.length) {
        message.warning("当前区域有下属区域，无法删除");
        return;
      }
      try {
        await getBusinessConfigClient().deleteBusinessArea(area.id);
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(errorText(error));
      }
    }

    async function exportAreas(): Promise<void> {
      try {
        const blob = await getBusinessConfigClient().exportBusinessArea({ keyword: keyword.value.trim() || undefined });
        downloadBlob(blob, "区域管理.xlsx");
      } catch (error) { message.error(errorText(error)); }
    }

    async function exportTemplate(): Promise<void> {
      try { downloadBlob(await getBusinessConfigClient().exportBusinessAreaTemplate(), "区域模版.xlsx"); }
      catch (error) { message.error(errorText(error)); }
    }

    async function importAreas(): Promise<void> {
      if (!importFile.value) { message.warning("请先选择区域导入文件"); return; }
      importBusy.value = true;
      try {
        const result = await getBusinessConfigClient().importBusinessArea(importFile.value);
        importResult.value = { success: Number(result.success ?? 0), fail: Number(result.fail ?? result.errorMsg?.length ?? 0), errors: result.errorMsg ?? [] };
        tableApi.query();
      } catch (error) { message.error(errorText(error)); }
      finally { importBusy.value = false; }
    }

    onMounted(async () => {
      tableApi.query();
      try {
        const terminals = await getBusinessConfigClient().getUserTerminals();
        showThreeVisualization.value = terminals.some((terminal) => terminal.code === "three-dimensional-visualization");
      } catch (error) { message.error(errorText(error)); }
    });

    return () => <PageLayout title="区域管理" showFooter={false} v-slots={{
      "layout-header": () => <Space>
        <Button disabled={!tableApi.getDataSource()?.length} onClick={() => void exportAreas()}>导出</Button>
        <Button onClick={() => { importResult.value = undefined; importFile.value = undefined; importOpen.value = true; }}>导入</Button>
        <Button type="primary" onClick={() => openCreate()}>新增</Button>
      </Space>,
      "layout-content": () => <>
        <PcForm />
        <PcTable />
        <Modal open={modalOpen.value} title={modalTitle.value} width={900} okText="保存" cancelText="取消" confirmLoading={saving.value}
          onOk={() => void saveArea()} onCancel={() => { if (!saving.value) modalOpen.value = false; }}>
          <div aria-busy={loadingDetail.value}>
            <Form layout="vertical">
              <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) minmax(240px,2fr)", gap: "0 16px" }}>
                <FormItem label="区域名称" required><Input value={draft.name} placeholder="请输入区域名称" onUpdate:value={(v: string) => draft.name = v} /></FormItem>
                <FormItem label="区域介绍"><Text value={draft.introduce} maxlength={300} showCount placeholder="请输入区域介绍" onUpdate:value={(v: string) => draft.introduce = v} /></FormItem>
                {showThreeVisualization.value && <>
                  <FormItem label="模型区域"><Input value={draft.aliasName} placeholder="请输入模型区域" onUpdate:value={(v: string) => draft.aliasName = v} /></FormItem>
                  <FormItem label="区域类型"><RadioGroup value={draft.visualizationAreaType} options={[
                    { label: "楼栋", value: "BUILDING" }, { label: "楼层", value: "FLOOR" }, { label: "其他", value: "OTHER" },
                  ]} onUpdate:value={(v: string) => draft.visualizationAreaType = v} /></FormItem>
                </>}
              </div>
              <FormItem label="区域编号" required><Input value={draft.code} placeholder="请输入区域编号" onUpdate:value={(v: string) => draft.code = v} /></FormItem>
              <FormItem label="平面图与坐标轴">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <Upload accept=".png,.jpg,.jpeg,.webp" showUploadList={false} customRequest={(option: UploadRequestOption) => void uploadSingle(option, "floor")}>
                    <Button loading={uploadingPlan.value}>{draft.floorPlanFileId ? "更换平面图" : "上传平面图"}</Button>
                  </Upload>
                  {(draft as AreaDraft & { floorPlanFile?: AreaFile }).floorPlanFile?.path && <a href={(draft as AreaDraft & { floorPlanFile?: AreaFile }).floorPlanFile?.path ?? ""} target="_blank">{(draft as AreaDraft & { floorPlanFile?: AreaFile }).floorPlanFile?.name ?? "查看平面图"}</a>}
                  {draft.floorPlanFileId && <Button type="link" danger onClick={() => { draft.floorPlanFileId = null; (draft as AreaDraft & { floorPlanFile?: AreaFile }).floorPlanFile = undefined; }}>移除</Button>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(80px,1fr))", gap: "8px", marginTop: "12px" }}>
                  <span>左下角 X</span><InputNumber value={draft.coordinateAxis.bottomLeft.x} onUpdate:value={(v: string | number | undefined) => draft.coordinateAxis.bottomLeft.x = v === undefined ? undefined : Number(v)} />
                  <span>左下角 Y</span><InputNumber value={draft.coordinateAxis.bottomLeft.y} onUpdate:value={(v: string | number | undefined) => draft.coordinateAxis.bottomLeft.y = v === undefined ? undefined : Number(v)} />
                  <span>右上角 X</span><InputNumber value={draft.coordinateAxis.topRight.x} onUpdate:value={(v: string | number | undefined) => draft.coordinateAxis.topRight.x = v === undefined ? undefined : Number(v)} />
                  <span>右上角 Y</span><InputNumber value={draft.coordinateAxis.topRight.y} onUpdate:value={(v: string | number | undefined) => draft.coordinateAxis.topRight.y = v === undefined ? undefined : Number(v)} />
                </div>
              </FormItem>
              <FormItem label="区域图片">
                <Upload accept=".jpg,.jpeg,.png,.webp" multiple maxCount={10} showUploadList={false} customRequest={(option: UploadRequestOption) => void uploadSingle(option, "picture")}>
                  <Button loading={uploadingPictures.value}>上传图片</Button>
                </Upload>
                <Space wrap>{draft.pictureFiles.map((file, index) => <span key={`${file.id}-${index}`}>{file.name || file.id}<Button type="link" danger onClick={() => dropFile("pictureFiles", index)}>移除</Button></span>)}</Space>
              </FormItem>
              <FormItem label="视频附件">
                <Upload accept=".mp4" maxCount={1} showUploadList={false} customRequest={(option: UploadRequestOption) => void uploadSingle(option, "video")}>
                  <Button loading={uploadingVideos.value}>上传视频</Button>
                </Upload>
                <Space wrap>{draft.videoFiles.map((file, index) => <span key={`${file.id}-${index}`}>{file.name || file.id}<Button type="link" danger onClick={() => dropFile("videoFiles", index)}>移除</Button></span>)}</Space>
              </FormItem>
            </Form>
          </div>
        </Modal>
        <Modal open={importOpen.value} title="导入区域" width={800} okText={importResult.value ? "确定" : "下一步"} cancelText="取消"
          confirmLoading={importBusy.value} onOk={() => importResult.value ? (importOpen.value = false) : void importAreas()} onCancel={() => { if (!importBusy.value) importOpen.value = false; }}>
          {!importResult.value ? <div>
            <p>下载<Button type="link" onClick={() => void exportTemplate()}>区域模版</Button>，完善后选择 .xls 或 .xlsx 文件上传。</p>
            <Upload accept=".xls,.xlsx" maxCount={1} showUploadList={false} beforeUpload={(file: File) => {
              if (file && file.size > 300 * 1024 * 1024) { message.warning("附件上传大小不能超过300MB"); importFile.value = undefined; return false; }
              importFile.value = file;
              return false;
            }}><Button>选择文件</Button></Upload>
            {importFile.value && <p>{importFile.value.name}</p>}
          </div> : <div>
            <p style={{ textAlign: "center" }}>导入成功 {importResult.value.success} 条，失败 {importResult.value.fail} 条</p>
            {importResult.value.errors.map((error, index) => <p key={index}>{index + 1}. {error}</p>)}
          </div>}
        </Modal>
      </>,
    }} />;
  },
});
