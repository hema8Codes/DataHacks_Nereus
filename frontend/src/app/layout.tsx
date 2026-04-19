import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nereus — Marine Heatwave Intelligence",
  description: "Ask Nereus where the next marine heatwave is hitting, on a living 3D globe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink text-white">{children}</body>
    </html>
  );
}
