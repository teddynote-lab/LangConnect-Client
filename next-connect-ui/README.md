# NextConnect UI

`next-connect-ui`는 `langconnect` 백엔드 서비스를 위한 공식 프론트엔드 애플리케이션입니다. Next.js, TypeScript, Tailwind CSS를 기반으로 구축되었으며, 사용자 친화적인 인터페이스를 통해 RAG 시스템의 모든 기능을 활용할 수 있도록 지원합니다.

## ✨ 주요 기능

- **사용자 인증**: `NextAuth.js`를 활용하여 백엔드와 연동되는 안전한 이메일/비밀번호 기반 로그인 및 회원가입 기능을 제공합니다.
- **대시보드**: 컬렉션, 문서, 청크 수 등 시스템의 전반적인 상태를 한눈에 파악할 수 있는 메인 페이지를 제공합니다.
- **컬렉션 관리**: 벡터 데이터베이스 컬렉션을 생성, 조회, 삭제하는 UI를 제공합니다.
- **문서 관리**: 여러 파일을 동시에 업로드하고, 컬렉션 내의 문서를 파일 단위 또는 개별 청크 단위로 관리하고 삭제할 수 있습니다.
- **고급 검색**: 시맨틱, 키워드, 하이브리드 검색 옵션을 제공하며, 메타데이터 필터링을 통해 정교한 검색이 가능합니다.
- **API 테스터**: 백엔드 API의 모든 엔드포인트를 직접 테스트해볼 수 있는 개발자 도구를 제공합니다.
- **반응형 디자인**: 데스크톱과 모바일 환경 모두에 최적화된 UI를 제공합니다.
- **다크/라이트 모드**: 사용자의 시스템 설정에 따라 자동으로 테마가 적용되며, 수동으로 전환할 수 있습니다.
- **다국어 지원**: 영어와 한국어를 완벽하게 지원하며, 손쉽게 언어를 전환할 수 있습니다.

## 🛠️ 기술 스택

- **프레임워크**: Next.js (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **UI 컴포넌트**: Shadcn/ui, Radix UI
- **폼 관리**: React Hook Form, Zod (유효성 검사)
- **상태 관리**: React Context API, `useSWR`
- **API 통신**: Axios
- **인증**: NextAuth.js
- **국제화 (i18n)**: 자체 구현 (React Context)

## 📂 프로젝트 구조

```
next-connect-ui/
├── src/
│   ├── app/
│   │   ├── (auth)/              # 인증 관련 페이지 (로그인, 회원가입)
│   │   ├── (protected)/         # 인증이 필요한 페이지 (메인 대시보드)
│   │   │   ├── collections/     # 컬렉션 관리 페이지
│   │   │   ├── documents/       # 문서 관리 페이지
│   │   │   ├── search/          # 검색 페이지
│   │   │   └── api-tester/      # API 테스터 페이지
│   │   └── api/                 # Next.js API 라우트 (백엔드 프록시 역할)
│   ├── components/
│   │   ├── layout/              # 앱 헤더, 사이드바 등 레이아웃 컴포넌트
│   │   ├── modals/              # 컬렉션 생성, 문서 업로드 등 모달창
│   │   └── ui/                  # Shadcn UI 컴포넌트
│   ├── hooks/                   # 커스텀 훅 (useAuth, useTranslation 등)
│   ├── lib/                     # 핵심 로직 및 유틸리티
│   │   ├── api.ts               # 백엔드 API 통신 로직
│   │   ├── auth.ts              # NextAuth.js 설정
│   │   └── schemas.ts           # Zod를 이용한 폼 유효성 검사 스키마
│   ├── providers/               # 전역 상태 관리를 위한 Context Provider
│   └── translations/            # 다국어 지원을 위한 번역 파일 (en, ko)
├── Dockerfile                   # 프로덕션용 Docker 이미지 빌드 설정
├── next.config.ts               # Next.js 설정
└── package.json                 # 프로젝트 의존성 및 스크립트
```

### 주요 디렉토리 설명

- **`src/app/(protected)`**: 인증된 사용자만 접근할 수 있는 핵심 애플리케이션 페이지들이 위치합니다. `middleware.ts`를 통해 접근이 제어됩니다.
- **`src/app/api`**: Next.js의 API 라우트를 사용하여 프론트엔드와 백엔드 API 서버 간의 프록시(BFF, Backend for Frontend) 역할을 수행합니다. 이를 통해 API 요청에 인증 토큰을 안전하게 주입하고, 환경 변수(`API_URL`)를 클라이언트에 노출하지 않습니다.
- **`src/components`**: 재사용 가능한 UI 컴포넌트들로 구성됩니다. `layout`은 전체적인 구조를, `modals`는 팝업창을, `ui`는 Shadcn/ui를 통해 생성된 기본 UI 요소들을 포함합니다.
- **`src/lib`**: 애플리케이션의 핵심 로직을 담당합니다. `axios.ts`에서 API 클라이언트를 설정하고, `auth.ts`에서 `NextAuth.js`의 인증 전략을 정의합니다.
- **`src/hooks`**: `useAuth`는 인증 관련 로직을, `useTranslation`은 다국어 처리 로직을 캡슐화하여 컴포넌트에서 쉽게 사용할 수 있도록 합니다.

## 🚀 시작하기

1.  **의존성 설치**:

    ```bash
    pnpm install
    ```

2.  **환경 변수 설정**:

    `.env.example` 파일을 복사하여 `.env.local` 파일을 생성하고, 백엔드 API 서버 주소와 `NextAuth.js` 시크릿 키를 설정합니다.

    ```env
    NEXT_PUBLIC_API_URL=http://localhost:8080
    NEXTAUTH_SECRET=your-secret-key
    ```

3.  **개발 서버 실행**:

    ```bash
    pnpm run dev
    ```

    서버는 기본적으로 `http://localhost:3893`에서 실행됩니다.

## 🐳 도커 배포

프로젝트 루트에 포함된 `Dockerfile`과 `docker-compose.yml`을 사용하여 `langconnect` 백엔드와 함께 UI를 컨테이너 환경에서 쉽게 배포할 수 있습니다. `docker-compose up --build` 명령어를 통해 전체 스택을 실행할 수 있습니다.
