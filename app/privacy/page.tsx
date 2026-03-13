import type { Metadata } from "next";
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "momo 개인정보처리방침",
};

const sections = [
  {
    title: "제1조 (목적)",
    body: "본 개인정보처리방침은 서비스 제공자(이하 \"회사\")가 운영하는 모바일 웹 서비스 momo(이하 \"서비스\")에서 이용자의 개인정보를 어떻게 수집·이용·보관·파기하는지, 이용자에게 어떤 권리가 있는지를 규정함을 목적으로 합니다.",
  },
  {
    title: "제2조 (수집하는 개인정보 항목 및 수집 방법)",
    body: "회사는 서비스 제공을 위해 아래와 같이 개인정보를 수집합니다.\n\n• 수집 항목\n  - 필수: 카카오 계정 연동 시 식별자, 이름(닉네임), 성별, 생년월일·출생 시각, 프로필 사진(얼굴 사진)\n  - 선택: 키, 직업, 활동 지역, 체형, 종교, 자기소개, 관심사, 이상형\n  - 앱 출시 알림 신청 시: 전화번호, (선택) 마케팅 정보 수신 동의 여부\n\n• 수집 방법: 서비스 내 회원가입·온보딩·알림 신청 화면을 통한 직접 입력, 카카오 로그인을 통한 프로필 정보 제공",
  },
  {
    title: "제3조 (개인정보의 이용 목적)",
    body: "회사는 수집한 개인정보를 다음 목적으로만 이용합니다.\n\n• 서비스 제공: 사주·관상 분석 결과 생성 및 표시, 본인 확인\n• 앱 출시 알림: 전화번호로 서비스(앱) 출시 시 알림 발송 (동의한 경우에 한함)\n• 서비스 개선: 익명화·통계 처리된 데이터를 활용한 이용 현황 분석\n• 법령 준수: 관련 법령에 따른 보존·제출",
  },
  {
    title: "제4조 (개인정보의 보유 및 이용 기간)",
    body: "회사는 이용 목적이 달성된 후 해당 정보를 지체 없이 파기합니다. 단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.\n\n• 회원 정보: 회원 탈퇴 또는 동의 철회 시 파기 (법령에 따른 보존 기간이 있으면 해당 기간 보관 후 파기)\n• 앱 출시 알림용 전화번호: 알림 발송 완료 후 또는 동의 철회 시 파기\n• 전자상거래 등에서의 소비자 보호에 관한 법률 등: 표시된 보존 기간에 따름",
  },
  {
    title: "제5조 (개인정보의 제3자 제공)",
    body: "회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 법령에 의해 요구되거나 이용자가 사전에 동의한 경우에 한하여 제공할 수 있으며, 이 경우 별도의 동의 절차를 진행합니다.",
  },
  {
    title: "제6조 (개인정보 처리 위탁)",
    body: "회사는 원활한 서비스 제공을 위해 필요한 범위에서 개인정보 처리 업무를 위탁할 수 있으며, 위탁 시 위탁 업무 내용과 수탁자를 이용자에게 고지합니다. 수탁자에 대한 관리·감독을 수행합니다.",
  },
  {
    title: "제7조 (이용자의 권리)",
    body: "이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있으며, 회사는 이에 대해 지체 없이 필요한 조치를 하겠습니다. 요청 방법은 서비스 내 문의 또는 아래 고지된 연락처를 이용해 주시기 바랍니다.",
  },
  {
    title: "제8조 (쿠키 등)",
    body: "서비스는 로그인 세션 유지 등 서비스 운영에 필요한 최소한의 기술적 저장 수단(쿠키 등)을 사용할 수 있습니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 기능 이용에 제한이 있을 수 있습니다.",
  },
  {
    title: "제9조 (개인정보의 안전성 확보)",
    body: "회사는 개인정보의 안전한 처리를 위해 기술적·관리적 보안 조치를 취하며, 개인정보 처리에 접근할 수 있는 자를 최소화하고 접근 권한을 관리합니다.",
  },
  {
    title: "제10조 (개인정보처리방침의 변경)",
    body: "본 방침은 법령·정책 또는 서비스 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지 또는 별도 안내를 통해 고지합니다. 시행일자와 변경 내용이 중요한 경우 이를 명시합니다.",
  },
  {
    title: "제11조 (문의처)",
    body: "개인정보 처리와 관련한 문의·요청은 아래로 연락해 주시기 바랍니다.\n\n• 서비스명: momo (모모)\n• 운영자: Dropdown\n• 사업자등록번호: 154-28-02110\n• 웹: fatemomo.xyz",
  },
];

export default function PrivacyPage() {
  return (
    <MobileContainer className="min-h-dvh flex flex-col bg-hanji text-ink">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 max-w-[430px] mx-auto">
        <Link href="/" className="inline-flex items-center text-sm text-ink-muted hover:text-ink mb-6">
          ← 홈으로
        </Link>
        <h1 className="text-xl font-bold text-ink mb-1">개인정보처리방침</h1>
        <p className="text-xs text-ink-tertiary mb-8">시행일: 2026년 3월 13일</p>
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
