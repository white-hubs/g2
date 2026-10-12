import { formatDateTimeValue, isCertificateExpired, type FumigationWork, type FumigationWorkPerson, type WorkerOption } from "./state";

export interface WorkerTableRow {
  id: string;
  name: string;
  certNo: string;
  certExpireAt: string;
  certStatus: "missing" | "expired" | "valid";
}

export const sameSnowflakeId = (left: unknown, right: unknown): boolean => String(left ?? "").trim() === String(right ?? "").trim();

const toWorkerOption = (person: FumigationWorkPerson): WorkerOption => ({
  id: person.userId,
  name: person.name,
  role: person.role || person.postName || "作业人员",
  department: person.department || "",
  phone: person.phone || "",
  certificates:
    person.certId || person.certName || person.certNo || person.certExpireAt
      ? [
          {
            id: person.certId || person.userId,
            name: person.certName || "安全证书",
            no: person.certNo || "",
            expireAt: person.certExpireAt || "",
            ...(person.certExpired != null ? { expired: person.certExpired } : {}),
          },
        ]
      : [],
  source: "security-personnel-service",
});

export const resolveWorkWorkers = (work: FumigationWork | undefined): WorkerOption[] => {
  if (work == null) {
    return [];
  }
  const workers = work.workers ?? [];
  if (workers.length > 0) {
    return workers.map(toWorkerOption);
  }
  return [];
};

const WORKER_ROLE_LABELS: Record<string, string> = {
  GUARDIAN: "安全监护",
  WORKER: "作业人员",
  SITE_LEADER: "现场负责人",
  TECHNICAL_LEAD: "技术负责人",
  SAFETY_LEAD: "安全负责人",
  SUPERVISOR: "监护人",
};

export const translateWorkerRole = (role: string | undefined): string => {
  const value = role?.trim() ?? "";
  if (value === "") {
    return "作业人员";
  }
  return WORKER_ROLE_LABELS[value] ?? value;
};

export const buildWorkerTableRows = (work: FumigationWork | undefined): WorkerTableRow[] =>
  resolveWorkWorkers(work).map((worker) => {
    const certificate = worker.certificates[0];
    const certStatus = certificate == null ? "missing" : (certificate.expired ?? isCertificateExpired(certificate)) ? "expired" : "valid";
    return {
      id: worker.id,
      name: worker.name || "--",
      certNo: certificate?.no || "--",
      certExpireAt: formatDateTimeValue(certificate?.expireAt, "--", "YYYY-MM-DD"),
      certStatus,
    };
  });
