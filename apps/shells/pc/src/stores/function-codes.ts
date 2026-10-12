import { defineStore } from "pinia";
import { ref } from "vue";

export const useFunctionCodesStore = defineStore("functionCodes", () => {
  const codes = ref<Set<string>>(new Set());
  const loaded = ref(false);

  function setCodes(list: string[]): void {
    codes.value = new Set(list);
    loaded.value = true;
  }

  function has(code: string): boolean {
    return loaded.value && codes.value.has(code);
  }

  function isDomainVisible(domainName: string): boolean {
    return has(`domain:${domainName}:visible`);
  }

  function snapshot(): ReadonlySet<string> {
    return new Set(codes.value);
  }

  return { setCodes, has, isDomainVisible, snapshot, loaded };
});
