import { metadataByPath, siteMetadata } from "@/lib/metadata";

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

