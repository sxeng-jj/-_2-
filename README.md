# 제주잇길 (JEJU IT-GIL)

제주 역사·문화 데이터(공공데이터포털 Open API: 위치정보 + 일반정보, 120곳)로 장소를 지도에서 탐색하고,
찜한 순서대로 여행 코스를 만들고, 다녀온 곳을 기록하는 웹사이트.

- **스택**: Vite · React 19 · TypeScript · Tailwind CSS 4 · Leaflet
- **로그인/회원가입**: Supabase Auth (이메일 + 비밀번호)
- **이미지**: Pixabay API (Vercel 서버리스 함수 `api/pixabay.ts` 로 키를 서버에서만 사용)
- **배포**: Vercel

---

## 환경 변수 5개

| 이름 | 어디서 얻나 | 브라우저 노출 |
|---|---|---|
| `JEJU_CULTURE_INFO_KEY` | 공공데이터포털 [제주역사문화일반정보](https://www.data.go.kr/data/15109587/fileData.do) 활용신청 후 **일반 인증키(Decoding)** | **안 됨** (서버 전용) |
| `JEJU_CULTURE_LOCATION_KEY` | 공공데이터포털 [제주역사문화위치정보](https://www.data.go.kr/data/15109570/fileData.do) 활용신청 후 **일반 인증키(Decoding)** | **안 됨** (서버 전용) |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** | 됨 (공개용) |
| `VITE_SUPABASE_ANON_KEY` | 같은 화면의 **anon public** 키 | 됨 (공개용, RLS로 보호) |
| `PIXABAY_API_KEY` | https://pixabay.com/api/docs/ 로그인 후 문서 상단의 Key | **안 됨** (서버 전용) |

> `service_role` 키는 절대 사용하지 마세요. 이 프로젝트는 anon 키만 씁니다.

---

## 절차 1. Supabase 준비

1. https://supabase.com 가입 → **New project** 생성 (Region: Northeast Asia (Seoul) 권장, DB 비밀번호는 따로 보관).
2. 프로젝트가 만들어지면 **Project Settings → API** 에서 `Project URL` 과 `anon public` 키를 복사해 둡니다.
3. **Authentication → Providers → Email** 이 켜져 있는지 확인합니다.
   - 기본값은 가입 시 **확인 메일 인증이 필요**합니다. 앱은 이 경우 "확인 메일을 보냈어요" 화면을 보여줍니다.
   - 수업/테스트 중 인증 없이 바로 쓰고 싶으면 **Confirm email** 을 끄세요.
4. **Authentication → URL Configuration**
   - **Site URL**: 배포 후 Vercel 주소 (예: `https://jeju-itgil.vercel.app`)
   - **Redirect URLs**: `http://localhost:5173/**` 와 Vercel 주소 `/**` 를 추가
   (인증 메일의 링크가 이 주소로 돌아옵니다.)

## 절차 2. Pixabay 키

1. https://pixabay.com 가입 및 로그인.
2. https://pixabay.com/api/docs/ 문서 페이지에 **Key** 가 표시됩니다. 복사해 둡니다.
3. 이용 조건: 받은 이미지는 사진 하단의 "Image by … · Pixabay" 출처 링크와 함께 표시합니다. 응답은 24시간 캐시합니다.

## 절차 3. 내 컴퓨터에서 실행

```bash
cd jeju-itgil
npm install
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
# .env.local 을 열어 위 3개 값을 채운다
npm run dev
```

`.env.local` 은 `.gitignore` 에 들어 있어 GitHub 에 올라가지 않습니다. 환경 변수를 바꾸면 `npm run dev` 를 다시 시작하세요.

## 절차 4. GitHub 에 올리기

```bash
git init -b main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<내계정>/jeju-itgil.git
git push -u origin main
```

(GitHub 에서 빈 저장소를 먼저 만들어 두세요. README/ .gitignore 추가 옵션은 끄기)

## 절차 5. Vercel 배포

1. https://vercel.com 에 GitHub 계정으로 로그인 → **Add New… → Project** → 방금 올린 저장소 **Import**.
2. Framework Preset: **Vite** (자동 감지). Build Command `npm run build`, Output Directory `dist` 그대로 둡니다.
3. **Environment Variables** 에 5개를 입력합니다 (Production/Preview/Development 모두 체크).
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `PIXABAY_API_KEY`
   - `JEJU_CULTURE_INFO_KEY`
   - `JEJU_CULTURE_LOCATION_KEY`
4. **Deploy**. 완료되면 받은 주소(`*.vercel.app`)를 Supabase **Site URL / Redirect URLs** 에 넣습니다 (절차 1-4).
5. 환경 변수를 나중에 바꾸면 Vercel → Deployments → 최신 배포 **Redeploy** 해야 반영됩니다. (`VITE_` 값은 빌드 시점에 코드에 들어갑니다.)

---

## 구조

| 경로 | 역할 |
|---|---|
| `api/pixabay.ts` | Pixabay 검색 프록시 (Vercel 함수, 키는 서버에서만 사용) |
| `api/places.ts`, `api/_culture.ts` | 제주 역사문화 Open API 2개(위치·일반정보)를 서버에서 호출해 "데이터 고유번호"로 합쳐 내려주는 Vercel 함수 (24시간 CDN 캐시) |
| `src/store/PlacesContext.tsx` | `/api/places` 로 장소를 불러옴. API 를 못 쓰면(더블클릭 실행·키 미설정·점검) 내장 사본 `src/data/places.json` 으로 대체 |
| `scripts/build-data.mjs` | 내장 사본 `src/data/places.json` 을 CSV 에서 다시 만드는 스크립트 (`npm run data`, 선택 사항) |
| `src/lib/supabase.ts` | Supabase 클라이언트 (환경변수가 없으면 게스트 모드) |
| `src/store/AuthContext.tsx` | 회원가입 · 로그인 · 로그아웃 · 세션 유지 |
| `src/store/TripContext.tsx` | 찜(코스)·하루 나누기·방문 기록 상태 |
| `src/lib/share.ts` | 코스 공유 링크(`#c=장소id.…&b=…`) 만들기·읽기 — 서버 없이 링크만으로 공유 |
| `src/components/WelcomeGuide.tsx` | 첫 방문 이용 안내 (헤더의 `?` 버튼으로 다시 열기) |
| `src/lib/storage.ts` | 저장소 인터페이스 `TripStorage` (지금은 계정별 localStorage) |
| `src/lib/pixabay.ts`, `components/PixabayPhoto.tsx` | 이미지 검색·표시 |
| `src/components/` | MapView, ExplorePanel, PlaceDetail, CoursePanel, VisitLog, AuthModal … |

## 다음 확장 아이디어
- **기록 클라우드 동기화**: `TripStorage` 를 Supabase 테이블(`trips`, RLS: 본인 행만) 어댑터로 교체하면 기기 간 동기화가 됩니다. 화면 코드는 그대로입니다.
- **코스 공유**: 코스는 장소 id 배열(`TripData.course`)이라 공유 링크/테이블 저장이 쉽습니다.
- **일정 최적화**: `lib/geo.ts` 의 거리 함수 위에 순서 최적화를 얹을 수 있습니다.

## 문제 해결
- 비밀번호 재설정/인증 메일의 링크가 엉뚱한 곳으로 감 → Supabase **Authentication → URL Configuration** 의 Site URL·Redirect URLs 에 배포 주소(와 `http://localhost:5173`)를 넣으세요. 앱은 메일 링크가 돌아올 주소로 현재 주소를 보냅니다.
- 내 위치 버튼이 안 됨 → 브라우저의 위치 권한을 허용하세요. 위치 기능은 `https` 또는 `localhost` 에서만 동작합니다.
- 로그인 창에 "Supabase가 연결되지 않았어요" → `.env.local` 값/재시작 확인.
- 가입 후 메일이 안 옴 → Supabase 기본 메일은 시간당 발송 제한이 있습니다. Confirm email 을 끄거나 잠시 후 재시도.
- 장소가 내장 사본으로 보임(데이터가 옛날 것) → `/api/places` 가 실패한 것입니다. `JEJU_CULTURE_*_KEY` 설정·재시작을 확인하고, 키는 **Decoding** 키를 쓰세요. (`index.html` 을 더블클릭으로 열면 서버가 없어 항상 사본을 씁니다.)
- 사진 대신 초록 그라데이션 → `PIXABAY_API_KEY` 미설정 또는 호출 실패 (사이트는 정상 동작).
