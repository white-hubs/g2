import { shallowRef } from "vue";

import { listFacilities } from "@/api/electrical-safety";

export interface FacilityReference {
  id: string;
  name: string;
}

const FACILITY_PAGE_SIZE = 20;

export const useFacilityReferences = () => {
  const facilities = shallowRef<FacilityReference[]>([]);
  const facilitiesLoading = shallowRef(false);
  const facilitiesExhausted = shallowRef(false);
  const nextPageNumber = shallowRef(1);

  const mergeFacilities = (items: FacilityReference[]): void => {
    const existing = new Set(facilities.value.map((item) => item.id));
    facilities.value = [...facilities.value, ...items.filter((item) => !existing.has(item.id))];
  };
  const loadMoreFacilities = async (): Promise<void> => {
    if (facilitiesLoading.value || facilitiesExhausted.value) {
      return;
    }
    facilitiesLoading.value = true;
    try {
      const pageNumber = nextPageNumber.value;
      const result = await listFacilities({ pageNumber, pageSize: FACILITY_PAGE_SIZE });
      mergeFacilities(
        result.records.map((facility) => ({
          id: String(facility.id),
          name: facility.facilityName,
        })),
      );
      nextPageNumber.value = pageNumber + 1;
      facilitiesExhausted.value = facilities.value.length >= Number(result.total) || result.records.length < FACILITY_PAGE_SIZE;
    } finally {
      facilitiesLoading.value = false;
    }
  };

  const ensureFacilityReference = (facility: FacilityReference): void => {
    if (!facilities.value.some((item) => item.id === facility.id)) {
      facilities.value = [facility, ...facilities.value];
    }
  };

  return {
    facilities,
    facilitiesLoading,
    facilitiesExhausted,
    loadMoreFacilities,
    ensureFacilityReference,
  };
};
