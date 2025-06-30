import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // console.log("🔵 MIDDLEWARE: 미들웨어 함수 실행됨", req.nextUrl.pathname)
    
    // 토큰 세션 만료 체크 및 리다이렉트 처리
    const token = req.nextauth?.token
    if (!token && !req.nextUrl.pathname.startsWith('/signin') && !req.nextUrl.pathname.startsWith('/signup')) {
      // console.log("🔴 MIDDLEWARE: 세션 만료됨, 로그인 페이지로 리다이렉트")
      return NextResponse.redirect(new URL('/signin', req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        // console.log('token ===> ', token)
        
        // console.log("🟡 AUTHORIZED: 콜백 실행됨")
        // console.log("  - pathname:", pathname)
        // console.log("  - token exists:", !!token)
        
        // 인증 관련 페이지는 항상 접근 가능
        if (pathname === '/signin' || pathname === '/signup') {
          // console.log("  - 결과: AUTH 페이지 - 접근 허용")
          return true
        }
        
        // 그 외 모든 페이지는 토큰이 있어야 접근 가능
        const result = !!token
        // console.log("  - 결과: PROTECTED 페이지 - 접근", result ? "허용" : "거부")
        return result
      },
    },
    pages: {
      signIn: '/signin',
      signOut: '/signout',
      error: '/signin', // 인증 오류 발생 시 로그인 페이지로 리다이렉트
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}