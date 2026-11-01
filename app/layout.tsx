import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asset Ledger · Field Workspace",
  description: "A local field workspace prototype using synthetic demonstration assets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
