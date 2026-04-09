import type { Metadata } from "next";
import { TestLoginForm } from "./test-login-form";

/**
 * 카카오페이 PG 심사용 테스트 로그인 페이지.
 *
 * 일반 유저 플로우와 완전 분리된 이메일/패스워드 진입점.
 * Supabase에 사전 생성된 테스트 유저(kakaopay-review@dropdown.xyz)의
 * 자격 증명으로 로그인 후 /result로 자동 이동한다.
 *
 * - 어디에서도 링크되지 않으며 직접 URL 접근만 허용
 * - 검색엔진 차단 (noindex,nofollow)
 * - 카카오페이 PG 심사 통과 후 삭제 예정
 */
export const metadata: Metadata = {
  title: "테스트 로그인",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function TestLoginPage() {
  return <TestLoginForm />;
}
