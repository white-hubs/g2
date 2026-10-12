import { Button, Tag } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent } from "vue";

import type { PersonnelCardUI } from "../../../types/ui";
import { maskPhone } from "../../../utils/mask-phone";

import styles from "../index.module.css";

export const PersonCard = defineComponent({
  props: {
    person: { type: Object as () => PersonnelCardUI, required: true },
  },
  emits: ["resume", "remove"],
  setup(props, { emit }) {
    return () => (
      <div class={styles.personCard}>
        <Button
          class={styles.removeBtn}
          type="link"
          danger
          size="small"
          onClick={() => {
            emit("remove", props.person);
          }}
        >
          移除
        </Button>
        <div class={styles.cardHeader}>
          <div class={styles.avatar}>{props.person.name.charAt(0)}</div>
          <div>
            <h4 class={styles.name}>{props.person.name}</h4>
            <div class={styles.deptPost}>
              {props.person.dept} · {props.person.post}
            </div>
          </div>
        </div>
        <div class={styles.cardDetail}>
          <div class={styles.detailRow}>
            <span>单位</span>
            <span>{props.person.company || "--"}</span>
          </div>
          <div class={styles.detailRow}>
            <span>手机号</span>
            <span>{maskPhone(props.person.phone)}</span>
          </div>
          <div class={styles.detailRow}>
            <span>类型</span>
            <span>
              {props.person.personTypes.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </span>
          </div>
        </div>
        <div class={styles.cardFooter}>
          <Button
            type="link"
            onClick={() => {
              emit("resume", props.person);
            }}
          >
            安全履历
          </Button>
        </div>
      </div>
    );
  },
});
