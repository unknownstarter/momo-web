import type { Metadata } from "next";
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";

export const metadata: Metadata = {
  title: "환불정책",
  description: "momo 환불정책",
};

const sections = [
  {
    title: "제1조 (목적)",
    body: "본 환불정책은 서비스 제공자(이하 \"회사\")가 운영하는 momo(이하 \"서비스\")에서 유료 디지털 콘텐츠 구매에 대한 청약철회, 환불 조건 및 절차를 안내합니다.",
  },
  {
    title: "제2조 (유료 서비스의 범위)",
    body: "본 정책이 적용되는 유료 서비스는 다음과 같습니다.\n\n• 더 자세한 사주 보기 — 13가지 영역의 심층 사주 분석 결과 열람\n• 더 자세한 관상 보기 — 13가지 영역의 심층 관상 분석 결과 열람\n\n위 서비스는 결제 즉시 디지털 콘텐츠(분석 결과)가 생성·제공되는 형태이며, 물리적 배송이 수반되지 않습니다.",
  },
  {
    title: "제3조 (청약철회 및 환불)",
    body: "1. 이용자는 결제일로부터 7일 이내에 청약철회(환불)를 요청할 수 있습니다.\n\n2. 단, 다음의 경우 「전자상거래 등에서의 소비자 보호에 관한 법률」 제17조 제2항 제5호에 따라 청약철회가 제한될 수 있습니다.\n   • 디지털 콘텐츠(분석 결과)를 이미 열람한 경우\n   • 회사가 청약철회 제한 사실을 결제 전에 고지하고 이용자가 이에 동의한 경우\n\n3. 콘텐츠를 열람하지 않은 상태에서의 환불 요청은 전액 환불됩니다.",
  },
  {
    title: "제4조 (환불 방법 및 처리 기간)",
    body: "1. 환불은 원래 결제 수단으로 처리됩니다.\n   • 신용카드 결제: 카드사를 통한 결제 취소 (취소 후 카드사 처리 기간에 따라 3~7영업일 소요)\n   • 계좌이체 결제: 이용자가 지정한 계좌로 환불 (접수 후 3~5영업일 소요)\n\n2. 환불 처리 기간은 결제 대행사(PG사) 및 카드사의 처리 절차에 따라 달라질 수 있습니다.",
  },
  {
    title: "제5조 (환불 신청 방법)",
    body: "환불을 원하시는 경우 아래 연락처로 요청해 주세요.\n\n• 이메일: hello@dropdown.xyz\n• 요청 시 기재 사항: 결제자 이메일, 결제일시, 결제 상품명, 환불 사유\n\n회사는 환불 요청 접수 후 3영업일 이내에 처리 결과를 안내합니다.",
  },
  {
    title: "제6조 (기타)",
    body: "1. 본 정책에서 정하지 않은 사항은 「전자상거래 등에서의 소비자 보호에 관한 법률」 및 관계 법령에 따릅니다.\n2. 본 정책은 서비스 변경 시 사전 고지 후 개정될 수 있습니다.",
  },
];

export default function RefundPolicyPage() {
  return (
    <MobileContainer className="min-h-dvh flex flex-col bg-hanji text-ink">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 max-w-[430px] mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-ink-muted hover:text-ink mb-6"
        >
          &larr; 홈으로
        </Link>
        <h1 className="text-xl font-bold text-ink mb-1">환불정책</h1>
        <p className="text-xs text-ink-tertiary mb-8">
          시행일: 2026년 4월 9일
        </p>
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-sm font-semibold text-ink mb-2">
                {s.title}
              </h2>
              <div className="text-[13px] text-ink leading-relaxed whitespace-pre-line">
                {s.body}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-hanji-border">
          <p className="text-xs text-ink-tertiary mb-3">
            드롭다운(Dropdown) | 사업자등록번호 154-28-02110
          </p>
          <Link href="/" className="text-sm text-brand font-medium">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </MobileContainer>
  );
}
