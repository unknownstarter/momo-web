"use client";

import { useEffect } from "react";
import { trackMainView } from "@/lib/analytics";

/** 랜딩(/) 마운트 시 main_view 1회 전송 */
export function TrackMainView() {
  useEffect(() => {
    trackMainView();
  }, []);
  return null;
}
