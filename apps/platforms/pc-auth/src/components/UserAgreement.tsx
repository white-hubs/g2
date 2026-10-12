import { Teleport, type VNode, defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import { Checkbox, Modal } from "../pc-ui-runtime";
import { isLoginAgreementAccepted, setLoginAgreementAccepted } from "../user-agreement";

import "./UserAgreement.css";

export default defineComponent({
  name: "UserAgreement",
  props: {
    agreementUrl: { type: String, default: "about:blank#TODO_USER_AGREEMENT_URL" },
    privacyUrl: { type: String, default: "about:blank#TODO_PRIVACY_POLICY_URL" },
  },
  emits: ["acceptedChange", "confirmAccepted", "confirmRejected"],
  setup(props, { emit, expose }) {
    const checked = ref(isLoginAgreementAccepted(window.localStorage));
    const hasError = ref(false);
    const shaking = ref(false);
    const documentModalOpen = ref(false);
    const documentModalTitle = ref("");
    const documentModalUrl = ref("");
    const confirmModalOpen = ref(false);

    let shakeResetTimer: ReturnType<typeof setTimeout> | undefined;

    function handleCheckboxChange(event: { target: { checked: boolean } }): void {
      checked.value = event.target.checked;
      setLoginAgreementAccepted(window.localStorage, checked.value);
      emit("acceptedChange", checked.value);
      if (checked.value) {
        hasError.value = false;
        shaking.value = false;
      }
    }

    function openDocument(kind: "agreement" | "privacy"): void {
      documentModalTitle.value = kind === "agreement" ? "用户协议" : "隐私政策";
      documentModalUrl.value = kind === "agreement" ? props.agreementUrl : props.privacyUrl;
      documentModalOpen.value = true;
    }

    async function remind(): Promise<void> {
      hasError.value = true;
      shaking.value = false;
      if (shakeResetTimer !== undefined) {
        clearTimeout(shakeResetTimer);
      }
      await nextTick();
      shaking.value = true;
      shakeResetTimer = setTimeout(() => {
        shaking.value = false;
        shakeResetTimer = undefined;
      }, 520);
    }

    function openAgreementConfirm(): void {
      confirmModalOpen.value = true;
    }

    function handleConfirmAccept(): void {
      checked.value = true;
      hasError.value = false;
      shaking.value = false;
      setLoginAgreementAccepted(window.localStorage, true);
      emit("acceptedChange", true);
      emit("confirmAccepted");
      confirmModalOpen.value = false;
    }

    function handleConfirmReject(): void {
      emit("confirmRejected");
      confirmModalOpen.value = false;
    }

    onMounted(() => {
      if (isLoginAgreementAccepted(window.localStorage)) {
        checked.value = true;
      }
    });

    onBeforeUnmount(() => {
      if (shakeResetTimer !== undefined) {
        clearTimeout(shakeResetTimer);
      }
    });

    expose({ remind, openAgreementConfirm });

    return {
      remind,
      openAgreementConfirm,
      checked,
      hasError,
      shaking,
      documentModalOpen,
      documentModalTitle,
      documentModalUrl,
      confirmModalOpen,
      handleCheckboxChange,
      openDocument,
      handleConfirmAccept,
      handleConfirmReject,
    };
  },
  render(): VNode {
    return (
      <div
        class={[
          "pc-auth-user-agreement",
          { "pc-auth-user-agreement--error": this.hasError, "pc-auth-user-agreement--shake": this.shaking },
        ]}
        onAnimationend={() => {
          this.shaking = false;
        }}
      >
        <div class="pc-auth-user-agreement__line">
          <Checkbox checked={this.checked} data-testid="agreement-checkbox" onChange={this.handleCheckboxChange} />
          <span class="pc-auth-user-agreement__text">
            我已阅读并同意
            <a
              href="#user-agreement"
              data-testid="agreement-link"
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                this.openDocument("agreement");
              }}
            >
              用户协议
            </a>
            及
            <a
              href="#privacy-policy"
              data-testid="privacy-link"
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                this.openDocument("privacy");
              }}
            >
              隐私政策
            </a>
          </span>
        </div>

        <Teleport to="body">
          <Modal
            open={this.documentModalOpen}
            onUpdate:open={(v: boolean) => {
              this.documentModalOpen = v;
            }}
            title={this.documentModalTitle}
            width="800px"
            footer={null}
          >
            <iframe
              data-testid="agreement-iframe"
              sandbox="allow-scripts allow-top-navigation allow-same-origin"
              style={{ width: "100%", height: "500px", border: "none" }}
              src={this.documentModalUrl}
            />
          </Modal>
          <Modal
            open={this.confirmModalOpen}
            onUpdate:open={(v: boolean) => {
              this.confirmModalOpen = v;
            }}
            title="用户协议与隐私政策"
            okText="同意并登录"
            cancelText="不同意"
            centered
            data-testid="agreement-confirm-modal"
            onOk={this.handleConfirmAccept}
            onCancel={this.handleConfirmReject}
          >
            <p class="pc-auth-user-agreement__confirm-text">
              登录前请先阅读并同意
              <a
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  this.openDocument("agreement");
                }}
              >
                用户协议
              </a>
              及
              <a
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  this.openDocument("privacy");
                }}
              >
                隐私政策
              </a>
              。
            </p>
          </Modal>
        </Teleport>
      </div>
    );
  },
});
