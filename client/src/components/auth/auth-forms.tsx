import { useState, useMemo } from 'react';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth'; // Assuming a useAuth hook exists
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

// Define comprehensive validation schemas using Zod for type-safe, declarative validation
const schemas = {
  login: z.object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters'),
  }),
  register: z.object({
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters')
      .regex(/^[a-zA-Z'-]+$/, 'Name can only contain letters, hyphens, and apostrophes')
      .trim(),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters')
      .regex(/^[a-zA-Z'-]+$/, 'Name can only contain letters, hyphens, and apostrophes')
      .trim(),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(100, 'Password must be less than 100 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Must contain an uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  }),
};

// For component state we use a simple flexible record so fields can vary by mode
type FormData = Record<string, string>;
type ValidationErrors = Partial<Record<string, string>>;

const AuthForm = () => {
  const { login, register, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiResponse, setApiResponse] = useState<{ success?: string; error?: string } | null>(null);

  const initialFormData = {
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const currentSchema = useMemo(() => schemas[mode], [mode]);

  // Real-time field validation on blur
  const validateField = (fieldName: string, value: string) => {
    // Unwrap ZodEffects (refine) to get at the underlying object schema when present
    const maybeEffects: any = currentSchema as any;
    const baseSchema: any = maybeEffects?._def?.schema ?? currentSchema;

    // Use partial + pick to validate a single field without requiring other fields
    const fieldSchema = (baseSchema && typeof baseSchema.partial === 'function')
      ? baseSchema.partial().pick({ [fieldName]: true })
      : z.object({ [fieldName]: (baseSchema?.shape?.[fieldName] ?? z.string()) });

    const result = fieldSchema.safeParse({ [fieldName]: value });

    setErrors(prev => {
      const newErrors = { ...prev };
      if (!result.success) {
        newErrors[fieldName] = result.error.errors[0]?.message;
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Basic input sanitization to remove control characters
    const sanitizedValue = value.replace(/[\x00-\x1F\x7F]/g, '');

    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue,
    }));

    if (apiResponse) setApiResponse(null);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target as { name: keyof FormData; value: string };
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiResponse(null);

    // Parse according to the active mode so TS knows which fields exist
    if (mode === 'login') {
      const loginResult = schemas.login.safeParse(formData);
      if (!loginResult.success) {
        const formattedErrors: ValidationErrors = {};
        loginResult.error.errors.forEach(err => {
          if (err.path[0]) {
            formattedErrors[err.path[0] as keyof FormData] = err.message;
          }
        });
        setErrors(formattedErrors);
        return;
      }

      setErrors({});
      const authResult = await login(loginResult.data.email, loginResult.data.password);

      if (authResult.success) {
        setApiResponse({ success: 'Login successful!' });
      } else {
        setApiResponse({ error: authResult.error || 'An unexpected error occurred.' });
      }
      return;
    }

    // register mode
    const registerResult = schemas.register.safeParse(formData);
    if (!registerResult.success) {
      const formattedErrors: ValidationErrors = {};
      registerResult.error.errors.forEach(err => {
        if (err.path[0]) {
          formattedErrors[err.path[0] as keyof FormData] = err.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }

    setErrors({});
    const { email, password, firstName, lastName } = registerResult.data;
    const authResult = await register({ email, password, firstName, lastName });

    if (authResult.success) {
      setApiResponse({ success: 'Account created!' });
      // reset form after successful registration
      setFormData(initialFormData);
    } else {
      setApiResponse({ error: authResult.error || 'An unexpected error occurred.' });
    }
  };

  const toggleMode = () => {
    setMode(prev => (prev === 'login' ? 'register' : 'login'));
    setErrors({});
    setApiResponse(null);
    setFormData(initialFormData);
  };

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
            value={formData[name]}
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
            {mode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="auth-name-fields">
                {renderInput('firstName', 'First Name', 'text', 'John', User, 'sm:col-span-1')}
                {renderInput('lastName', 'Last Name', 'text', 'Doe', User, 'sm:col-span-1')}
              </div>
            )}

            {renderInput('email', 'Email Address', 'email', 'you@example.com', Mail)}
            {renderInput('password', 'Password', 'password', '••••••••', Lock)}
            {mode === 'register' && !errors.password && (
              <p className="text-xs text-gray-600 -mt-2" data-testid="auth-password-requirements">
                12+ characters, with uppercase, lowercase, number, and special character.
              </p>
            )}

            {mode === 'register' &&
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