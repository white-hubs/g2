import { onMounted, onUnmounted, ref } from "vue";

interface UseTableScrollOptions {
  /** 头部（面包屑 / 搜索表单 / 操作栏）累计高度，默认 260 */
  reservedHeight?: number;
  /** 最小可用高度，默认 280 */
  minHeight?: number;
}

interface UseTableScrollReturn {
  y: Readonly<{ value: number }>;
}

/**
 * 监听 window 尺寸并返回表格可用的 scrollY 值。
 * 用法：`const { y } = useTableScroll();` 再传给 `<Table :scroll="{ y: y.value }" />`。
 */
export function useTableScroll(options: UseTableScrollOptions = {}): UseTableScrollReturn {
  const { reservedHeight = 260, minHeight = 280 } = options;
  const y = ref(minHeight);

  const compute = (): void => {
    const next = window.innerHeight - reservedHeight;
    y.value = Math.max(next, minHeight);
  };

  onMounted(() => {
    compute();
    window.addEventListener("resize", compute);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", compute);
  });

  return { y };
}
