import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { useAuthForm } from './hooks/useAuthForm';
import { FormData } from './types';

const AuthForm = () => {
  const {
    mode,
    formData,
    errors,
    loading,
    apiResponse,
    showPassword,
    handleInputChange,
    handleBlur,
    handleSubmit,
    toggleMode,
    setShowPassword,
    isRegisterMode
  } = useAuthForm();

  const renderInput = (
    name: keyof FormData,
    label: string,
    type: string,
    placeholder: string,
    Icon: React.ElementType,
    gridClass: string = ''
  ) => {
    const isPasswordField = type === 'password';
    const finalType = isPasswordField && showPassword ? 'text' : type;

    return (
      <div className={`space-y-2 ${gridClass}`} data-testid={`auth-${name}-field`}>
        <Label htmlFor={name}>{label} <span className="text-red-500">*</span></Label>
        <div className="relative">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id={name}
            name={name}
            type={finalType}
            value={formData[name] || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`pl-10 ${isPasswordField ? 'pr-10' : ''} ${errors[name] ? 'border-red-500' : ''}`}
            disabled={loading}
            required
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
            data-testid={`auth-${name}-input`}
          />
          {isPasswordField && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
              data-testid={`auth-${name}-toggle`}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {errors[name] && (
          <p id={`${name}-error`} className="text-sm text-red-600 flex items-center gap-1" data-testid={`auth-${name}-error`}>
            <AlertCircle className="h-3.5 w-3.5" />
            {errors[name]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4" data-testid="auth-page">
      <Card className="w-full max-w-md" data-testid="auth-card">
        <CardHeader className="text-center" data-testid="auth-header">
            {/* You can re-add the logo here if you have it in your project */}
            {/* <img src="/logo.svg" alt="Logo" className="mx-auto h-12 w-auto" /> */}
            <CardTitle className="text-2xl font-bold mt-4" data-testid="auth-title">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </CardTitle>
            <CardDescription data-testid="auth-description">
              {mode === 'login'
                ? 'Enter your credentials to access your account'
                : 'Fill in your details to create a new account'}
            </CardDescription>
        </CardHeader>

        <CardContent data-testid="auth-content">
          {apiResponse?.success && (
            <Alert className="mb-4 border-green-200 bg-green-50 text-green-800" data-testid="auth-success-alert">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{apiResponse.success}</AlertDescription>
            </Alert>
          )}

          {apiResponse?.error && (
            <Alert variant="destructive" className="mb-4" data-testid="auth-error-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{apiResponse.error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate data-testid="auth-form">
            {isRegisterMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="auth-name-fields">
                {renderInput('firstName', 'First Name', 'text', 'John', User, 'sm:col-span-1')}
                {renderInput('lastName', 'Last Name', 'text', 'Doe', User, 'sm:col-span-1')}
              </div>
            )}

            {renderInput('email', 'Email Address', 'email', 'you@example.com', Mail)}
            {renderInput('password', 'Password', 'password', '••••••••', Lock)}
            {isRegisterMode && !errors.password && (
              <p className="text-xs text-gray-600 -mt-2" data-testid="auth-password-requirements">
                12+ characters, with uppercase, lowercase, number, and special character.
              </p>
            )}

            {isRegisterMode &&
              renderInput('confirmPassword', 'Confirm Password', 'password', '••••••••', Lock)}

            <Button type="submit" className="w-full" disabled={loading} data-testid="auth-submit-button">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </Button>

            <div className="text-center text-sm" data-testid="auth-mode-toggle">
              <span className="text-gray-600">
                {mode === 'login'
                  ? "Don't have an account? "
                  : "Already have an account? "}
              </span>
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-blue-600 hover:underline"
                disabled={loading}
                data-testid="auth-toggle-button"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;

