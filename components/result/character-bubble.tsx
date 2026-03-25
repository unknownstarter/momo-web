"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ELEMENT_COLORS, elementKey } from "@/lib/result-tokens";

export function CharacterBubble({
  characterType,
  userNickname,
  message,
  dominantElement,
}: {
  characterType: string;
  userNickname: string;
  message: string;
  dominantElement?: string | null;
}) {
  const key = elementKey(dominantElement ?? characterType ?? null);
  const colors = ELEMENT_COLORS[key];
  const main = colors?.main ?? ELEMENT_COLORS.metal.main;
  const pastel = colors?.pastel ?? ELEMENT_COLORS.metal.pastel;
  const [imageSrc, setImageSrc] = useState(`/images/characters/${characterType || "namuri"}/default.png`);

  useEffect(() => {
    setImageSrc(`/images/characters/${characterType || "namuri"}/default.png`);
  }, [characterType]);

  const handleImageError = () => {
    setImageSrc("/images/characters/namuri/default.png");
  };

  return (
    <div className="flex gap-2 items-start">
      <div
        className="w-12 h-12 rounded-full border-2 shrink-0 overflow-hidden flex items-center justify-center bg-cover bg-center"
        style={{ backgroundColor: pastel, borderColor: `${main}4D` }}
      >
        <Image
          src={imageSrc}
          alt=""
          width={32}
          height={32}
          className="object-contain"
          unoptimized
          onError={handleImageError}
        />
      </div>
      <div className="flex-1 min-w-0">
        {userNickname ? <p className="text-[13px] font-semibold" style={{ color: main }}>{userNickname}</p> : null}
        <div className="mt-1 p-3 rounded-b-card rounded-tr-card border border-hanji-border bg-white">
          <p className="text-sm text-ink leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}
