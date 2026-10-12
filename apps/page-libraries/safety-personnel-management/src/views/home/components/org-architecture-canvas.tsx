/** @jsxImportSource vue */
import { type PropType, computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { OrgNodeUI } from "../../../types/ui";
import { resolveOrgMemberAvatarUrl } from "../../../utils/member-avatar";

import styles from "./org-architecture-canvas.module.css";

const GAP = 36,
  LEVEL = 82,
  WIDTH = 450;

const memberInitial = (name: string): string => name.trim().slice(0, 1) || "-";
interface LayoutNode {
  node: OrgNodeUI;
  x: number;
  y: number;
  height: number;
  width: number;
  depth: number;
  children: LayoutNode[];
}
function layoutTree(root: OrgNodeUI): LayoutNode[] {
  const heights: number[] = [];
  const build = (node: OrgNodeUI, depth: number): LayoutNode => {
    const children = node.children.map((child) => build(child, depth + 1));
    const rows = Math.ceil(Math.max(1, Math.min(node.members.length, 5) + (node.members.length > 5 ? 1 : 0)) / 2);
    const height = 78 + rows * 96 + (rows - 1) * 10;
    heights[depth] = Math.max(heights[depth] || 0, height);
    return {
      node,
      depth,
      x: 0,
      y: 0,
      height,
      width: Math.max(WIDTH, children.reduce((sum, child) => sum + child.width, 0) + Math.max(0, children.length - 1) * GAP),
      children,
    };
  };
  const tree = build(root, 0),
    result: LayoutNode[] = [];
  const place = (item: LayoutNode, left: number) => {
    item.x = left + (item.width - WIDTH) / 2;
    item.y = heights.slice(0, item.depth).reduce((sum, height) => sum + height + LEVEL, 0);
    result.push(item);
    const childrenWidth = item.children.reduce((sum, child) => sum + child.width, 0) + Math.max(0, item.children.length - 1) * GAP;
    let offset = left + (item.width - childrenWidth) / 2;
    item.children.forEach((child) => {
      place(child, offset);
      offset += child.width + GAP;
    });
  };
  place(tree, 0);
  return result;
}
export const OrgArchitectureCanvas = defineComponent({
  props: { root: { type: Object as PropType<OrgNodeUI>, required: true } },
  setup(props) {
    const container = ref<HTMLDivElement>();
    const nodes = computed(() => layoutTree(props.root));
    const width = computed(() => Math.max(...nodes.value.map((node) => node.x + WIDTH)));
    const height = computed(() => Math.max(...nodes.value.map((node) => node.y + node.height)));
    const scale = ref(1),
      x = ref(0),
      y = ref(0);
    let pointer: { x: number; y: number } | undefined;
    let observer: ResizeObserver | undefined;
    const fit = () => {
      if (!container.value) {
        return;
      }
      const { clientWidth: w, clientHeight: h } = container.value;
      scale.value = Math.max(0.2, Math.min(1, (w - 96) / width.value, (h - 108) / height.value));
      x.value = (w - width.value * scale.value) / 2;
      y.value = (h - height.value * scale.value) / 2;
    };
    onMounted(() => {
      observer = new ResizeObserver(fit);
      if (container.value) {
        observer.observe(container.value);
      }
      fit();
    });
    watch(nodes, fit, { flush: "post" });
    onBeforeUnmount(() => observer?.disconnect());
    return () => (
      <div class={styles.canvasShell}>
        <div
          ref={container}
          class={styles.canvas}
          onPointerdown={(event) => {
            pointer = { x: event.clientX, y: event.clientY };
            container.value?.setPointerCapture(event.pointerId);
          }}
          onPointermove={(event) => {
            if (!pointer) {
              return;
            }
            x.value += event.clientX - pointer.x;
            y.value += event.clientY - pointer.y;
            pointer = { x: event.clientX, y: event.clientY };
          }}
          onPointerup={() => {
            pointer = undefined;
          }}
          onPointercancel={() => {
            pointer = undefined;
          }}
          onWheel={(event) => {
            if (!event.ctrlKey && !event.metaKey) {
              return;
            }
            event.preventDefault();
            const next = Math.min(1.6, Math.max(0.2, scale.value * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
            const bounds = container.value!.getBoundingClientRect();
            const px = event.clientX - bounds.left,
              py = event.clientY - bounds.top;
            x.value = px - ((px - x.value) * next) / scale.value;
            y.value = py - ((py - y.value) * next) / scale.value;
            scale.value = next;
          }}
        >
          <div
            style={{
              position: "relative",
              width: `${width.value}px`,
              height: `${height.value}px`,
              transformOrigin: "0 0",
              transform: `translate(${x.value}px, ${y.value}px) scale(${scale.value})`,
            }}
          >
            <svg width={width.value} height={height.value} style={{ position: "absolute", overflow: "visible" }}>
              {nodes.value.flatMap((parent) =>
                parent.children.map((child) => {
                  const sx = parent.x + WIDTH / 2,
                    sy = parent.y + parent.height,
                    tx = child.x + WIDTH / 2,
                    ty = child.y,
                    branch = (sy + ty) / 2;
                  return (
                    <path
                      key={`${parent.node.id}-${child.node.id}`}
                      d={`M ${sx} ${sy} V ${branch} H ${tx} V ${ty}`}
                      stroke="#1677ff"
                      stroke-width="2"
                      fill="none"
                    />
                  );
                }),
              )}
            </svg>
            {nodes.value.map((item) => (
              <section
                key={item.node.id}
                class={styles.orgCard}
                style={{
                  position: "absolute",
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${WIDTH}px`,
                  height: `${item.height}px`,
                }}
              >
                <header class={styles.cardHeader}>
                  <span class={styles.cardTitle}>{item.node.name || "--"}</span>
                  <svg class={styles.cardIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.8"
                      d="M9.5 11.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm6.25-.75a2.5 2.5 0 1 0 0-5m-12 12.75v-1.5a4.25 4.25 0 0 1 4.25-4.25h3a4.25 4.25 0 0 1 4.25 4.25v1.5m1.25-6h.75A3.75 3.75 0 0 1 21 16v1.5"
                    />
                  </svg>
                </header>
                <div class={[styles.cardBody, item.node.members.length === 1 ? styles.cardBodySingle : undefined]}>
                  {item.node.members.slice(0, 5).map((member) => (
                    <div key={member.userId} class={styles.memberItem}>
                      <div class={styles.memberNameRow}>
                        <strong class={styles.memberName}>{member.userName || "--"}</strong>
                        {resolveOrgMemberAvatarUrl(member) ? (
                          <img class={styles.memberAvatarImg} alt={member.userName} src={resolveOrgMemberAvatarUrl(member)} />
                        ) : (
                          <span class={styles.memberAvatar} aria-label={`${member.userName || "成员"}头像`}>
                            {memberInitial(member.userName)}
                          </span>
                        )}
                      </div>
                      <span class={styles.memberMeta}>部门：{member.dept?.trim() || "--"}</span>
                      <span class={styles.memberMeta}>电话：{member.phone?.trim() || "--"}</span>
                    </div>
                  ))}
                  {item.node.members.length === 0 ? <div class={[styles.memberItem, styles.memberItemEmpty]}>暂无人员</div> : null}
                  {item.node.members.length > 5 ? (
                    <div class={[styles.memberItem, styles.memberItemMore]}>等 {item.node.members.length} 人</div>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  },
});
