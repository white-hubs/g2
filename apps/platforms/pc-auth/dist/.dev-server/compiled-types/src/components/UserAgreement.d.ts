import "./UserAgreement.css";
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    agreementUrl: {
        type: StringConstructor;
        default: string;
    };
    privacyUrl: {
        type: StringConstructor;
        default: string;
    };
}>, {
    remind: () => Promise<void>;
    openAgreementConfirm: () => void;
    checked: import("vue").Ref<boolean, boolean>;
    hasError: import("vue").Ref<boolean, boolean>;
    shaking: import("vue").Ref<boolean, boolean>;
    documentModalOpen: import("vue").Ref<boolean, boolean>;
    documentModalTitle: import("vue").Ref<string, string>;
    documentModalUrl: import("vue").Ref<string, string>;
    confirmModalOpen: import("vue").Ref<boolean, boolean>;
    handleCheckboxChange: (event: {
        target: {
            checked: boolean;
        };
    }) => void;
    openDocument: (kind: "agreement" | "privacy") => void;
    handleConfirmAccept: () => void;
    handleConfirmReject: () => void;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("acceptedChange" | "confirmAccepted" | "confirmRejected")[], "acceptedChange" | "confirmAccepted" | "confirmRejected", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    agreementUrl: {
        type: StringConstructor;
        default: string;
    };
    privacyUrl: {
        type: StringConstructor;
        default: string;
    };
}>> & Readonly<{
    onAcceptedChange?: ((...args: any[]) => any) | undefined;
    onConfirmAccepted?: ((...args: any[]) => any) | undefined;
    onConfirmRejected?: ((...args: any[]) => any) | undefined;
}>, {
    agreementUrl: string;
    privacyUrl: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=UserAgreement.d.ts.map