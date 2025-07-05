# σ₁: Project Brief - MCP Server GUI Controller
*v1.0 | Created: 2025-04-09 | Updated: 2025-07-05*
*Π: DEVELOPMENT | Ω: EXECUTE*

## 🏆 Overview
LangConnect MCP 서버를 웹 UI에서 완전히 제어할 수 있는 Docker 기반 컨트롤러 시스템 구축. FastMCP v2.10.0+의 최신 기능을 통합하여 엔터프라이즈급 MCP 서버 관리 솔루션 제공.

## 📋 Requirements
- [R₁] **서버 생명주기 관리**: MCP 서버의 시작/중지/재시작을 웹 UI에서 제어
- [R₂] **실시간 모니터링**: SSE를 통한 서버 상태와 로그 실시간 스트리밍
- [R₃] **다중 서버 지원**: 여러 MCP 서버 인스턴스를 동시에 관리
- [R₄] **보안 인증**: JWT 기반 인증과 Bearer 토큰 자동 갱신
- [R₅] **대화형 도구**: FastMCP의 Elicitation 기능을 UI에서 지원
- [R₆] **Docker 통합**: 동적 컨테이너 생성/삭제 및 헬스체크

## ✅ Success Criteria
- [C₁] 서버 시작 시간 < 5초
- [C₂] 로그 지연시간 < 100ms
- [C₃] UI 응답성 > 60fps
- [C₄] 동시 서버 관리 > 10개
- [C₅] 시스템 가용성 > 99%
- [C₆] 100% 테스트 커버리지 (핵심 기능)

## 🔍 Scope
### ✓ In Scope
- [S₁] Docker 기반 MCP 서버 컨테이너 관리
- [S₂] FastAPI 기반 컨트롤러 API 개발
- [S₃] Next.js MCP 관리 UI 개발
- [S₄] FastMCP 미들웨어 통합 (로깅, 인증, 모니터링)
- [S₅] 실시간 로그 스트리밍 (SSE)
- [S₆] JWT 토큰 자동 갱신 메커니즘

### ❌ Out of Scope
- [O₁] MCP 서버 자체 기능 수정
- [O₂] Kubernetes 오케스트레이션 지원
- [O₃] 타사 MCP 서버 통합
- [O₄] 모바일 앱 개발

## ⏱️ Timeline
- [T₁] Phase 1 (Backend 기초): 2025-07-05 ~ 2025-07-08
- [T₂] Phase 2 (Frontend UI): 2025-07-08 ~ 2025-07-10
- [T₃] Phase 3 (통합 테스트): 2025-07-10 ~ 2025-07-12
- [T₄] Phase 4 (문서화 및 배포): 2025-07-12 ~ 2025-07-14

## 👥 Stakeholders
- [STK₁] 개발팀: 구현 및 테스트 담당
- [STK₂] 사용자: LangConnect MCP 서버 운영자
- [STK₃] 운영팀: Docker 환경 관리

## 🔗 Related Documents
- [↗️σ₂] 시스템 아키텍처 패턴
- [↗️σ₃] 기술 스택 및 환경 설정
- [↗️Κ₁-Κ₅] Quality Gates 체크리스트

---
*σ₁ foundation document informing all other memory files*