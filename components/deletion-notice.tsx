"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

export function DeletionNotice() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"pending" | "deleted" | null>(null);
  const [remainDays, setRemainDays] = useState(0);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "pending_deletion") {
      setType("pending");
      setRemainDays(Number(searchParams.get("days")) || 7);
      setOpen(true);
    } else if (error === "account_deleted") {
      setType("deleted");
      setOpen(true);
    }
  }, [searchParams]);

  const handleClose = () => {
    setOpen(false);
    // URL에서 query param 제거
    window.history.replaceState(null, "", "/");
  };

  if (!type) return null;

  return (
    <BottomSheet open={open} onClose={handleClose} showCloseButton>
      {type === "pending" ? (
        <div className="pt-2 pb-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#FEF2F2] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mt-4 text-[17px] font-semibold text-ink">
            탈퇴 처리 중인 계정입니다
          </h3>
          <p className="mt-3 text-sm text-ink-muted leading-relaxed">
            회원 탈퇴가 신청된 계정입니다.<br />
            <strong className="text-ink font-semibold">남은 유예 기간: {remainDays}일</strong>
          </p>
          <p className="mt-2 text-sm text-ink-tertiary leading-relaxed">
            유예 기간이 지나면 계정이 영구 삭제되며,<br />
            그 이후 다시 가입하실 수 있습니다.
          </p>
          <Button size="lg" className="w-full mt-6" onClick={handleClose}>
            확인
          </Button>
        </div>
      ) : (
        <div className="pt-2 pb-4 text-center">
          <h3 className="mt-2 text-[17px] font-semibold text-ink">
            계정이 삭제되었습니다
          </h3>
          <p className="mt-3 text-sm text-ink-muted leading-relaxed">
            탈퇴 유예 기간이 만료되어<br />
            계정이 영구 삭제되었습니다.
          </p>
          <p className="mt-2 text-sm text-ink-tertiary leading-relaxed">
            새로 가입하시면 다시 이용하실 수 있습니다.
          </p>
          <Button size="lg" className="w-full mt-6" onClick={handleClose}>
            확인
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
