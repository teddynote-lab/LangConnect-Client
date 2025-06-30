"use client";

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { signupSchema, SignupFormValues } from "@/lib/schemas";

export default function SignUp() {
  const router = useRouter();
  const { register: registerUser, registerLoading } = useAuth();
  
  // 1. useForm 설정
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // 3. 폼 제출 로직 구현
  const onSubmit = async (data: SignupFormValues) => {
    try {
      // 4. useAuth의 register 함수 사용
      const result = await registerUser({
        email: data.email,
        password: data.password,
      });

      // 5. 결과 처리
      if (result.success) {
        toast.success(result.message);
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        // 서버 에러 처리
        setError("root", {
          type: "manual",
          message: result.message,
        });
      }
    } catch (error) {
      console.error("회원가입 오류:", error);
      setError("root", {
        type: "manual",
        message: "회원가입 처리 중 오류가 발생했습니다.",
      });
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 pb-2">
          <h1 className="text-2xl font-bold tracking-tight">회원 가입</h1>
          <p className="text-sm text-muted-foreground">아래 정보를 입력하여 계정을 만드세요</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 2. 폼 필드와 register 함수 연결 */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                이메일
              </label>
              <Input 
                id="email" 
                type="email" 
                placeholder="user@example.com" 
                {...register("email")} 
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                비밀번호
              </label>
              <Input 
                id="password" 
                type="password" 
                {...register("password")} 
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                비밀번호 확인
              </label>
              <Input 
                id="confirmPassword" 
                type="password" 
                {...register("confirmPassword")} 
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            {/* 루트 에러 메시지 표시 */}
            {errors.root && (
              <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-black text-white hover:bg-black/90"
              disabled={isSubmitting || registerLoading}
            >
              {(isSubmitting || registerLoading) ? "처리 중..." : "가입하기"}
            </Button>
          </form>
          <div className="text-center text-sm">
            이미 계정이 있으신가요?{" "}
            <Link href="/signin" className="font-medium underline">
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
