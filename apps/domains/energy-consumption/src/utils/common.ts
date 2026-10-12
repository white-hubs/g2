import { isEmpty } from "lodash-es";

/** 保留指定小数位，不四舍五入 */
export const fixedNum = (value: number, decimal = 2): number | string => {
  if (value === null || typeof value === "undefined") return "";
  let num = value.toString();
  const index = num.indexOf(".");
  if (index !== -1) {
    num = num.substring(0, decimal + index + 1);
  }
  return parseFloat(num).toFixed(decimal) === "NaN" ? "0" : parseFloat(num).toFixed(decimal);
};

export const inputNumber = (value: number): number => {
  let val = value.toString();
  val = val.replace(/^\D*(\d*(?:\.\d{0,2})?).*$/g, "$1");
  return Number(val);
};

/** 触发浏览器下载 Blob / 已返回的 blob 响应 */
export function downloadBlob(blob: Blob, filename: string): void {
  const blobUrl = window.URL.createObjectURL(blob);
  const aElement = document.createElement("a");
  document.body.appendChild(aElement);
  aElement.style.display = "none";
  aElement.href = blobUrl;
  aElement.download = filename;
  aElement.click();
  document.body.removeChild(aElement);
  window.URL.revokeObjectURL(blobUrl);
}

export function exportFile(path: string, name: string): void {
  fetch(`${path}`, {
    method: "get",
    headers: { tenantFlag: "interior" },
  }).then((response) => {
    response.blob().then((blob) => downloadBlob(blob, name));
  });
}

export function treezenFiltered(
  _filteredData: unknown,
  data: Array<Record<string, unknown>>,
  parentProp = "parentId",
  prop = "id",
  rootId: unknown = null,
) {
  const mapData: Record<string, Record<string, unknown>> = {};
  data.forEach((item) => {
    mapData[String(item[prop])] = item;
    item.children = data.filter((a) => a[parentProp] === item[prop]);
    if (isEmpty(item.children)) {
      item.children = null;
    }
  });
  return data.filter((a) => a[parentProp] === rootId || !mapData[String(a[parentProp])]);
}

export function flattenTree(data: Array<Record<string, unknown>>, childrenProp = "children"): Array<Record<string, unknown>> {
  const flatData: Array<Record<string, unknown>> = [];
  data.forEach((item) => {
    flatData.push(item);
    const children = item[childrenProp] as Array<Record<string, unknown>> | undefined;
    if (children) {
      flatData.push(...flattenTree(children, childrenProp));
    }
  });
  return flatData;
}

export function treezen(data: Array<Record<string, unknown>>, parentProp = "parentId", prop = "id", rootId: unknown = null) {
  data.forEach((item) => {
    item.children = data.filter((a) => a[parentProp] === item[prop]);
    if (isEmpty(item.children)) {
      item.children = null;
    }
  });
  return data.filter((a) => a[parentProp] === rootId);
}

export function dateReduce(interval: string, number: number, date: Date): Date | undefined {
  switch (interval) {
    case "y": {
      date.setFullYear(date.getFullYear() - number);
      return date;
    }
    case "m": {
      date.setMonth(date.getMonth() - number);
      return date;
    }
    case "w": {
      date.setDate(date.getDate() - number);
      return date;
    }
    case "d": {
      date.setDate(date.getDate() - number * 30);
      return date;
    }
    default:
      return undefined;
  }
}

export function timeFormat(time: string | number | Date, status?: boolean): string | null {
  if (!time) return null;
  const date = new Date(time);
  const year = date.getFullYear();
  const month = date.getMonth() + 1 > 9 ? date.getMonth() + 1 : `0${date.getMonth() + 1}`;
  const day = date.getDate() > 9 ? date.getDate() : `0${date.getDate()}`;
  const hour = date.getHours() > 9 ? date.getHours() : `0${date.getHours()}`;
  const minutes = date.getMinutes() > 9 ? date.getMinutes() : `0${date.getMinutes()}`;
  const second = date.getSeconds() > 9 ? date.getSeconds() : `0${date.getSeconds()}`;
  if (status) {
    return `${year}-${month}-${day} ${hour}:${minutes}:${second}`;
  }
  return `${year}-${month}-${day}`;
}

export const treeAddLevel = (array: Array<Record<string, unknown>>, levelName = "level", childrenName = "children") => {
  if (!Array.isArray(array)) return [];
  const recursive = (nodes: Array<Record<string, unknown>>, level = 0) => {
    level++;
    return nodes.map((v) => {
      v[levelName] = level;
      const child = v[childrenName] as Array<Record<string, unknown>> | undefined;
      if (child && child.length) recursive(child, level);
      return v;
    });
  };
  return recursive(array);
};
