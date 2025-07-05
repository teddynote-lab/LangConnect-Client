# LangConnect

`LangConnect`는 FastAPI와 LangChain을 기반으로 구축된 RAG(Retrieval-Augmented Generation) 시스템을 위한 백엔드 서비스입니다. 사용자 인증, 벡터 컬렉션 관리, 문서 처리 및 검색을 위한 REST API를 제공합니다.

## 주요 기능

- **사용자 인증**: Supabase를 연동하여 JWT 기반의 안전한 사용자 가입, 로그인, 세션 관리 기능을 제공합니다.
- **컬렉션 관리**: PostgreSQL 및 PGVector를 사용하여 벡터 데이터베이스 컬렉션을 생성, 조회, 업데이트, 삭제(CRUD)할 수 있습니다.
- **문서 관리**: 다양한 형식의 문서를 업로드하고, 텍스트를 추출하여 지정된 컬렉션에 저장 및 관리합니다.
- **다중 포맷 문서 파싱**: PDF, TXT, HTML, Markdown, MS Word (.doc, .docx) 등 다양한 파일 형식을 지원합니다.
- **고급 검색**: 의미 기반의 시맨틱 검색, 키워드 검색, 그리고 두 가지를 결합한 하이브리드 검색 기능을 제공하여 정확도를 높입니다.

## 프로젝트 구조

```bash
langconnect/
├── README.md               # 현재 문서
├── __init__.py             # 패키지 초기화 (버전, 로깅 설정)
├── __main__.py             # uvicorn을 통해 서버를 실행하는 엔트리포인트
├── auth.py                 # Supabase JWT 토큰을 이용한 사용자 인증 처리
├── config.py               # 환경 변수를 이용한 애플리케이션 설정 관리
├── server.py               # FastAPI 앱 설정, 미들웨어, 라우터 포함
├── api/                    # API 엔드포인트(라우터) 정의
│   ├── auth.py             # 인증 관련 API (가입, 로그인 등)
│   ├── collections.py      # 컬렉션 CRUD API
│   └── documents.py        # 문서 업로드, 검색, 삭제 등 API
├── database/               # 데이터베이스 연결 및 데이터 접근 로직
│   ├── collections.py      # CollectionManager와 Collection 클래스 정의
│   └── connection.py       # DB 커넥션 풀 및 PGVector 엔진 관리
├── models/                 # API 요청/응답을 위한 Pydantic 모델
│   ├── collection.py       # 컬렉션 관련 모델
│   └── document.py         # 문서 및 검색 관련 모델
└── services/               # 핵심 비즈니스 로직
    └── document_processor.py # 파일 처리 및 텍스트 분할 로직
```

### 모듈 상세 설명

#### `server.py`
FastAPI 애플리케이션의 메인 파일입니다. CORS 미들웨어를 설정하고, `api` 디렉토리의 모든 라우터를 포함합니다. 또한, 애플리케이션 시작 시 `CollectionsManager.setup()`을 호출하여 데이터베이스 초기화를 수행하는 라이프사이클 관리를 담당합니다.

#### `config.py`
`.env` 파일이나 환경 변수로부터 설정을 로드합니다. 데이터베이스 연결 정보, Supabase 키, 허용할 CORS 오리진, 그리고 LangChain 임베딩 모델(`text-embedding-3-small`) 등을 설정합니다.

#### `auth.py`
HTTP Bearer 스킴을 통해 전달된 JWT 토큰을 검증하여 사용자를 인증합니다. `resolve_user` 의존성을 통해 각 API 엔드포인트에서 인증된 사용자 객체를 주입받을 수 있습니다. 테스트 환경에서는 모의(mock) 인증을 지원합니다.

---

### `api/`
FastAPI의 `APIRouter`를 사용하여 기능별로 엔드포인트를 그룹화합니다.

- **`api/auth.py`**: `/auth` 경로의 API를 정의합니다. (`/signup`, `/signin`, `/signout`, `/me`)
- **`api/collections.py`**: `/collections` 경로의 API를 정의합니다. 사용자는 자신만의 컬렉션을 생성하고 관리할 수 있습니다.
- **`api/documents.py`**: 컬렉션 내의 문서를 관리하는 API를 정의합니다. (`/collections/{collection_id}/documents`) 문서 업로드, 목록 조회, 삭제, 검색 기능을 포함합니다.

---

### `database/`
데이터베이스와의 상호작용을 담당합니다.

- **`database/connection.py`**: `asyncpg`를 사용하여 PostgreSQL 비동기 커넥션 풀을 생성하고 관리합니다. 또한, LangChain의 `PGVector`와 연동하기 위한 SQLAlchemy 엔진을 생성하는 헬퍼 함수를 제공합니다.
- **`database/collections.py`**:
  - `CollectionsManager`: 컬렉션 자체를 관리하는 클래스입니다. 사용자가 소유한 컬렉션을 생성, 조회, 삭제하는 로직을 담당합니다.
  - `Collection`: 특정 컬렉션 내부의 문서를 관리하는 클래스입니다. 문서 추가(upsert), 삭제, 검색 등의 작업을 수행합니다.

---

### `models/`
Pydantic `BaseModel`을 사용하여 API의 요청 본문(request body)과 응답(response)의 데이터 형식을 정의하고 유효성을 검사합니다.

- **`models/collection.py`**: `CollectionCreate`, `CollectionUpdate`, `CollectionResponse` 등 컬렉션 관련 스키마를 정의합니다.
- **`models/document.py`**: `SearchQuery`, `SearchResult`, `DocumentDelete` 등 문서 및 검색 관련 스키마를 정의합니다.

---

### `services/`
애플리케이션의 핵심 비즈니스 로직을 포함합니다.

- **`services/document_processor.py`**: 업로드된 파일을 처리하는 파이프라인을 구현합니다.
  1. 파일의 MIME 타입을 감지합니다.
  2. `MimeTypeBasedParser`를 사용해 파일 형식에 맞는 파서(PDF, TXT, HTML 등)로 텍스트를 추출합니다.
  3. `RecursiveCharacterTextSplitter`를 사용해 추출된 텍스트를 의미 있는 단위(chunk)로 분할합니다.
  4. 각 문서 조각에 고유 ID와 메타데이터를 추가하여 반환합니다.

## 실행 방법

`langconnect` 패키지는 `__main__.py`를 포함하고 있어 직접 실행할 수 있습니다. 필요한 환경 변수(`POSTGRES_*`, `SUPABASE_*` 등)를 설정한 후, 다음 명령어로 서버를 시작할 수 있습니다.

```bash
python -m langconnect
```

서버는 기본적으로 `8080` 포트에서 실행됩니다.
