import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chrona · AI 项目管理",
  description: "把目标、优先级与时间安排放在一个智能工作空间中",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
