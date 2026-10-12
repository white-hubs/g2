import type { SecureEduPages } from "@g2-pages/secure-edu";
import { defineComponent, h, provide } from "vue";
import { useRouter } from "vue-router";
let pages: SecureEduPages | undefined;
export function installSharedPages(next: SecureEduPages) {
  pages = next;
}
export function sharedPage(slug: string, editor = false) {
  return defineComponent({
    setup() {
      const router = useRouter();
      provide("secureEdu:navigation", {
        basePath: "/d/secure-edu-head",
        headquarters: true,
        push: (location: Parameters<typeof router.push>[0]) => router.push(location),
      });
      if (!pages) {
        throw new Error("安全教育共享页面未安装");
      }
      const page = editor ? pages.createEditor(slug) : pages.getPage(slug);
      return () => h(page);
    },
  });
}
