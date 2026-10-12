import type { ElementDef } from "../core";

export function applyAnimations(
  root: HTMLElement,
  def: ElementDef,
  propVals: Record<string, any>,
  prevPropVals: Record<string, any> = {},
): void {
  if (!def.animations || def.animations.length === 0) return;

  for (const anim of def.animations) {
    const target = root.querySelector(anim.target);
    if (!target) continue;

    const val = propVals[anim.triggerProp];
    const prevVal = prevPropVals[anim.triggerProp];

    // 只有当触发属性发生变化时才重新评估动画状态
    if (val === prevVal) continue;

    // 评估触发条件
    let shouldRun = false;
    try {
      shouldRun = !!new Function("value", `return (${anim.triggerCondition})`)(val);
    } catch {
      shouldRun = !!val;
    }

    // 获取该元素的动画控制器（如果有）
    const activeAnimations = (target as any)._scadaAnimations || {};

    if (shouldRun) {
      // 如果已经在运行该 ID 的动画，则跳过
      if (activeAnimations[anim.id]) continue;

      try {
        if (!anim.keyframes || anim.keyframes.length === 0) continue;

        const animation = target.animate(anim.keyframes, {
          duration: anim.duration,
          iterations: anim.iterations === "Infinity" ? Infinity : anim.iterations,
          easing: anim.easing,
        });

        activeAnimations[anim.id] = animation;
      } catch {
        /* WAAPI 在部分 SVG/CSS 属性组合下可能抛错 */
      }
    } else {
      // 停止动画
      if (activeAnimations[anim.id]) {
        activeAnimations[anim.id].cancel();
        delete activeAnimations[anim.id];
      }
    }

    (target as any)._scadaAnimations = activeAnimations;
  }
}
