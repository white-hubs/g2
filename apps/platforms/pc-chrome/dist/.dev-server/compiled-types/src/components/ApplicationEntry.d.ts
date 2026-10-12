import { type PropType } from "vue";
import type { ApplicationEntryGroup } from "./top-bar-types";
import "./ApplicationEntry.css";
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    groups: {
        type: PropType<ApplicationEntryGroup[]>;
        default: () => never[];
    };
    activeKey: {
        type: StringConstructor;
        default: string;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "selectGroup"[], "selectGroup", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    groups: {
        type: PropType<ApplicationEntryGroup[]>;
        default: () => never[];
    };
    activeKey: {
        type: StringConstructor;
        default: string;
    };
}>> & Readonly<{
    onSelectGroup?: ((...args: any[]) => any) | undefined;
}>, {
    activeKey: string;
    groups: ApplicationEntryGroup[];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=ApplicationEntry.d.ts.map