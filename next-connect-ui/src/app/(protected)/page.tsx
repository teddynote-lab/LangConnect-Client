import Link from 'next/link'
import { FileText, Folder, Search, FlaskConical, Github, Book, ExternalLink, GitBranch } from 'lucide-react'

export default function MainPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔗 LangConnect 클라이언트
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            <strong>LangConnect</strong>에 오신 것을 환영합니다.
            <br />
            LangChain과 PostgreSQL로 구동되는 강력한 문서 관리 및 검색 시스템입니다.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">🚀 주요 기능</h2>
          <p className="text-gray-600 mb-8">
            이 애플리케이션은 고급 검색 기능을 갖춘 문서 관리를 위한 포괄적인 인터페이스를 제공합니다:
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <Folder className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">컬렉션 관리</h3>
              </div>
              <ul className="text-gray-600 space-y-2 mb-4">
                <li>• 문서 컬렉션 생성 및 관리</li>
                <li>• 컬렉션 통계 보기</li>
                <li>• 컬렉션 일괄 삭제</li>
              </ul>
              <Link
                href="/collections"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                컬렉션으로 이동
                <Folder className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">문서 관리</h3>
              </div>
              <ul className="text-gray-600 space-y-2 mb-4">
                <li>• 여러 문서 업로드 (PDF, TXT, MD, DOCX)</li>
                <li>• 문서 청크 보기 및 관리</li>
                <li>• 개별 청크 또는 전체 문서 삭제</li>
              </ul>
              <Link
                href="/documents"
                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
              >
                문서로 이동
                <FileText className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-900">검색</h3>
              </div>
              <ul className="text-gray-600 space-y-2 mb-4">
                <li>• <strong>시맨틱 검색</strong>: AI 기반 유사도 검색</li>
                <li>• <strong>키워드 검색</strong>: 전통적인 전문 검색</li>
                <li>• <strong>하이브리드 검색</strong>: 두 가지 접근법의 장점 결합</li>
                <li>• 고급 메타데이터 필터링</li>
              </ul>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                검색으로 이동
                <Search className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <FlaskConical className="w-6 h-6 text-orange-600" />
                <h3 className="text-xl font-semibold text-gray-900">API 테스터</h3>
              </div>
              <ul className="text-gray-600 space-y-2 mb-4">
                <li>• 모든 API 엔드포인트 직접 테스트</li>
                <li>• API 기능 탐색</li>
                <li>• 통합 개발 및 디버깅</li>
              </ul>
              <Link
                href="/api-tester"
                className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
              >
                API 테스터로 이동
                <FlaskConical className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">📌 이 프로젝트에 대해</h2>
          
          <div className="grid md:grid-cols-[2fr_1fr] gap-8">
            <div>
              <p className="text-gray-600 mb-4">
                <strong>LangConnect</strong>는 다음의 기술들을 결합한 오픈소스 프로젝트입니다:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-xl">🦜</span>
                  <span><strong>LangChain</strong> - 문서 처리 및 임베딩</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">🐘</span>
                  <span><strong>PostgreSQL</strong> - pgvector 확장을 통한 벡터 저장</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">⚡</span>
                  <span><strong>FastAPI</strong> - 고성능 API 백엔드</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">🎨</span>
                  <span><strong>Streamlit</strong> - 인터랙티브 사용자 인터페이스</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">🎨</span>
                  <span><strong>Next.js</strong> - 인터랙티브 사용자 인터페이스</span>
                </li>
              </ul>
              <p className="text-gray-600 mt-4">
                RAG (Retrieval-Augmented Generation) 애플리케이션 구축에 완벽합니다!
              </p>
            </div>

            <div className="bg-gray-100 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 링크</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://github.com/teddynote-lab/LangConnect-Client"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <Github className="w-4 h-4" />
                    GitHub 저장소
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/teddynote-lab"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <GitBranch className="w-4 h-4" />
                    TeddyNote LAB
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/teddynote-lab/LangConnect-Client#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <Book className="w-4 h-4" />
                    문서
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/jikime/next-connect-ui"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <Book className="w-4 h-4" />
                    Next.js 클라이언트 UI
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center text-gray-500 text-sm">
          Made with ❤️ by{' '}
          <a
            href="https://github.com/teddynote-lab"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-gray-900"
          >
            TeddyNote LAB
          </a>
        </div>
      </div>
    </div>
  )
}
