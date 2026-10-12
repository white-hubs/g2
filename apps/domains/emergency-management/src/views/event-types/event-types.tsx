import { createCategoryPage } from "../category/category-page";
import { getEmergencyManagementClient } from "@/domain-context";
import { unwrapPage } from "@/utils";

export const EventTypes = createCategoryPage({
  tableCode: "EMERGENCY_CENTER_EVENT_TYPE",
  api: {
    list: async (params) => unwrapPage(await getEmergencyManagementClient().listEventTypes(params)),
    create: (data) => getEmergencyManagementClient().createEventType(data),
    update: (data) => getEmergencyManagementClient().updateEventType(data),
    remove: (id) => getEmergencyManagementClient().deleteEventType(id),
  },
});
