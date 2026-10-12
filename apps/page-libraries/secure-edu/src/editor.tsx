import type { EduResource, QuestionOption } from "@g2-contract/secure-edu";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { CONFIG } from "./config";
import { getClient, getFiles, loadUi, useNavigation } from "./context";
import { COURSEWARE_SCENE, uploadCourseware } from "./files";
import {
  EXAM_TYPES,
  MODES,
  QUESTION_TYPES,
  type Row,
  TYPES,
  courseware,
  dateValue,
  defaultOptions,
  errorText,
  number,
  object,
  options,
  parseQuestion,
  person,
  rows,
  saveCommand,
  taskPeople,
  text,
  validateQuestion,
} from "./model";
import { Picker } from "./picker";
import { QuestionField } from "./question-field";

import styles from "./styles.module.css";
const {
  Button,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  PageLayout,
  RadioGroup,
  Select,
  Space,
  Spin,
  Switch,
  Textarea,
  Upload,
  message,
  dayjs,
} = await loadUi();
interface Category {
  title: string;
  sort: number;
  examQuestions: Row[];
}
interface RuleItem {
  id?: string;
  ruleId?: string;
  themeIds: string[];
  examQuestionType: string;
  extractCount?: number;
  perScore?: number;
}
export function createEditor(slug: string) {
  const resource = slug as EduResource;
  const config = CONFIG[slug];
  return defineComponent({
    name: `SecureEdu${slug}Editor`,
    setup() {
      const route = useRoute();
      const navigation = useNavigation();
      const BASE = navigation.basePath;

      const id = text(route.query.id);
      const readOnly = route.query.action === "detail" || route.path.endsWith("exam-paper-detail");
      const loading = ref(false);
      const saving = ref(false);
      const loaded = ref(!id);
      const themes = ref<Row[]>([]);
      const exams = ref<Row[]>([]);
      const rules = ref<Row[]>([]);
      const state = reactive<Record<string, unknown>>({
        name: "",
        themeId: undefined,
        remark: "",
        cultivateTarget: "MERCHANT",
        cultivateMode: "OFFLINE",
        lateStatus: false,
        examTaskType: "STAFF_EXAM",
        examPaperMode: "UNIFIED",
        retake: false,
        timed: false,
        questionType: "SINGLE_CHOICE",
        score: 1,
        ruleName: "",
        description: "",
      });
      const people = ref<Row[]>([]);
      const charge = ref<Row[]>([]);
      const coursewares = ref<Row[]>([]);
      const papers = ref<Row[]>([]);
      const categories = ref<Category[]>([]);
      const ruleItems = ref<RuleItem[]>(QUESTION_TYPES.map((item) => ({ themeIds: [], examQuestionType: item.value })));
      const choices = ref<QuestionOption[]>(defaultOptions("SINGLE_CHOICE"));
      const file = ref<Record<string, unknown>>({});
      const uploading = ref(false);
      const questionOpen = ref(false);
      const editingQuestion = reactive<Record<string, unknown>>({});
      const editingChoices = ref<QuestionOption[]>([]);
      let questionTarget: { category: Category; index: number } | undefined;
      const headTask = computed(() => state.sourceCode === "HEADQUARTERS");
      const disabled = computed(() => readOnly || headTask.value);
      const training = slug === "training-task";
      const task = training || slug === "exam-task";
      const usersKey = training ? "cultivateUsers" : "examUsers";
      const staff = computed(() => state[training ? "cultivateTarget" : "examTaskType"] === (training ? "STAFF" : "STAFF_EXAM"));
      const total = computed(() =>
        slug === "paper-question-rule"
          ? ruleItems.value.reduce((sum, item) => sum + number(item.extractCount) * number(item.perScore), 0)
          : categories.value.reduce(
              (sum, category) => sum + category.examQuestions.reduce((result, item) => result + number(item.score), 0),
              0,
            ),
      );
      const back = () =>
        void navigation.push(text(route.query.returnPath) || `${BASE}/${route.path.endsWith("exam-paper-detail") ? "exam-task" : slug}`);
      async function load() {
        loading.value = true;
        try {
          themes.value = await getClient().themes();
          if (training) {
            exams.value = (await getClient().page("exam-task", { pageNumber: 1, pageSize: 1000 })).records;
          }
          if (slug === "exam-task") {
            rules.value = await getClient().rules();
          }
          if (id) {
            const paperId = readOnly ? text(route.query.examPaperId) : "";
            const result = paperId
              ? await getClient().taskPaper(id, paperId, navigation.headquarters)
              : await getClient().detail(resource, id);
            Object.assign(state, result);
            for (const key of ["cultivateStartTime", "cultivateEndTime", "examStartTime", "examEndTime"]) {
              if (result[key]) {
                state[key] = dayjs(dateValue(result[key])).format("YYYY-MM-DD HH:mm:ss");
              }
            }
            people.value = rows(result[usersKey]).map((entry) => person(entry));
            charge.value = result.chargeUserId ? [{ id: text(result.chargeUserId), name: text(result.chargeUserName) }] : [];
            coursewares.value = rows(result.cultivateCoursewares).map((item, index) => courseware(item, index));
            papers.value = rows(result.examPapers).map((item) => ({
              id: text(item.ruleId || item.id),
              name: text(item.ruleName || item.name),
            }));
            file.value = object(result.file);
            if (result.fileId && !file.value.id) {
              file.value = { ...file.value, id: result.fileId };
            }
            if (slug === "question") {
              choices.value = parseQuestion(result.questionContent, text(result.questionType));
            }
            categories.value = rows(result.questionCategories).map((category, i) => ({
              title: text(category.title),
              sort: i + 1,
              examQuestions: rows(category.examQuestions).map((question, j) => ({
                id: text(question.id ?? `${i}-${j}`),
                name: question.name,
                questionType: question.questionType,
                questionContent: question.questionContent,
                themeId: question.themeId,
                themeName: question.themeName,
                answerAnalysis: question.answerAnalysis,
                score: question.score,
                sort: j + 1,
              })),
            }));
            if (slug === "paper-question-rule") {
              const items = rows(result.items);
              ruleItems.value = QUESTION_TYPES.map((type) => {
                const item = items.find((entry) => entry.examQuestionType === type.value);
                return {
                  id: text(item?.id) || undefined,
                  ruleId: text(item?.ruleId) || undefined,
                  examQuestionType: type.value,
                  themeIds: text(item?.themeKeywords).split(",").filter(Boolean),
                  extractCount: item?.extractCount === undefined ? undefined : number(item.extractCount),
                  perScore: item?.perScore === undefined ? undefined : number(item.perScore),
                };
              });
            }
          }
          loaded.value = true;
        } catch (error) {
          message.error(errorText(error));
        } finally {
          loading.value = false;
        }
      }
      const requireField = (key: string, label: string) => {
        if (state[key] === undefined || state[key] === null || state[key] === "") {
          throw new Error(`请填写${label}`);
        }
      };
      async function save() {
        if (saving.value || uploading.value || !loaded.value) {
          return;
        }
        try {
          const payload = { ...state };
          if (task) {
            if (!headTask.value) {
              for (const [key, label] of [
                ["name", "任务名称"],
                ["themeId", "主题"],
                [training ? "cultivateStartTime" : "examStartTime", "开始时间"],
                [training ? "cultivateEndTime" : "examEndTime", "结束时间"],
              ]) {
                requireField(key, label);
              }
              if (!charge.value[0]) {
                throw new Error("请选择负责人");
              }
              const start = text(state[training ? "cultivateStartTime" : "examStartTime"]);
              const end = text(state[training ? "cultivateEndTime" : "examEndTime"]);
              if (end <= start) {
                throw new Error("结束时间必须晚于开始时间");
              }
              if (training && state.cultivateMode === "OFFLINE") {
                requireField("cultivateAddress", "培训地点");
              }
              if (!training && papers.value.length === 0) {
                throw new Error("请选择试卷或随机考题规则");
              }
              if (!training && state.timed && number(state.examDuration) <= 0) {
                throw new Error("请输入考试时长");
              }
              if (!training && state.retake && number(state.retakeNumber) <= 0) {
                throw new Error("请输入复考次数");
              }
            }
            if (staff.value && people.value.length === 0) {
              throw new Error("请选择参加人员");
            }
            if (!staff.value && number(state[training ? "cultivateUserNumber" : "examUserNumber"]) <= 0) {
              throw new Error("请输入参加人数");
            }
            payload[usersKey] = taskPeople(people.value, training);
            payload[training ? "cultivateUserNumber" : "examUserNumber"] = staff.value
              ? people.value.length
              : state[training ? "cultivateUserNumber" : "examUserNumber"];
            payload.chargeUserId = charge.value[0]?.id;
            payload.chargeUserName = charge.value[0]?.name;
            if (training) {
              payload.cultivateCoursewares = coursewares.value.map((item) => {
                const metadata = object(item.file);
                return {
                  fileIds: text(item.fileIds ?? metadata.id),
                  fileName: text(item.fileName ?? metadata.name),
                  fileSize: text(item.fileSize ?? metadata.size),
                  duration: number(item.duration),
                };
              });
            } else {
              payload.examPaperIds = papers.value.map((item) => item.id);
              payload.examDurationUnit = "MINUTE";
            }
          } else if (slug === "question") {
            validateQuestion(state, choices.value);
            payload.questionContent = JSON.stringify(choices.value);
          } else if (slug === "courseware") {
            requireField("name", "课件名称");
            requireField("themeId", "课件主题");
            if (!file.value.id) {
              throw new Error("请上传附件");
            }
            payload.fileId = file.value.id;
          } else if (slug === "test-paper-manage") {
            requireField("name", "试卷名称");
            if (categories.value.length === 0 || categories.value.some((item) => !item.title.trim() || item.examQuestions.length === 0)) {
              throw new Error("请填写大题标题并添加试题");
            }
            if (number(state.passingGradeScore) <= 0 || number(state.passingGradeScore) > total.value) {
              throw new Error("及格分须大于零且不能超过总分");
            }
            payload.score = total.value;
            payload.questionCategories = categories.value.map((category, i) => ({
              title: category.title,
              sort: i + 1,
              examQuestions: category.examQuestions.map((question, j) => ({
                name: question.name,
                themeId: question.themeId,
                themeName: question.themeName,
                questionType: question.questionType,
                questionContent: question.questionContent,
                answerAnalysis: question.answerAnalysis,
                sort: j + 1,
                score: number(question.score),
              })),
            }));
          } else if (slug === "paper-question-rule") {
            requireField("ruleName", "规则名称");
            const items = ruleItems.value.filter((item) => item.themeIds.length > 0 || item.extractCount || item.perScore);
            if (
              items.length === 0 ||
              items.some(
                (item) =>
                  item.themeIds.length === 0 ||
                  !Number.isInteger(item.extractCount) ||
                  number(item.extractCount) <= 0 ||
                  number(item.perScore) <= 0,
              )
            ) {
              throw new Error("每种题型需要完整填写主题、抽取数量和每题分数");
            }
            if (number(state.passScore) <= 0 || number(state.passScore) > total.value) {
              throw new Error("及格分须大于零且不能超过总分");
            }
            payload.items = items.map((item) => ({
              id: item.id,
              ruleId: item.ruleId,
              themeKeywords: item.themeIds.join(","),
              examQuestionType: item.examQuestionType,
              extractCount: item.extractCount,
              perScore: item.perScore,
            }));
            delete payload.totalScore;
          }
          saving.value = true;
          await getClient().save(resource, saveCommand(resource, payload), id || undefined);
          if (slug === "courseware" || training) {
            const ids = training
              ? coursewares.value.map((item) => text(item.fileIds ?? object(item.file).id)).filter(Boolean)
              : [text(file.value.id)];
            await (await getFiles()).persistSceneFiles(COURSEWARE_SCENE, ids);
          }
          message.success("保存成功");
          back();
        } catch (error) {
          message.error(errorText(error));
        } finally {
          saving.value = false;
        }
      }
      function field(key: string, label: string, kind = "Input", required = false, values?: { label: string; value: string }[]) {
        const props = {
          value: text(state[key]) || undefined,
          disabled: disabled.value,
          "onUpdate:value": (value: unknown) => {
            state[key] = value;
          },
        };
        return (
          <FormItem label={label} required={required} class={kind === "Textarea" ? styles.wide : undefined}>
            {kind === "Select" ? (
              <Select {...props} options={values} allowClear showSearch optionFilterProp="label" style={{ width: "100%" }} />
            ) : kind === "Radio" ? (
              <RadioGroup {...props} options={values} />
            ) : kind === "Date" ? (
              <DatePicker {...props} showTime valueFormat="YYYY-MM-DD HH:mm:ss" style={{ width: "100%" }} />
            ) : kind === "Number" ? (
              <InputNumber
                {...props}
                value={state[key] === null || state[key] === undefined ? undefined : number(state[key])}
                min={0}
                max={999999}
                style={{ width: "100%" }}
              />
            ) : kind === "Switch" ? (
              <Switch
                checked={Boolean(state[key])}
                disabled={disabled.value}
                onUpdate:checked={(value: unknown) => {
                  state[key] = value === true;
                }}
              />
            ) : kind === "Textarea" ? (
              <Textarea {...props} rows={3} maxlength={key === "name" ? 1000 : 500} />
            ) : (
              <Input {...props} maxlength={200} />
            )}
          </FormItem>
        );
      }
      function questionForm(
        model: Record<string, unknown>,
        optionList: QuestionOption[],
        change: (value: QuestionOption[]) => void,
        readonly: boolean,
      ) {
        return (
          <>
            <FormItem label="题目主题" required>
              <Select
                disabled={readonly}
                value={text(model.themeId) || undefined}
                options={options(themes.value)}
                onUpdate:value={(v: unknown) => {
                  model.themeId = v;
                }}
              />
            </FormItem>
            <FormItem label="题型" required>
              <Select
                disabled={readonly}
                value={text(model.questionType)}
                options={QUESTION_TYPES}
                onUpdate:value={(v: unknown) => {
                  model.questionType = text(v);
                  change(defaultOptions(text(v)));
                }}
              />
            </FormItem>
            <FormItem label="题目" required class={styles.wide}>
              <Textarea
                disabled={readonly}
                rows={3}
                maxlength={1000}
                value={text(model.name)}
                onUpdate:value={(v: string) => {
                  model.name = v;
                }}
              />
            </FormItem>
            <div class={styles.wide}>
              <QuestionField type={text(model.questionType)} disabled={readonly} value={optionList} onChange={change} />
            </div>
            <FormItem label="答案解析">
              <Textarea
                disabled={readonly}
                value={text(model.answerAnalysis)}
                onUpdate:value={(v: string) => {
                  model.answerAnalysis = v;
                }}
              />
            </FormItem>
            <FormItem label="分数" required>
              <InputNumber
                disabled={readonly}
                min={1}
                max={999}
                value={number(model.score)}
                onUpdate:value={(v: unknown) => {
                  model.score = number(v);
                }}
              />
            </FormItem>
          </>
        );
      }
      const openQuestion = (category: Category, index = -1) => {
        questionTarget = { category, index };
        const question: Record<string, unknown> =
          index >= 0 ? category.examQuestions[index] : { name: "", questionType: "SINGLE_CHOICE", score: 1, themeId: undefined };
        for (const key of Object.keys(editingQuestion)) {
          delete editingQuestion[key];
        }
        Object.assign(editingQuestion, question);
        editingChoices.value = parseQuestion(question.questionContent, text(question.questionType));
        questionOpen.value = true;
      };
      const moveCategory = (index: number, delta: number) => {
        const list = [...categories.value];
        [list[index], list[index + delta]] = [list[index + delta], list[index]];
        categories.value = list;
      };
      onMounted(() => void load());
      return () => (
        <>
          <PageLayout
            title={`${readOnly ? "详情" : id ? "编辑" : "新增"}${config.title}`}
            showFooter
            v-slots={{
              "layout-content": () => (
                <Spin spinning={loading.value}>
                  <div class={styles.scroll}>
                    <Form layout="vertical" class={styles.form}>
                      <div class={styles.grid}>
                        {task ? (
                          <>
                            {field("name", training ? "培训名称" : "考试名称", "Input", true)}
                            {field("themeId", training ? "培训主题" : "考试主题", "Select", true, options(themes.value))}
                            {field(training ? "cultivateStartTime" : "examStartTime", "开始时间", "Date", true)}
                            {field(training ? "cultivateEndTime" : "examEndTime", "结束时间", "Date", true)}
                            {training ? (
                              field("examTaskId", "关联考试", "Select", false, options(exams.value))
                            ) : (
                              <>
                                <FormItem label="出题方式" required>
                                  <RadioGroup
                                    disabled={disabled.value}
                                    value={state.examPaperMode}
                                    options={[
                                      { label: "统一题目", value: "UNIFIED" },
                                      { label: "随机出题", value: "RANDOM" },
                                    ]}
                                    onUpdate:value={(v: string) => {
                                      state.examPaperMode = v;
                                      papers.value = [];
                                    }}
                                  />
                                </FormItem>
                                <FormItem label="试卷" required>
                                  {readOnly ? (
                                    <Space direction="vertical">
                                      {papers.value.map((paper) => (
                                        <Button
                                          type="link"
                                          onClick={() =>
                                            void navigation.push({
                                              path: `${BASE}/${state.examPaperMode === "RANDOM" ? "paper-question-rule" : "test-paper-manage"}-form`,
                                              query: { id: paper.id, action: "detail", returnPath: route.fullPath },
                                            })
                                          }
                                        >
                                          {text(paper.name) || "--"}
                                        </Button>
                                      ))}
                                    </Space>
                                  ) : state.examPaperMode === "RANDOM" ? (
                                    <Select
                                      mode="multiple"
                                      disabled={disabled.value}
                                      value={papers.value.map((item) => item.id)}
                                      options={options(rules.value, "ruleName")}
                                      onUpdate:value={(value: unknown) => {
                                        const ids = Array.isArray(value) ? value.map(String) : [];
                                        papers.value = ids.map(
                                          (key) => rules.value.find((item) => item.id === key) ?? { id: key, name: key },
                                        );
                                      }}
                                    />
                                  ) : (
                                    <Picker
                                      multiple
                                      resource="test-paper-manage"
                                      title="选择试卷"
                                      disabled={disabled.value}
                                      value={papers.value}
                                      onChange={(v: Row[]) => {
                                        papers.value = v;
                                      }}
                                    />
                                  )}
                                </FormItem>
                              </>
                            )}
                            <FormItem label="参加人数" required>
                              <InputNumber
                                disabled={disabled.value || staff.value}
                                value={
                                  staff.value ? people.value.length : number(state[training ? "cultivateUserNumber" : "examUserNumber"])
                                }
                                min={1}
                                onUpdate:value={(v: unknown) => {
                                  state[training ? "cultivateUserNumber" : "examUserNumber"] = number(v);
                                }}
                              />
                            </FormItem>
                            {training && (
                              <>
                                {field("cultivateMode", "培训形式", "Radio", true, MODES)}
                                {field("cultivateAddress", "培训地点", "Input", state.cultivateMode === "OFFLINE")}
                                {field("speaker", "主讲人")}
                              </>
                            )}
                            <FormItem label="负责人" required>
                              <Picker
                                resource="people"
                                disabled={disabled.value}
                                title="选择负责人"
                                value={charge.value}
                                onChange={(v: Row[]) => {
                                  charge.value = v;
                                }}
                              />
                            </FormItem>
                            {field(
                              training ? "cultivateTarget" : "examTaskType",
                              training ? "培训对象" : "考试类型",
                              "Radio",
                              true,
                              training ? TYPES : EXAM_TYPES,
                            )}
                            {training ? (
                              field("lateStatus", "开启迟到", "Switch")
                            ) : (
                              <>
                                {field("timed", "限时考试", "Switch")}
                                {state.timed && field("examDuration", "考试时长（分钟）", "Number", true)}
                                {field("retake", "允许复考", "Switch")}
                                {state.retake && field("retakeNumber", "复考次数", "Number", true)}
                              </>
                            )}
                            {field(training ? "cultivateContent" : "remark", training ? "培训内容" : "考试说明", "Textarea")}
                            <section class={[styles.section, styles.wide]}>
                              <div class={styles.sectionHeader}>
                                <strong>{training ? "培训人员" : "考试人员"}</strong>
                              </div>
                              <Picker
                                multiple
                                resource="people"
                                title="选择参加人员"
                                disabled={readOnly}
                                value={people.value}
                                onChange={(v: Row[]) => {
                                  people.value = v;
                                }}
                              />
                            </section>
                            {training && (
                              <section class={[styles.section, styles.wide]}>
                                <strong>培训课件</strong>
                                <div style={{ marginTop: "12px" }}>
                                  {!disabled.value && (
                                    <Upload
                                      showUploadList={false}
                                      beforeUpload={(picked: File) => {
                                        uploading.value = true;
                                        void uploadCourseware(picked)
                                          .then((metadata) => {
                                            if (
                                              !coursewares.value.some((item) => text(item.fileIds ?? object(item.file).id) === metadata.id)
                                            ) {
                                              coursewares.value.push({
                                                id: metadata.id,
                                                name: metadata.name,
                                                file: metadata,
                                                duration: metadata.duration,
                                              });
                                            }
                                          })
                                          .catch((error) => message.error(errorText(error)))
                                          .finally(() => {
                                            uploading.value = false;
                                          });
                                        return false;
                                      }}
                                    >
                                      <Button loading={uploading.value} style={{ marginBottom: "12px" }}>
                                        上传附件
                                      </Button>
                                    </Upload>
                                  )}
                                  <Picker
                                    multiple
                                    resource="courseware"
                                    title="选择课件"
                                    disabled={disabled.value}
                                    value={coursewares.value}
                                    onChange={(v: Row[]) => {
                                      coursewares.value = v;
                                    }}
                                  />
                                </div>
                              </section>
                            )}
                          </>
                        ) : slug === "question" ? (
                          questionForm(
                            state,
                            choices.value,
                            (v) => {
                              choices.value = v;
                            },
                            disabled.value,
                          )
                        ) : slug === "courseware" ? (
                          <>
                            {field("name", "课件名称", "Input", true)}
                            {field("themeId", "课件主题", "Select", true, options(themes.value))}
                            {field("remark", "课件描述", "Textarea")}
                            <FormItem label="附件" required class={styles.wide}>
                              <Space>
                                <Upload
                                  disabled={disabled.value || uploading.value}
                                  showUploadList={false}
                                  maxCount={1}
                                  beforeUpload={(picked: File) => {
                                    void (async () => {
                                      uploading.value = true;
                                      try {
                                        file.value = await uploadCourseware(picked);
                                        state.duration = file.value.duration;
                                      } catch (error) {
                                        message.error(errorText(error));
                                      } finally {
                                        uploading.value = false;
                                      }
                                    })();
                                    return false;
                                  }}
                                >
                                  <Button loading={uploading.value}>上传附件</Button>
                                </Upload>
                                {file.value.id && (
                                  <>
                                    {file.value.path ? (
                                      <a
                                        href={text(file.value.path)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={text(file.value.name)}
                                      >
                                        {text(file.value.name)}
                                      </a>
                                    ) : (
                                      <span>{text(file.value.name)}</span>
                                    )}
                                    {!disabled.value && (
                                      <Button
                                        danger
                                        type="link"
                                        onClick={() => {
                                          file.value = {};
                                        }}
                                      >
                                        移除
                                      </Button>
                                    )}
                                  </>
                                )}
                              </Space>
                            </FormItem>
                          </>
                        ) : slug === "paper-question-rule" ? (
                          <>
                            {field("ruleName", "规则名称", "Input", true)}
                            <FormItem label="试卷总分">
                              <InputNumber disabled value={total.value} />
                            </FormItem>
                            {field("passScore", "及格分", "Number", true)}
                            {field("description", "规则说明", "Textarea")}
                            <section class={[styles.section, styles.wide]}>
                              {ruleItems.value.map((item) => (
                                <div class={styles.section}>
                                  <strong>{QUESTION_TYPES.find((type) => type.value === item.examQuestionType)?.label}</strong>
                                  <div class={styles.grid}>
                                    <FormItem label="主题">
                                      <Select
                                        mode="multiple"
                                        disabled={disabled.value}
                                        value={item.themeIds}
                                        options={options(themes.value)}
                                        onUpdate:value={(v: unknown) => {
                                          item.themeIds = Array.isArray(v) ? v.map(String) : [];
                                        }}
                                      />
                                    </FormItem>
                                    <FormItem label="抽取数量">
                                      <InputNumber
                                        min={0}
                                        precision={0}
                                        disabled={disabled.value}
                                        value={item.extractCount}
                                        onUpdate:value={(v: unknown) => {
                                          item.extractCount = v === null || v === undefined ? undefined : number(v);
                                        }}
                                      />
                                    </FormItem>
                                    <FormItem label="每题分数">
                                      <InputNumber
                                        min={0}
                                        disabled={disabled.value}
                                        value={item.perScore}
                                        onUpdate:value={(v: unknown) => {
                                          item.perScore = v === null || v === undefined ? undefined : number(v);
                                        }}
                                      />
                                    </FormItem>
                                    <FormItem label="小计">{number(item.extractCount) * number(item.perScore)} 分</FormItem>
                                  </div>
                                </div>
                              ))}
                            </section>
                          </>
                        ) : (
                          <>
                            {field("name", "试卷名称", "Input", true)}
                            <FormItem label="试卷总分">
                              <InputNumber disabled value={total.value} />
                            </FormItem>
                            {field("passingGradeScore", "及格分", "Number", true)}
                            {field("remark", "试卷说明", "Textarea")}
                            <div class={styles.wide}>
                              {!disabled.value && (
                                <Button
                                  onClick={() => {
                                    categories.value.push({ title: "", sort: categories.value.length + 1, examQuestions: [] });
                                  }}
                                >
                                  添加大题
                                </Button>
                              )}
                              {categories.value.map((category, i) => (
                                <section class={styles.section}>
                                  <div class={styles.sectionHeader}>
                                    <Input
                                      disabled={disabled.value}
                                      placeholder="请输入大题标题"
                                      value={category.title}
                                      onUpdate:value={(v: string) => {
                                        category.title = v;
                                      }}
                                    />
                                    {!disabled.value && (
                                      <Space>
                                        <Button disabled={i === 0} onClick={() => moveCategory(i, -1)}>
                                          上移
                                        </Button>
                                        <Button disabled={i === categories.value.length - 1} onClick={() => moveCategory(i, 1)}>
                                          下移
                                        </Button>
                                        <Button
                                          danger
                                          onClick={() => {
                                            categories.value.splice(i, 1);
                                          }}
                                        >
                                          删除大题
                                        </Button>
                                      </Space>
                                    )}
                                  </div>
                                  {!disabled.value && (
                                    <Space>
                                      <Picker
                                        multiple
                                        resource="question"
                                        title="从考题库选择"
                                        value={category.examQuestions}
                                        onChange={(v: Row[]) => {
                                          category.examQuestions = v;
                                        }}
                                      />
                                      <Button onClick={() => openQuestion(category)}>新增试题</Button>
                                    </Space>
                                  )}
                                  {category.examQuestions.map((question, j) => (
                                    <div class={styles.section}>
                                      <div class={styles.sectionHeader}>
                                        <strong>
                                          {j + 1}. {text(question.name)} （{number(question.score)}分）
                                        </strong>
                                        {!disabled.value && (
                                          <Space>
                                            <Button onClick={() => openQuestion(category, j)}>编辑</Button>
                                            <Button
                                              disabled={j === 0}
                                              onClick={() => {
                                                [category.examQuestions[j], category.examQuestions[j - 1]] = [
                                                  category.examQuestions[j - 1],
                                                  category.examQuestions[j],
                                                ];
                                              }}
                                            >
                                              上移
                                            </Button>
                                            <Button
                                              disabled={j === category.examQuestions.length - 1}
                                              onClick={() => {
                                                [category.examQuestions[j], category.examQuestions[j + 1]] = [
                                                  category.examQuestions[j + 1],
                                                  category.examQuestions[j],
                                                ];
                                              }}
                                            >
                                              下移
                                            </Button>
                                            <Button
                                              danger
                                              onClick={() => {
                                                category.examQuestions.splice(j, 1);
                                              }}
                                            >
                                              删除
                                            </Button>
                                          </Space>
                                        )}
                                      </div>
                                      <QuestionField
                                        type={text(question.questionType)}
                                        value={parseQuestion(question.questionContent, text(question.questionType))}
                                        disabled
                                      />
                                      <p>答案解析：{text(question.answerAnalysis) || "—"}</p>
                                    </div>
                                  ))}
                                </section>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </Form>
                  </div>
                </Spin>
              ),
              "footer-page": () => (
                <div class={styles.footer}>
                  {!readOnly && (
                    <Button type="primary" disabled={!loaded.value || uploading.value} loading={saving.value} onClick={() => void save()}>
                      保存
                    </Button>
                  )}
                  <Button onClick={back}>返回</Button>
                </div>
              ),
            }}
          />
          <Modal
            title="编辑试题"
            open={questionOpen.value}
            width={860}
            okText="确定"
            cancelText="取消"
            onCancel={() => {
              questionOpen.value = false;
            }}
            onOk={() => {
              try {
                validateQuestion(editingQuestion, editingChoices.value);
                if (!questionTarget) {
                  return;
                }
                const question = {
                  ...editingQuestion,
                  id: text(editingQuestion.id) || crypto.randomUUID(),
                  questionContent: JSON.stringify(editingChoices.value),
                  themeName: themes.value.find((theme) => theme.id === editingQuestion.themeId)?.name,
                };
                if (questionTarget.index < 0) {
                  questionTarget.category.examQuestions.push(question);
                } else {
                  questionTarget.category.examQuestions[questionTarget.index] = question;
                }
                questionOpen.value = false;
              } catch (error) {
                message.error(errorText(error));
              }
            }}
          >
            <Form layout="vertical">
              <div class={styles.grid}>
                {questionForm(
                  editingQuestion,
                  editingChoices.value,
                  (v) => {
                    editingChoices.value = v;
                  },
                  false,
                )}
              </div>
            </Form>
          </Modal>
        </>
      );
    },
  });
}
