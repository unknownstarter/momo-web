import type { Metadata } from "next";
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";

export const metadata: Metadata = {
  title: "이용약관",
  description: "momo 서비스 이용약관",
};

const sections = [
  {
    title: "제1조 (목적)",
    body: "본 약관은 서비스 제공자(이하 \"회사\")가 운영하는 모바일 웹 서비스 momo(이하 \"서비스\")의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.",
  },
  {
    title: "제2조 (정의)",
    body: "• \"서비스\"란 회사가 제공하는 사주·관상 기반의 맞춤 정보 및 앱 출시 알림 신청 등을 포함한 모바일 웹 서비스를 말합니다.\n• \"이용자\"란 본 약관에 따라 서비스를 이용하는 모든 사용자를 말합니다.\n• \"콘텐츠\"란 서비스 내에서 제공되는 텍스트, 이미지, 분석 결과 등 모든 자료를 말합니다.",
  },
  {
    title: "제3조 (약관의 효력 및 변경)",
    body: "• 본 약관은 서비스 화면에 공지하거나 기타의 방법으로 이용자에게 공시함으로써 효력이 발생합니다.\n• 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 시행일자와 변경 내용을 명시하여 서비스 내 공지합니다. 이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단할 수 있습니다.",
  },
  {
    title: "제4조 (서비스의 제공)",
    body: "• 회사는 다음과 같은 서비스를 제공합니다.\n  - 카카오 계정을 이용한 로그인 및 회원 정보 관리\n  - 사주·관상 분석 결과의 생성 및 열람\n  - 분석 결과의 공유 링크 생성 및 열람\n  - 앱 출시 시 알림 수신을 위한 전화번호·수신 동의 수집 및 (앱 출시 시) 알림 발송\n  - 의견 보내기(서비스 개선을 위한 이용자 피드백 수집)\n  - 계정 설정(로그아웃, 회원 탈퇴)\n• 서비스는 연중 무휴를 원칙으로 하되, 회사의 사정 또는 기술적 사유로 일시 중단될 수 있으며 이 경우 사전 또는 사후에 공지할 수 있습니다.",
  },
  {
    title: "제5조 (이용 계약의 성립)",
    body: "이용 계약은 이용자가 카카오 로그인 등 회사가 정한 절차에 따라 서비스를 이용하고, 본 약관 및 개인정보처리방침에 동의함으로써 성립됩니다.",
  },
  {
    title: "제6조 (개인정보의 수집·이용)",
    body: "회사는 서비스 제공을 위해 필요한 범위에서 이용자의 개인정보를 수집·이용합니다. 수집 항목, 이용 목적, 보유 기간 등은 「개인정보처리방침」에 따르며, 이용자는 해당 방침을 확인할 수 있습니다.",
  },
  {
    title: "제7조 (이용자의 의무)",
    body: "이용자는 다음 각 호의 행위를 하여서는 안 됩니다.\n\n• 타인의 정보 도용 또는 부정한 방법으로 서비스 이용\n• 회사 또는 제3자의 저작권·초상권 등 지적재산권 또는 인격권 침해\n• 서비스 운영을 방해하거나 시스템·네트워크를 부정 사용하는 행위\n• 법령 또는 공서양속에 위배되는 행위\n• 기타 회사가 정한 이용 규칙에 위반하는 행위",
  },
  {
    title: "제8조 (회원 탈퇴 및 이용 계약의 해지)",
    body: "• 이용자는 서비스 내 설정 메뉴를 통해 언제든지 회원 탈퇴를 신청할 수 있습니다.\n• 탈퇴 신청 시 7일간의 유예 기간이 부여되며, 유예 기간 내 재로그인하여 탈퇴를 취소할 수 있습니다.\n• 유예 기간(7일)이 경과하면 계정 및 관련 데이터(사주·관상 분석 결과, 프로필 정보 등)가 영구 삭제되며 복구할 수 없습니다.\n• 탈퇴 완료 후 7일간 동일 계정으로의 재가입이 제한됩니다.\n• 회사는 이용자가 본 약관 또는 관련 법령을 위반한 경우, 사전 통지 없이 해당 이용자의 서비스 이용을 제한하거나 이용 계약을 해지할 수 있습니다.",
  },
  {
    title: "제9조 (콘텐츠의 성격)",
    body: "서비스에서 제공하는 사주·관상 분석 등 콘텐츠는 참고용·오락용이며, 과학적·의학적 근거에 따른 결과를 보장하지 않습니다. 이용자는 이를 참고하여 판단하며, 중요한 결정은 전문가 상담 등을 통해 하시기 바랍니다.",
  },
  {
    title: "제10조 (면책)",
    body: "• 회사는 천재지변, 전쟁, 서비스 설비 장애 등 회사의 귀책이 아닌 사유로 인한 서비스 중단·장애에 대해 책임을 지지 않습니다.\n• 회사는 이용자가 서비스 내에서 게시·공유한 내용 또는 제3자와의 분쟁에 대해 책임을 지지 않습니다.",
  },
  {
    title: "제11조 (준거법 및 관할)",
    body: "본 약관의 해석 및 회사와 이용자 간의 분쟁에 대해서는 대한민국 법률을 적용하며, 관할 법원은 회사의 본사 소재지 관할 법원으로 합니다.",
  },
  {
    title: "제12조 (문의처)",
    body: "서비스 및 본 약관에 대한 문의는 아래와 같습니다.\n\n• 서비스명: momo (모모)\n• 운영자: Dropdown\n• 사업자등록번호: 154-28-02110\n• 웹: fatemomo.xyz",
  },
];

export default function TermsPage() {
  return (
    <MobileContainer className="min-h-dvh flex flex-col bg-hanji text-ink">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 max-w-[430px] mx-auto">
        <Link href="/" className="inline-flex items-center text-sm text-ink-muted hover:text-ink mb-6">
          ← 홈으로
        </Link>
        <h1 className="text-xl font-bold text-ink mb-1">이용약관</h1>
        <p className="text-xs text-ink-tertiary mb-8">시행일: 2026년 3월 16일 (개정)</p>
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-sm font-semibold text-ink mb-2">{s.title}</h2>
              <div className="text-[13px] text-ink leading-relaxed whitespace-pre-line">
                {s.body}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-hanji-border">
          <Link href="/" className="text-sm text-brand font-medium">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </MobileContainer>
  );
}
