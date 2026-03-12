# 앱(Flutter) 레포 참고 가이드

웹 구현 시 **동일한 UX/문구/레이아웃**을 맞추기 위해 Flutter 앱 레포를 참고합니다.

---

## 앱 레포 경로

- **GitHub**: https://github.com/unknownstarter/momo-app (공개 레포, raw/API로 코드 조회 가능)
- **로컬**: `/Users/noah/momo` (CLAUDE.md에 명시, GitHub 클론 시 동일 구조)

**플로우·결과 스크린 스펙**: `docs/app-flow-and-result-spec.md` — 온보딩 15단계 순서, 사진 궁합 매칭 안내, 결과 화면(헤더·탭·CTA) 구성.

---

## GitHub에서 바로 읽을 수 있는 파일 (확인 완료)

| 웹 화면 | 앱 파일 (GitHub 경로) | 참고 포인트 |
|--------|------------------------|-------------|
| **분석 로딩** | `lib/features/destiny/presentation/pages/destiny_analysis_page.dart` | **GIF** 160×160, "잠시만 기다려 주세요", 단계 문구(`_phases` 5단계), 스텝 dots, 프로그레스 바, 다크 배경 |
| **온보딩** | `lib/features/auth/presentation/pages/onboarding_form_page.dart` | 7단계(이름→성별→생년월일→시진→SMS→사진→확인), 진행 방식 |

- **Raw URL 예**: `https://raw.githubusercontent.com/unknownstarter/momo-app/main/lib/features/destiny/presentation/pages/destiny_analysis_page.dart`
- GitHub 레포에선 `auth/presentation/widgets/`(step_birth_time 등) 폴더가 없고, 온보딩이 한 페이지에 구현된 버전으로 보임. 시진 한자·시간대 등 상세 UI는 **로컬** `lib/features/auth/presentation/widgets/onboarding_steps/step_birth_time.dart` 참고.

## 로컬에만 있을 수 있는 참고 파일

| 웹 화면 | 앱 파일 (로컬) | 참고 포인트 |
|--------|----------------|-------------|
| **시진 선택** | `lib/features/auth/presentation/widgets/onboarding_steps/step_birth_time.dart` | 12시진 그리드, **한자+시간대** 표기, "모르겠어요" 칩 |
| **생년월일** | `step_birth_date.dart` | 날짜 입력 UI |
| **사진** | `step_photo.dart` | 정면 사진 안내 문구 |

---

## 에셋 공유

- **캐릭터 이미지**: 앱 `assets/images/characters/` → 웹 `public/images/characters/` 에 복사
- **로딩 GIF**: `loading_spinner.gif` — 분석 로딩 화면 상단에 동일하게 배치

---

## 문구·단계 일치

- 시진: 각 옵션에 **한자(子時 등) + 시간대(23:00~01:00)** 노출
- 로딩: "잠시만 기다려 주세요" / "분석이 끝날 때까지 화면을 유지해 주세요" + 단계별 타이틀/서브
- 앱의 `_phases`(destiny_analysis_page.dart)와 웹 `LOADING_MESSAGES` 개수·톤 맞추기

---

## GitHub로 스크린 정보 가져오는 방법

1. **단일 파일**:  
   `https://raw.githubusercontent.com/unknownstarter/momo-app/main/파일경로`  
   예: `.../main/lib/features/destiny/presentation/pages/destiny_analysis_page.dart`

2. **폴더 목록**:  
   `https://api.github.com/repos/unknownstarter/momo-app/contents/lib/features/...`  
   → 어떤 화면/위젯 파일이 있는지 확인 후 raw로 해당 파일 조회

3. **트리(재귀)**:  
   `https://api.github.com/repos/unknownstarter/momo-app/git/trees/해당폴더_sha?recursive=1`  
   → 하위 경로까지 한 번에 확인

앞으로 화면 추가·수정 시 GitHub raw URL 또는 로컬 경로를 열어 두고 1:1 대응하면 됩니다.
