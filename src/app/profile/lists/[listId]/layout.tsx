import { metadataByPath } from "@/lib/metadata";
import { siteMetadata } from "@/lib/siteMetadata";

export const metadata = {
  ...metadataByPath["/profile"],
  title: `List - ${metadataByPath["/profile"].title ?? siteMetadata.name}`,
  description: "View and edit your character list",
};

export default function ListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

