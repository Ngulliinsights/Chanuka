import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Clock, 
  Filter,
  Settings,
  TestTube,
  Save,
  Plus,
  X,
  Phone,
  Globe,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '../utils/logger.js';

interface NotificationChannel {
  enabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

interface SmartFiltering {
  enabled: boolean;
  interestBasedFiltering: boolean;
  priorityThreshold: 'low' | 'medium' | 'high';
  categoryFilters: string[];
  keywordFilters: string[];
  sponsorFilters: string[];
}

interface EnhancedNotificationPreferences {
  channels: {
    inApp: NotificationChannel;
    email: NotificationChannel;
    sms: NotificationChannel;
    push: NotificationChannel;
  };
  categories: {
    billUpdates: boolean;
    commentReplies: boolean;
    expertVerifications: boolean;
    systemAlerts: boolean;
    weeklyDigest: boolean;
  };
  interests: string[];
  batchingEnabled: boolean;
  minimumPriority: 'low' | 'medium' | 'high' | 'urgent';
  smartFiltering: SmartFiltering;
}

interface EngagementProfile {
  userId: string;
  topCategories: Array<{ category: string; score: number }>;
  topSponsors: Array<{ sponsorId: number; name: string; score: number }>;
  engagementLevel: 'low' | 'medium' | 'high';
  preferredNotificationTimes: Array<{ hour: number; frequency: number }>;
  averageResponseTime: number;
}

interface ChannelInfo {
  type: string;
  name: string;
  description: string;
  supported: boolean;
  requiresSetup: boolean;
  setupInstructions?: string;
}

const channelIcons = {
  inApp: Bell,
  email: Mail,
  sms: MessageSquare,
  push: Smartphone
};

const channelLabels = {
  inApp: 'In-App Notifications',
  email: 'Email Notifications',
  sms: 'SMS Notifications',
  push: 'Push Notifications'
};

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

const categoryLabels = {
  billUpdates: 'Bill Updates',
  commentReplies: 'Comment Replies',
  expertVerifications: 'Expert Verifications',
  systemAlerts: 'System Alerts'
};