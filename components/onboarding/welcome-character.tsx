"use client";

import Image from "next/image";

/**
 * 온보딩 Step 0(닉네임) 전용 환영 캐릭터 + 말풍선.
 *
 * 입력칸 아래 빈 공간을 채워 광고 첫 인상을 따뜻하게 만드는 용도.
 * 기존 Step 0 레이아웃(CharacterBubble "반가워요!" + input)은 그대로 두고,
 * 이 컴포넌트만 input 아래에 추가된다.
 *
 * 에셋: /public/images/characters/namuri/loading_spinner.gif (움직이는 GIF)
 * 말풍선: whitespace-pre-line으로 명시적 \n 줄바꿈 존중 + break-keep으로 단어 중간 안 끊김.
 */
const WELCOME_MESSAGE = `어서와~!
요즘 연애운이 핫한데 너도 보러 왔구나?
너에 대해 알려주면 알려줄게!`;

export function WelcomeCharacter() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-hanji-border bg-element-water-pastel flex items-center justify-center shadow-low">
        <Image
          src="/images/characters/namuri/loading_spinner.gif"
          alt=""
          width={64}
          height={64}
          className="object-contain"
          unoptimized
        />
      </div>
      <div className="bg-hanji-elevated rounded-2xl px-5 py-4 shadow-low border border-hanji-border max-w-[340px]">
        <p className="text-ink text-[15px] leading-relaxed whitespace-pre-line break-keep text-left">
          {WELCOME_MESSAGE}
        </p>
      </div>
    </div>
  );
}
