import type { ReactNode } from "react";

export default function MessagesLayout({ children }: { children: ReactNode }) {
  // no redirects, no auth logic here
  return <>{children}</>;
}
