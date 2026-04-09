"use client";

import { useState } from "react";
import { LegalLinks } from "@/components/ui/legal-links";

/**
 * 사이트 공통 푸터 — 사업자 정보 + 법무 링크.
 *
 * 랜딩(`/`)과 결과(`/result`) 하단에 표시된다.
 * 전자상거래법·정통망법 + 카카오페이 PG 심사 요구사항(사이트 하단 사업자 정보 명시)을 충족한다.
 *
 * 기본 노출: 상호명, 사업자등록번호, 통신판매업신고번호, 사업장 주소, 이용약관·개인정보처리방침 링크.
 * "사업자 확인하기" 토글: 대표자명, 전화번호, 대표 이메일 (공개 부담이 큰 항목 접어둠).
 */
export function SiteFooter() {
  const [expanded, setExpanded] = useState(false);

  return (
    <footer className="py-4 px-4 sm:px-5 border-t border-hanji-border shrink-0">
      <p className="text-xs text-ink-tertiary">드롭다운(Dropdown)</p>
      <p className="mt-0.5 text-xs text-ink-tertiary">사업자등록번호 154-28-02110</p>
      <p className="mt-0.5 text-xs text-ink-tertiary">통신판매업신고 제2026-서울송파-0882호</p>
      <p className="mt-0.5 text-xs text-ink-tertiary">서울특별시 송파구 중대로 207, 2층 201-J554호</p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 text-xs text-ink-tertiary hover:text-ink-muted underline underline-offset-2"
        aria-expanded={expanded}
      >
        {expanded ? "접기" : "사업자 확인하기"}
      </button>

      {expanded && (
        <div className="mt-1 space-y-0.5">
          <p className="text-xs text-ink-tertiary">대표자 황재하</p>
          <p className="text-xs text-ink-tertiary">전화 010-4624-8687</p>
          <p className="text-xs text-ink-tertiary">이메일 hello@dropdown.xyz</p>
        </div>
      )}

      <LegalLinks
        className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs"
        linkClassName="text-ink-tertiary hover:text-ink-muted"
        separator=" "
      />
    </footer>
  );
}
