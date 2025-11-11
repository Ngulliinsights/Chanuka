/**
 * Enhanced Registration Form Component
 * Secure registration with password validation, privacy controls, and consent management
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, AlertTriangle, Info, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { useAuth } from '../../hooks/use-auth';
import { RegisterData, PrivacySettings } from '../../types/auth';
import { validatePassword, PASSWORD_STRENGTH_CONFIG, estimateCrackTime } from '../../utils/password-validation';
import { privacyCompliance } from '../../utils/privacy-compliance';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register, loading } = useAuth();
  
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'citizen',
    privacy_settings: {
      profile_visibility: 'registered',
      email_visibility: 'private',
      activity_tracking: false,
      analytics_consent: false,
      marketing_consent: false,
      data_sharing_consent: false,
      location_tracking: false,
      personalized_content: true,
      third_party_integrations: false,
      notification_preferences: {
        email_notifications: true,
        push_notifications: false,
        sms_notifications: false,
        bill_updates: true,
        comme