import { reactive } from "vue";
const state = reactive({ permissionId: "", functionsCodes: [] as string[] });
export const mainStore = () => state;
