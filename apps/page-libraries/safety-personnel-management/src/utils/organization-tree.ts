import type { Organization } from "@g2-contract/ouaa";

export interface OrganizationTreeNode {
  value: string;
  title: string;
  children?: OrganizationTreeNode[];
}

export function mapOrganizationsToTreeData(orgs: Organization[]): OrganizationTreeNode[] {
  return orgs
    .filter((org) => org.id != null)
    .map((org) => ({
      value: String(org.id),
      title: org.name ?? "",
      children: org.children?.length ? mapOrganizationsToTreeData(org.children) : undefined,
    }));
}
