import { ref, type Ref } from "vue";

import type { InspectItemContent } from "./type";

interface UseValidate {
  isValid: Ref<boolean>;
  isResultItem: Ref<boolean>;
  inspectItemContent: Ref<InspectItemContent[]>;
  nameChange: (value: string, record: InspectItemContent) => void;
  resultIdChange: (value: string, record: InspectItemContent) => void;
  resultItemValueChange: (value: string, record: InspectItemContent) => void;
  imageResultChange: (value: string[] | string | boolean | undefined, record: InspectItemContent) => void;
  remarkResultChange: (value: string[] | string | boolean | undefined, record: InspectItemContent) => void;
  itemTagChange: (value: string, record: InspectItemContent) => void;
  validate: () => Promise<boolean>;
}

const isResultItemEnabled = (value: unknown): boolean => {
  return value !== false && value !== "false" && value !== 0 && value !== "0";
};

export const useValidate = (): UseValidate => {
  const isValid = ref(false);
  const isResultItem = ref(true);
  const inspectItemContent = ref<InspectItemContent[]>([]);
  const nameChange = (value: string | undefined, record: InspectItemContent): void => {
    if (value === undefined || value === null) {
      record.nameError = true;
      record.nameErrorMsg = "请输入内容描述";
      record.isEdit = true;
    } else {
      record.nameError = false;
      record.nameErrorMsg = "";
    }
  };
  const resultIdChange = (value: string | undefined, record: InspectItemContent): void => {
    if (value === undefined || value === null || value.length === 0) {
      record.resultIdError = true;
      record.resultIdErrorMsg = "请选择巡检结果";
      record.isEdit = true;
    } else {
      record.resultIdError = false;
      record.resultIdErrorMsg = "";
    }
  };
  const resultItemValueChange = (value: string | undefined, record: InspectItemContent): void => {
    if (value === undefined || value === null || value.length === 0) {
      record.resultItemValueError = true;
      record.resultItemValueErrorMsg = "请选择默认结果述";
      record.isEdit = true;
    } else {
      record.resultItemValueError = false;
      record.resultItemValueErrorMsg = "";
    }
  };
  const imageResultChange = (value: string[] | string | boolean | undefined, record: InspectItemContent): void => {
    const isEmpty = value === undefined || value === null || (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
      record.imageResultError = true;
      record.imageResultErrorMsg = "请选择以下巡检结果必须拍照";
      record.isEdit = true;
    } else {
      record.imageResultError = false;
      record.imageResultErrorMsg = "";
    }
  };
  const remarkResultChange = (value: string[] | string | boolean | undefined, record: InspectItemContent): void => {
    const isEmpty = value === undefined || value === null || (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
      record.remarkResultError = true;
      record.remarkResultErrorMsg = "请选择以下巡检结果必须备注";
      record.isEdit = true;
    } else {
      record.remarkResultError = false;
      record.remarkResultErrorMsg = "";
    }
  };
  const itemTagChange = (value: string | undefined, record: InspectItemContent): void => {
    if (value === undefined || value === null || value.length === 0) {
      record.itemTagError = true;
      record.itemTagErrorMsg = "请选择标签";
      record.isEdit = true;
    } else {
      record.itemTagError = false;
      record.itemTagErrorMsg = "";
    }
  };

  const hasErrors = (item: InspectItemContent): boolean => {
    return Object.keys(item).some((key) => key.endsWith("Error") && item[key as keyof InspectItemContent] === true);
  };
  const validate = async (): Promise<boolean> => {
    try {
      inspectItemContent.value.forEach((e) => {
        nameChange(e.name, e);
        const rowIsResultItem = e.isResultItem === undefined ? isResultItem.value : isResultItemEnabled(e.isResultItem);
        if (rowIsResultItem) {
          resultIdChange(e.resultId, e);
          resultItemValueChange(e.resultItemValue, e);
          imageResultChange(e.imageResult, e);
          remarkResultChange(e.remarkResult, e);
        } else {
          e.resultIdError = false;
          e.resultIdErrorMsg = "";
          e.resultItemValueError = false;
          e.resultItemValueErrorMsg = "";
          imageResultChange(e.imageResult, e);
          remarkResultChange(e.remarkResult, e);
        }
        return e;
      });
      const containsErrors = inspectItemContent.value.some(hasErrors);
      isValid.value = !containsErrors;
      return isValid.value;
    } catch {
      isValid.value = false;
      return false;
    }
  };
  return {
    isValid,
    isResultItem,
    inspectItemContent,
    nameChange,
    resultIdChange,
    resultItemValueChange,
    imageResultChange,
    remarkResultChange,
    itemTagChange,
    validate,
  };
};
