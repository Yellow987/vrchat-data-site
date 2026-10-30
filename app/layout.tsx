import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bio Telemetry — sleep, body & movement",
  description:
    "A living dashboard of my sleep, recovery, body weight, lifts and VR-dance cardio. Signal over noise, trends over absolutes.",
  openGraph: {
    title: "Bio Telemetry",
    description:
      "Sleep, recovery, body weight, lifts and VR-dance cardio — tracked nightly.",
    type: "website",
  },
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
