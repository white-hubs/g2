import { type PropType } from "vue";
import type { TerminalEntry } from "./top-bar-types";
import "./ChooseTerminalDropdown.css";
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    entries: {
        type: PropType<TerminalEntry[]>;
        default: () => TerminalEntry[];
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "selectTerminal"[], "selectTerminal", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    entries: {
        type: PropType<TerminalEntry[]>;
        default: () => TerminalEntry[];
    };
}>> & Readonly<{
    onSelectTerminal?: ((...args: any[]) => any) | undefined;
}>, {
    entries: TerminalEntry[];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=ChooseTerminalDropdown.d.ts.map