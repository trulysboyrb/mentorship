import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="glow-bg" />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
