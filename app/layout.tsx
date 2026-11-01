import type { Metadata } from "next";
import "./globals.css";
import "./landing.css";
export const metadata: Metadata = {
  title: "Crossroads — A New Kind of Decision Harness",
  description:
    "Stop asking AI what to do. Start testing what could happen. Explore choices, challenge assumptions, and stress-test trade-offs with your personal AI decision harness.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
