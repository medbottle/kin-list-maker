import { metadataByPath } from "@/lib/metadata";

export const metadata = {
  ...metadataByPath["/profile"],
  title: `List - ${metadataByPath["/profile"].title}`,
  description: "View and edit your character list",
};

export default function ListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

