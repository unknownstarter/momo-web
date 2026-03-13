import type { Metadata } from "next";
import "../styles/globals.css";
import { LayoutContent } from "@/components/layout-content";

const metadataBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

export const metadata: Metadata = {
  ...(metadataBaseUrl ? { metadataBase: new URL(metadataBaseUrl) } : {}),
  title: "사주와 관상이 알려주는 내 인연",
  description: "진짜 나랑 잘 맞는 사람 누구야? 👀",
  icons: {
    icon: "/images/momo_logo_1024.png",
    apple: "/images/momo_logo_1024.png",
  },
  openGraph: {
    title: "사주와 관상이 알려주는 내 인연",
    description: "진짜 나랑 잘 맞는 사람 누구야? 👀",
    images: ["/images/momo_og_image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "사주와 관상이 알려주는 내 인연",
    description: "진짜 나랑 잘 맞는 사람 누구야? 👀",
    images: ["/images/momo_og_image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-pretendard antialiased">
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
