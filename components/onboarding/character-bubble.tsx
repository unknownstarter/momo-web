"use client";

import { useState } from "react";
import Image from "next/image";

interface CharacterBubbleProps {
  character: "mulgyeori" | "bulkkori" | "soedongi" | "heuksuni" | "namuri";
  message: string;
}

const CHARACTER_IMAGE: Record<string, string> = {
  mulgyeori: "/images/characters/mulgyeori/default.png",
  bulkkori: "/images/characters/bulkkori/default.png",
  soedongi: "/images/characters/soedongi/default.png",
  heuksuni: "/images/characters/heuksuni/default.png",
  namuri: "/images/characters/namuri/default.png",
};

export function CharacterBubble({ character, message }: CharacterBubbleProps) {
  const [imgError, setImgError] = useState(false);
  const src = CHARACTER_IMAGE[character] ?? CHARACTER_IMAGE.mulgyeori;

  return (
    <div className="flex gap-3 items-start">
      <div className="relative w-14 h-14 shrink-0 rounded-full overflow-hidden bg-hanji-border flex items-center justify-center">
        {imgError ? (
          <span className="text-ink-tertiary text-lg" aria-hidden>👤</span>
        ) : (
          <Image
            src={src}
            alt=""
            width={56}
            height={56}
            className="object-cover"
            unoptimized
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="bg-hanji-elevated rounded-2xl rounded-tl-sm px-4 py-3 shadow-low border border-hanji-border max-w-[280px]">
        <p className="text-ink text-sm leading-relaxed whitespace-pre-line">
          {message}
        </p>
      </div>
    </div>
  );
}
