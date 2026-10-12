export type FitNodeLabelOptions = {
  /**
   * 最小高度
   */
  minHeight?: number;
};

var sharedMeasureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext() {
  if (sharedMeasureCtx) {
    return sharedMeasureCtx;
  }
  if (typeof document === "undefined") {
    return null;
  }
  var canvas = document.createElement("canvas");
  sharedMeasureCtx = canvas.getContext("2d");
  return sharedMeasureCtx;
}

function wrapTextLines(params: { text: string; maxWidth: number; font: string }) {
  var ctx = getMeasureContext();
  if (!ctx) {
    return [params.text || ""];
  }
  ctx.font = params.font;

  var text = (params.text || "").toString();
  if (!text) {
    return [""];
  }

  var paragraphs = text.split("\n");
  var lines: string[] = [];

  for (var pIndex = 0; pIndex < paragraphs.length; pIndex++) {
    var paragraph = paragraphs[pIndex];
    if (!paragraph) {
      lines.push("");
      continue;
    }

    var current = "";
    for (var i = 0; i < paragraph.length; i++) {
      var ch = paragraph[i];
      var next = current + ch;
      var w = ctx.measureText(next).width;
      if (w <= params.maxWidth || !current) {
        current = next;
        continue;
      }
      lines.push(current);
      current = ch;
    }
    if (current) {
      lines.push(current);
    }
  }

  return lines.length > 0 ? lines : [""];
}

function getNodeText(node: any) {
  var attrs = node?.getAttrs?.() || {};
  var label = (attrs as any).label || {};
  var data = node?.getData?.() || {};
  var twRaw = label.textWrap && typeof label.textWrap.text === "string" ? label.textWrap.text : "";
  var labelTextRaw = typeof label.text === "string" ? label.text : "";
  var nodeNameRaw = typeof data.nodeName === "string" ? data.nodeName : "";
  var isTextLabel = data.elementId === "text-label" || data.nodeType === "text-label" || data.nodeType === "文本标签";
  // 空字符串不能当作「有效文案」：否则会盖住 data.nodeName，导入后 fit 一轮把字清空
  if (isTextLabel) {
    if (nodeNameRaw.length > 0) {
      return nodeNameRaw;
    }
    if (twRaw.length > 0) {
      return twRaw;
    }
    if (labelTextRaw.length > 0) {
      return labelTextRaw;
    }
    return "";
  }
  if (twRaw.length > 0) {
    return twRaw;
  }
  if (labelTextRaw.length > 0) {
    return labelTextRaw;
  }
  if (nodeNameRaw.length > 0) {
    return nodeNameRaw;
  }
  return "";
}

function getIsTextLabel(node: any) {
  var data = node?.getData?.() || {};
  return data.elementId === "text-label" || data.nodeType === "text-label" || data.nodeType === "文本标签";
}

function getIsIconNode(node: any) {
  if (!node) {
    return false;
  }
  var data = node.getData?.() || {};
  if (data.elementId && data.elementId !== "text-label") {
    return true;
  }
  var attrs = node.getAttrs?.() || {};
  return !!(attrs as any).icon;
}

/**
 * 让节点高度自适应文字（不省略，自动增高显示多行）
 */
// oxlint-disable-next-line max-lines-per-function -- 文本/图标分支与 wrap 计算集中在一处便于维护
export function fitNodeLabel(node: any, options: FitNodeLabelOptions = {}) {
  if (!node) {
    return;
  }
  if (!node.isNode || !node.isNode()) {
    return;
  }

  var size = node.getSize?.() || { width: 230, height: 40 };
  var width = size.width || 230;
  var minHeight = options.minHeight || 40;

  var isTextLabel = getIsTextLabel(node);
  var isIconNode = getIsIconNode(node);
  var text = getNodeText(node);
  // 有 nodeName 的节点都尝试恢复 label（含导入场景，elementId 可能缺失）
  if (!text && !isTextLabel && !isIconNode) {
    return;
  }

  // 约束到 labelBox 的内部宽度（与各节点的 labelBox padding 保持一致）
  var maxTextWidth = isIconNode ? width - 52 : width - 16;
  if (maxTextWidth < 20) {
    maxTextWidth = 20;
  }
  var fontSize = 14;
  var lineHeight = 16;
  var font = `${fontSize}px Arial, sans-serif`;
  var lines = wrapTextLines({
    text,
    maxWidth: maxTextWidth - 2,
    font,
  });
  var wrappedText = lines.join("\n");

  // labelBox 上下 padding：4 + 4 = 8
  var requiredHeight = lines.length * lineHeight + 8;
  var nextHeight = requiredHeight > minHeight ? requiredHeight : minHeight;

  // 更新 label 使用 textWrap（不省略），并让 textWrap 以 labelBox 为参照包裹
  var attrs: Record<string, unknown> = { ...(node.getAttrs?.() || {}) };
  if (isTextLabel) {
    delete attrs.text;
  }
  var label = (attrs as any).label || {};
  var nextLabel: any = {
    ...label,
    lineHeight,
    // 双保险：直接设置 text 为多行文本，确保换行可见
    text: wrappedText,
    textWrap: {
      ...(label.textWrap || {}),
      text,
      width: -2,
      height: -2,
      ellipsis: false,
      breakWord: true,
    },
  };

  var hasLabelBox = !!(attrs as any).labelBox;
  if (isIconNode) {
    nextLabel.text = wrappedText;
    delete nextLabel.textWrap;
    delete nextLabel.ref;
    nextLabel.refX = 0;
    nextLabel.refY = 0;
    nextLabel.x = Math.round(44 + maxTextWidth / 2);
    nextLabel.y = Math.round(nextHeight / 2);
    nextLabel.style = {
      ...(nextLabel.style || {}),
      whiteSpace: "pre",
    };
  } else {
    nextLabel.ref = "body";
    nextLabel.refX = "50%";
    nextLabel.refY = "50%";
    if (hasLabelBox) {
      nextLabel.ref = "labelBox";
    }
  }
  nextLabel.textAnchor = "middle";
  nextLabel.textVerticalAnchor = "middle";
  if (!isIconNode) {
    delete nextLabel.x;
    delete nextLabel.y;
  }

  node.setAttrs?.({
    ...attrs,
    label: nextLabel,
  });
  // 导入后画布不刷新时，用 attr 路径强制更新 textWrap
  if (typeof node.attr === "function") {
    if (nextLabel.textWrap) {
      node.attr("label/textWrap", nextLabel.textWrap);
    }
    node.attr("label/text", wrappedText);
  }

  // 更新高度
  if (typeof node.resize === "function") {
    node.resize(width, nextHeight);
  } else if (typeof node.setSize === "function") {
    node.setSize({ width, height: nextHeight });
  }

  // 图标垂直居中（高度变大后避免贴顶）
  if (isIconNode) {
    var nextAttrs = node.getAttrs?.() || {};
    var icon = (nextAttrs as any).icon;
    if (icon) {
      var iconH = icon.height || 20;
      var y = Math.round((nextHeight - iconH) / 2);
      node.setAttrs?.({
        ...nextAttrs,
        icon: {
          ...icon,
          y,
        },
      });
    }
  }
}
