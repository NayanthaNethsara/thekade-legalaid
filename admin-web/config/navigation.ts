import { LayoutDashboard, Database, FileCheck, LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "System health and high-level metrics",
  },
  {
    label: "RAG & Knowledge Base",
    href: "/dashboard/rag",
    icon: Database,
    description: "Ingestion pipeline tuning and vector retrieval playground",
  },
  {
    label: "Document Verification",
    href: "/dashboard/verification",
    icon: FileCheck,
    description: "Legal aid applicant document inspection and audit queue",
  },
];
