/**
 * Root Layout - Arabic RTL Support
 */

import { Cairo } from "next/font/google";
import "./globals.css";

// Cairo font - excellent for Arabic
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo"
});

export const metadata = {
  title: "توزيعة الخدام علي النادي",
  description: "تنظيم جدول الخدمة وتوزيع المواعيد على الخدام",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className={cairo.className}>
        {children}
      </body>
    </html>
  );
}
