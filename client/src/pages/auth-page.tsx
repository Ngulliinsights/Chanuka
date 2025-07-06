import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Redirect } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Eye, EyeOff, Fingerprint, Github, Mail, Loader2 } from 'lucide-react';
import { insertUserSchema } from '@shared/schema';

// Form schemas with enhanced validation feedback
const loginSchema = insertUserSchema.pick({ username: true, password: true });
const registerSchema = insertUserSchema.pick({ username: true, password: true, email: true });

type AuthMode = 'login' | 'register';
type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const AuthPage = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  // Early return for authenticated users - prevents unnecessary rendering
  if (user) {
    return <Redirect to="/" />;
  }

  // Login form with optimized configuration
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
    // Enhanced form behavior for better UX
    mode: 'onBlur', // Validate on blur for immediate feedback
    reValidateMode: 'onChange', // Re-validate on change after first validation
  });

  // Register form with optimized configuration
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  // Enhanced form submission handlers with better error handling
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(data);
      // Success is handled by the mutation's onSuccess callback
    } catch (error) {
      // Error handling is managed by the mutation's onError callback
      // Form will remain accessible for retry
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync(data);
      // Success handling via mutation callback
    } catch (error) {
      // Error handling via mutation callback
    }
  };

  // Enhanced password visibility toggle with better accessibility
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  // Improved loading state detection
  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left side - Auth form with improved spacing and accessibility */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Enhanced branding section with better visual hierarchy */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary p-3 shadow-lg">
                <img 
                  src="/Chanuka_logo.svg" 
                  alt="Chanuka - Legislative Transparency Platform" 
                  className="h-full w-full object-contain filter brightness-0 invert"
                />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-primary tracking-tight">
                Chanuka
              </h1>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Legislative Transparency Platform for Kenya - Empowering citizens through accessible governance
              </p>
            </div>
          </div>

          {/* Enhanced tabs with better accessibility */}
          <Tabs 
            value={authMode} 
            onValueChange={(value) => setAuthMode(value as AuthMode)} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 h-11">
              <TabsTrigger value="login" className="text-sm font-medium">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="text-sm font-medium">
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login Tab with enhanced UX */}
            <TabsContent value="login" className="space-y-0">
              <Card className="border-0 shadow-lg">
                <CardHeader className="space-y-2 pb-6">
                  <CardTitle className="text-2xl">Welcome back</CardTitle>
                  <CardDescription className="text-base">
                    Sign in to access your legislative tracking dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your username" 
                                className="h-11"
                                disabled={isLoading}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between items-center">
                              <FormLabel className="text-sm font-medium">Password</FormLabel>
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                                type="button"
                                disabled={isLoading}
                              >
                                Forgot password?
                              </Button>
                            </div>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter your password"
                                  className="h-11 pr-12"
                                  disabled={isLoading}
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                                  onClick={togglePasswordVisibility}
                                  disabled={isLoading}
                                  aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full h-11 font-medium"
                        disabled={isLoading}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </Form>

                  {/* Enhanced social login section */}
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-3 text-muted-foreground font-medium">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="h-11 gap-2 font-medium"
                        disabled={isLoading}
                        type="button"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-11 gap-2 font-medium"
                        disabled={isLoading}
                        type="button"
                      >
                        <Github className="h-4 w-4" />
                        GitHub
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Register Tab with enhanced UX */}
            <TabsContent value="register" className="space-y-0">
              <Card className="border-0 shadow-lg">
                <CardHeader className="space-y-2 pb-6">
                  <CardTitle className="text-2xl">Create your account</CardTitle>
                  <CardDescription className="text-base">
                    Join thousands of citizens tracking Kenyan legislation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-5">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Choose a unique username" 
                                className="h-11"
                                disabled={isLoading}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Email address</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="Enter your email address" 
                                className="h-11"
                                disabled={isLoading}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a strong password"
                                  className="h-11 pr-12"
                                  disabled={isLoading}
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                                  onClick={togglePasswordVisibility}
                                  disabled={isLoading}
                                  aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full h-11 font-medium"
                        disabled={isLoading}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>

                  {/* Enhanced social registration section */}
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-3 text-muted-foreground font-medium">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full h-11 gap-2 font-medium"
                      disabled={isLoading}
                      type="button"
                    >
                      <Github className="h-4 w-4" />
                      Continue with GitHub
                    </Button>
                  </div>

                  {/* Enhanced terms and privacy section */}
                  <div className="pt-2">
                    <p className="text-xs text-center text-muted-foreground leading-relaxed">
                      By creating an account, you agree to our{" "}
                      <a 
                        href="/terms" 
                        className="text-primary hover:text-primary/80 underline underline-offset-4 font-medium"
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a 
                        href="/privacy" 
                        className="text-primary hover:text-primary/80 underline underline-offset-4 font-medium"
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Enhanced hero section with better content */}
      <div className="bg-gradient-to-br from-primary/90 to-primary lg:flex-1 p-8 lg:flex items-center justify-center hidden text-white relative overflow-hidden">
        {/* Subtle background pattern for visual interest */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />

        <div className="max-w-xl relative z-10">
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Track Legislation That Matters
            </h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Chanuka provides powerful tools to monitor, analyze, and engage with Kenya's legislative process, making governance more transparent and accessible.
            </p>

            {/* Enhanced testimonial with better visual treatment */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <blockquote className="space-y-4">
                <p className="italic text-white/95 leading-relaxed">
                  "This platform has revolutionized how our organization tracks and responds to legislative changes. The analysis tools and real-time notifications are indispensable for our advocacy work."
                </p>
                <footer>
                  <p className="font-semibold text-white">— Sarah Chen</p>
                  <p className="text-sm text-white/80">Policy Director, Transparency Kenya</p>
                </footer>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;