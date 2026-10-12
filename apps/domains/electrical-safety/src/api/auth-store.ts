import { getElectricalSafetyContext } from "../domain-context";
export interface AuthState {
  tenant: string | number;
  terminal: string | number;
  token: string;
}
export const authStore: AuthState = {
  get tenant() {
    const h = getElectricalSafetyContext().getAuthHeaders();
    return h.tenant ?? h.Tenant ?? "";
  },
  get terminal() {
    const h = getElectricalSafetyContext().getAuthHeaders();
    return h.terminal ?? h.Terminal ?? "";
  },
  get token() {
    const h = getElectricalSafetyContext().getAuthHeaders();
    return (h.Authorization ?? h.authorization ?? "").replace(/^Bearer\s+/i, "");
  },
};
