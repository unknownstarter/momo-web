import type { Metadata } from "next";
import Link from "next/link";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "momo — 사주가 알고 있는 나의 인연",
  description:
    "사주와 관상으로 나를 알아가고, 궁합 좋은 인연을 만나보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-pretendard antialiased">
        <div className="max-w-mobile min-h-dvh mx-auto flex flex-col bg-hanji border-x border-[#E0DCD7] px-5">
          <div className="flex-1 min-h-0 flex flex-col">
            {children}
          </div>
          <footer className="shrink-0 py-4 border-t border-hanji-border">
            <p className="text-xs text-ink-tertiary">Dropdown © 2026</p>
            <div className="mt-1 flex gap-3 text-xs text-ink-tertiary">
              <Link href="/privacy" className="hover:text-ink-muted">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="hover:text-ink-muted">
                이용약관
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
