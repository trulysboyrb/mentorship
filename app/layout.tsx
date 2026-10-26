import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import Extras from "@/components/Extras";
import MaintenanceGate from "@/components/MaintenanceGate";
import { getSiteStatus } from "@/lib/siteStatus";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "800", "900"],
});

export const metadata: Metadata = {
  title: "ApexTrade Academy",
  description:
    "Learn modern trading and blockchain skills, structured into clear modules.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getSiteStatus();
  return (
    <html lang="en" className={inter.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <div className="glow-bg" />
        <PwaRegister />
        <Extras />
        <div id="app-content">{children}</div>
        <MaintenanceGate initialMaintenance={site.maintenance} initialIsAdmin={site.is_admin} />
      </body>
    </html>
  );
}
