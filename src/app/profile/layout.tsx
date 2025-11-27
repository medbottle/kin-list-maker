import { metadataByPath } from "@/lib/metadata";

export const metadata = metadataByPath["/profile"];

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

