import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../services/user-api';
import { useToast } from '../../../hooks/use-toast';
import type {
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  UpdatePreferencesData,
  VerificationRequest
} from '../../../types';

/**
 * Hook for user authentication operations
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const login = useMutation({
    mutationFn: (credentials: LoginCredentials) => userApi.login(credentials),
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refresh_token', data.refresh_token);

      // Update user in cache
      queryClient.setQueryData(['user'], data.user);

      toast({
        title: "Welcome back!",
        description: `Hello ${data.user.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const register = useMutation({
    mutationFn: (data: RegisterData) => userApi.register(data),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('refresh_token', data.refresh_token);
      queryClient.setQueryData(['user'], data.user);

      toast({
        title: "Account created!",
        description: "Please verify your phone number to continue.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logout = useMutation({
    mutationFn: () => userApi.logout(),
    onSuccess: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      queryClient.clear();

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
  });

  return {
    login,
    register,
    logout,
  };
}

/**
 * Hook for getting current user information
 */
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => userApi.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

/**
 * Hook for user profile operations
 */
export function useProfile(user_id?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const profile = useQuery({ queryKey: ['profile', user_id],
    queryFn: () => userApi.getUserProfile(user_id),
    enabled: !!user_id || !user_id, // Always enabled for current user, conditional for others
    staleTime: 10 * 60 * 1000, // 10 minutes
   });

  const updateProfile = useMutation({
    mutationFn: (data: UpdateProfileData) => userApi.updateProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAvatar = useMutation({
    mutationFn: (file: File) => userApi.updateAvatar(file),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], (old: any) => ({
        ...old,
        profile: { ...old.profile, avatar: data.avatar }
      }));
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => userApi.deleteAccount(),
    onSuccess: () => {
      // Clear all user data
      queryClient.clear();
      localStorage.clear();

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    profile,
    updateProfile,
    updateAvatar,
    deleteAccount,
  };
}

/**
 * Hook for user preferences
 */
export function usePreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const preferences = useQuery({
    queryKey: ['preferences'],
    queryFn: () => userApi.getPreferences(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const updatePreferences = useMutation({
    mutationFn: (data: UpdatePreferencesData) => userApi.updatePreferences(data),
    onSuccess: (updatedPrefs) => {
      queryClient.setQueryData(['preferences'], updatedPrefs);
      toast({
        title: "Preferences updated",
        description: "Your preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    preferences,
    updatePreferences,
  };
}

/**
 * Hook for user verification operations
 */
export function useVerification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const verification_status = useQuery({
    queryKey: ['verification'],
    queryFn: () => userApi.getVerificationStatus(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const submitVerification = useMutation({
    mutationFn: (data: VerificationRequest) => userApi.submitVerification(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['verification'] });
      toast({
        title: "Verification submitted",
        description: response.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyPhone = useMutation({
    mutationFn: (code: string) => userApi.verifyPhone(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['verification'] });
      toast({
        title: "Phone verified",
        description: "Your phone number has been verified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendPhoneVerification = useMutation({
    mutationFn: () => userApi.resendPhoneVerification(),
    onSuccess: () => {
      toast({
        title: "Code sent",
        description: "A new verification code has been sent to your phone.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    verification_status,
    submitVerification,
    verifyPhone,
    resendPhoneVerification,
  };
}

/**
 * Hook for password management
 */
export function usePassword() {
  const { toast } = useToast();

  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      userApi.changePassword(data),
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestPasswordReset = useMutation({
    mutationFn: (email: string) => userApi.requestPasswordReset(email),
    onSuccess: () => {
      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPassword = useMutation({
    mutationFn: (data: { token: string; newPassword: string }) =>
      userApi.resetPassword(data),
    onSuccess: () => {
      toast({
        title: "Password reset",
        description: "Your password has been successfully reset.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    changePassword,
    requestPasswordReset,
    resetPassword,
  };
}

/**
 * Hook for user search and discovery
 */
export function useUserSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => userApi.searchUsers(query),
    enabled: enabled && query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for individual user lookup
 */
export function useUserById(user_id: string | undefined) { return useQuery({
    queryKey: ['users', user_id],
    queryFn: () => userApi.getUserById(user_id!),
    enabled: !!user_id,
    staleTime: 10 * 60 * 1000, // 10 minutes
   });
}

/**
 * Hook for user activity and statistics
 */
export function useUserActivity(user_id?: string) { const activity = useQuery({
    queryKey: ['users', user_id, 'activity'],
    queryFn: () => userApi.getUserActivity(user_id),
    staleTime: 5 * 60 * 1000, // 5 minutes
   });

  const stats = useQuery({ queryKey: ['users', user_id, 'stats'],
    queryFn: () => userApi.getUserStats(user_id),
    staleTime: 15 * 60 * 1000, // 15 minutes
   });

  return {
    activity,
    stats,
  };
}





































