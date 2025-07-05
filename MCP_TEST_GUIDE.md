# MCP Server GUI Controller 테스트 가이드

## 시작하기

1. **서비스 확인**
   ```bash
   docker ps
   ```
   다음 컨테이너들이 실행 중이어야 합니다:
   - langconnect-postgres
   - langconnect-api  
   - next-connect-ui

2. **브라우저에서 접속**
   - http://localhost:3000 으로 접속

3. **로그인**
   - 로그인이 필요합니다 (Supabase 인증 사용)
   - 계정이 없다면 회원가입 후 이메일 인증 필요

## MCP 서버 관리 테스트

### 1. MCP 대시보드 접속
- 로그인 후 좌측 사이드바에서 "MCP 서버" 메뉴 클릭
- 또는 직접 http://localhost:3000/mcp 접속

### 2. MCP 서버 생성
1. "새 서버" 버튼 클릭
2. 서버 정보 입력:
   - **기본 탭**
     - 이름: test-mcp-server
     - 설명: 테스트용 MCP 서버
     - 전송: SSE (Server-Sent Events)
     - 포트: 8765 (자동 할당 가능)
   
   - **런타임 탭**
     - Docker 이미지: langconnect-mcp:latest
     - 명령어: python -m mcp.mcp_langconnect_sse_server
   
   - **환경 탭** (선택사항)
     - 환경 변수 추가 가능
     - 리소스 제한 설정 가능
   
   - **고급 탭**
     - 인증 필요: 활성화 (기본값)
     - Elicitation: 활성화하면 AI 대화 기능 사용 가능

3. "만들기" 버튼 클릭

### 3. 서버 제어
- **시작**: 서버를 시작합니다
- **정지**: 실행 중인 서버를 정지합니다
- **재시작**: 서버를 재시작합니다
- **삭제**: 서버를 삭제합니다

### 4. 서버 모니터링
- **상세 정보**: 서버의 구성, 상태, 메트릭 확인
- **로그 보기**: 실시간 로그 스트리밍
  - 일시 중지/재개 가능
  - 로그 복사/다운로드 가능
  - 로그 지우기 가능

### 5. Elicitation 대화형 도구
- Elicitation이 활성화된 서버에서만 사용 가능
- AI와 대화하며 도구 실행 가능
- 도구 호출 내역 확인 가능

## 주요 기능

### 실시간 업데이트
- 서버 상태가 실시간으로 업데이트됩니다
- 대시보드는 30초마다 자동 새로고침됩니다

### 다국어 지원
- 한국어/영어 전환 가능 (좌측 하단 언어 선택)

### 반응형 디자인
- 데스크톱/태블릿/모바일 모두 지원

## 문제 해결

### MCP Docker 이미지가 없는 경우
```bash
docker compose --profile mcp build
```

### 서버 생성 실패
- Docker 데몬이 실행 중인지 확인
- API 컨테이너가 Docker 소켓에 접근 가능한지 확인
- 로그에서 오류 메시지 확인

### 인증 오류
- 토큰이 만료되었을 수 있습니다
- 로그아웃 후 다시 로그인 시도

## API 직접 테스트

인증 토큰을 얻은 후 직접 API 테스트 가능:

```bash
# 서버 목록 조회
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/mcp/servers

# 서버 생성
curl -X POST http://localhost:8080/api/mcp/servers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "name": "test-server",
      "transport": "sse",
      "command": "python -m mcp.server"
    }
  }'
```

## 추가 정보

- MCP (Model Context Protocol): AI 모델과 도구 간의 표준 통신 프로토콜
- FastMCP: MCP 서버를 쉽게 만들 수 있는 Python 프레임워크
- Docker 기반으로 각 MCP 서버가 격리된 환경에서 실행됩니다