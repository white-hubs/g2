import type { SecureEduPages } from "@g2-pages/secure-edu";
import { defineComponent, h, provide } from "vue";
import { useRouter } from "vue-router";
let pages: SecureEduPages | undefined;
export const installPages = (next: SecureEduPages) => {
  pages = next;
};
export function getPages(): SecureEduPages {
  if (!pages) {
    throw new Error("安全教育共享页面尚未安装");
  }
  return pages;
}
export function createHost(slug: string, editor = false) {
  return defineComponent({
    setup() {
      const router = useRouter();
      provide("secureEdu:navigation", {
        basePath: "/d/secure-edu",
        push: (location: Parameters<typeof router.push>[0]) => router.push(location),
      });
      const page = editor ? getPages().createEditor(slug) : getPages().getPage(slug);
      return () => h(page);
    },
  });
}
