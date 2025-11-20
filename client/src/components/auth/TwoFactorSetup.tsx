/**
 * Two-Factor Authentication Setup Component
 * Handles TOTP setup with QR code and backup codes
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Shield, 
  QrCode, 
  Copy, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  Smartphone,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@client/features/users/hooks/useAuth';
import { TwoFactorSetup as TwoFactorSetupType } from '@client/types/auth';
import { logger } from '@client/utils/logger';

interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (backupCodes: string[]) => void;
}

export function TwoFactorSetup({ isOpen, onClose, onComplete }: TwoFactorSetupProps) {
  const auth = useAuth();
  const [step, setStep] = useState<'setup' | 'verify' | 'backup' | 'complete'>('setup');
  const [setupData, setSetupData] = useState<TwoFactorSetupType | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodesSaved, setBackupCodesSaved] = useState(false);

  // Initialize 2FA setup when dialog opens
  useEffect(() => {
    if (isOpen && step === 'setup') {
      initializeSetup();
    }
  }, [isOpen, step]);

  const initializeSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const setup = await auth.setupTwoFactor();
      setSetupData(setup);
      setStep('verify');
    } catch (err) {
      logger.error('2FA setup initialization failed:', { component: 'TwoFactorSetup' }, err);
      setError(err instanceof Error ? err.message : 'Failed to initialize 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await auth.enableTwoFactor(verificationCode);
      
      if (result.success) {
        setStep('backup');
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      logger.error('2FA verification failed:', { component: 'TwoFactorSetup' }, err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodesAcknowledged = () => {
    if (!setupData?.backup_codes) return;
    
    setBackupCodesSaved(true);
    setStep('complete');
    onComplete(setupData.backup_codes);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      logger.warn('Failed to copy to clipboard:', { component: 'TwoFactorSetup' }, err);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backup_codes) return;

    const content = [
      'Chanuka Two-Factor Authentication Backup Codes',
      '==============================================',
      '',
      'Keep these codes safe! Each code can only be used once.',
      'Use them to access your account if you lose your authenticator device.',
      '',
      ...setupData.backup_codes.map((code, index) => `${index + 1}. ${code}`),
      '',
      `Generated on: ${new Date().toLocaleString()}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chanuka-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setStep('setup');
    setSetupData(null);
    setVerificationCode('');
    setError(null);
    setShowBackupCodes(false);
    setBackupCodesSaved(false);
    onClose();
  };

  const renderSetupStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Shield className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Enable Two-Factor Authentication</h3>
        <p className="text-gray-600">
          Add an extra layer of security to your account by enabling two-factor authentication.
        </p>
      </div>

      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          You'll need an authenticator app like Google Authenticator, Authy, or 1Password to continue.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={initializeSetup} disabled={loading}>
          {loading ? 'Setting up...' : 'Get Started'}
        </Button>
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <QrCode className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
        <p className="text-gray-600">
          Scan this QR code with your authenticator app, then enter the 6-digit code below.
        </p>
      </div>

      {setupData && (
        <div className="space-y-4">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white border rounded-lg">
              <img 
                src={setupData.qr_code} 
                alt="2FA QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>

          {/* Manual entry option */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Can't scan the code?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">
                Enter this code manually in your authenticator app:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono">
                  {setupData.secret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(setupData.secret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Verification code input */}
          <div className="space-y-2">
            <Label htmlFor="verification-code">Enter 6-digit code from your app</Label>
            <Input
              id="verification-code"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
                setError(null);
              }}
              className="text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleVerification} 
              disabled={loading || verificationCode.length !== 6}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderBackupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Key className="mx-auto h-12 w-12 text-green-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Save Your Backup Codes</h3>
        <p className="text-gray-600">
          Store these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Each backup code can only be used once. Keep them secure and don't share them with anyone.
        </AlertDescription>
      </Alert>

      {setupData?.backup_codes && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Backup Codes</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBackupCodes(!showBackupCodes)}
              >
                {showBackupCodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(setupData.backup_codes.join('\n'))}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadBackupCodes}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showBackupCodes ? (
              <div className="grid grid-cols-2 gap-2">
                {setupData.backup_codes.map((code, index) => (
                  <Badge key={index} variant="secondary" className="font-mono text-xs p-2">
                    {code}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Click the eye icon to reveal your backup codes
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleClose} className="flex-1">
          I'll Save Them Later
        </Button>
        <Button onClick={handleBackupCodesAcknowledged} className="flex-1">
          I've Saved My Codes
        </Button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-4 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
      <h3 className="text-lg font-semibold">Two-Factor Authentication Enabled!</h3>
      <p className="text-gray-600">
        Your account is now protected with two-factor authentication. You'll need your authenticator app to sign in.
      </p>
      <Button onClick={handleClose} className="w-full">
        Done
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Secure your account with an additional layer of protection
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'setup' && renderSetupStep()}
          {step === 'verify' && renderVerifyStep()}
          {step === 'backup' && renderBackupStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}