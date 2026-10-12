import { createCategoryPage } from "../category/category-page";
import { getEmergencyManagementClient } from "@/domain-context";
import { unwrapPage } from "@/utils";

export const FileTypes = createCategoryPage({
  tableCode: "EMERGENCY_CENTER_FILE_TYPE",
  api: {
    list: async (params) => unwrapPage(await getEmergencyManagementClient().listFileTypes(params)),
    create: (data) => getEmergencyManagementClient().createFileType(data),
    update: (data) => getEmergencyManagementClient().updateFileType(data),
    remove: (id) => getEmergencyManagementClient().deleteFileType(id),
  },
});
