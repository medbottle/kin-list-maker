import { metadataByPath } from "@/lib/metadata";

export const metadata = metadataByPath["/login"];

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

