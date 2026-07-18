import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import "./swiss.css";

export const metadata: Metadata = {
  title: "DEV LIFE | Developer Workspace",
  description: "พื้นที่ทำงานสำหรับวางแผน จัดการ Git และติดตามข่าวสำหรับนักพัฒนา",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="th"
        className="h-full antialiased"
        data-scroll-behavior="smooth"
      >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
