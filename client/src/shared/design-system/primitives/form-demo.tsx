/**
 * Comprehensive form demo showcasing enhanced form design and UX features
 * Demonstrates progressive disclosure, validation feedback, and accessibility
 */

import React, { useState, useCallback } from 'react';

import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import {
  AccessibleFieldset,
  ScreenReaderAnnouncement,
  useFormKeyboardNavigation,
  RequiredFieldIndicator,
  AccessibleErrorSummary,
  FormSkipLink
} from './form-accessibility';
import {
  EnhancedFormInput,
  EnhancedFormTextarea,
  EnhancedFormSelect
} from './form-field';
import { 
  FormSection, 
  FormStepIndicator, 
  FormFieldGroup, 
  FormValidationSummary,
  FormSuccessIndicator,
  FormHelpText 
} from './form-layout';

interface FormData {
  // Personal Information
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  
  // Address Information
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Preferences
  newsletter: boolean;
  contactMethod: string;
  interests: string[];
  
  // Additional Information
  bio: string;
  website: string;
  experience: string;
}

interface ValidationErrors {
  [key: string]: string;
}

export const FormDemo: React.FC = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  const [currentStep, setCurrentStep] = useState('personal');
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    newsletter: false,
    contactMethod: '',
    interests: [],
    bio: '',
    website: '',
    experience: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const steps = [
    {
      id: 'personal',
      title: 'Personal Info',
      description: 'Basic personal information',
      completed: Boolean(formData.first_name && formData.last_name && formData.email),
      error: Boolean(errors.first_name || errors.last_name || errors.email)
    },
    {
      id: 'address',
      title: 'Address',
      description: 'Contact address details',
      completed: Boolean(formData.street && formData.city && formData.state),
      error: Boolean(errors.street || errors.city || errors.state)
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Communication preferences',
      completed: Boolean(formData.contactMethod),
      error: Boolean(errors.contactMethod)
    },
    {
      id: 'additional',
      title: 'Additional',
      description: 'Optional information',
      completed: Boolean(formData.bio),
      error: Boolean(errors.bio)
    }
  ];

  const validateField = useCallback((name: string, value: string): string | undefined => {
    switch (name) {
      case 'first_name':
      case 'last_name':
        return !value.trim() ? 'This field is required' : undefined;
      
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
        return undefined;
      
      case 'phone':
        if (value && !/^\+?[\d\s\-\(\)]+$/.test(value)) return 'Invalid phone format';
        return undefined;
      
      case 'zipCode':
        if (value && !/^\d{5}(-\d{4})?$/.test(value)) return 'Invalid ZIP code format';
        return undefined;
      
      case 'website':
        if (value && !/^https?:\/\/.+\..+/.test(value)) return 'Invalid website URL';
        return undefined;
      
      default:
        return undefined;
    }
  }, []);

  const handleFieldChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const handleFieldValidation = useCallback((name: string, value: string) => {
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField]);

  const validateStep = useCallback((stepId: string): boolean => {
    const stepErrors: ValidationErrors = {};
    
    switch (stepId) {
      case 'personal':
        ['first_name', 'last_name', 'email'].forEach(field => {
          const error = validateField(field, formData[field as keyof FormData] as string);
          if (error) stepErrors[field] = error;
        });
        break;
      
      case 'address':
        ['street', 'city', 'state'].forEach(field => {
          const value = formData[field as keyof FormData] as string;
          if (!value.trim()) stepErrors[field] = 'This field is required';
        });
        break;
      
      case 'preferences':
        if (!formData.contactMethod) {
          stepErrors.contactMethod = 'Please select a contact method';
        }
        break;
    }
    
    setErrors(prev => ({ ...prev, ...stepErrors }));
    return Object.keys(stepErrors).length === 0;
  }, [formData, validateField]);

  const handleStepChange = useCallback((stepId: string) => {
    if (validateStep(currentStep)) {
      setCurrentStep(stepId);
      setAnnouncement(`Moved to ${steps.find(s => s.id === stepId)?.title} step`);
    }
  }, [currentStep, validateStep, steps]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all steps
    const allValid = steps.every(step => validateStep(step.id));
    
    if (!allValid) {
      setAnnouncement('Please correct the errors before submitting');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSubmitted(true);
      setAnnouncement('Form submitted successfully!');
    } catch (error) {
      setErrors({ general: 'Submission failed. Please try again.' });
      setAnnouncement('Form submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [steps, validateStep]);

  const errorList = Object.entries(errors).map(([field, message]) => ({
    field,
    message,
    fieldId: field,
    section: steps.find(step => {
      switch (step.id) {
        case 'personal': return ['first_name', 'last_name', 'email', 'phone'].includes(field);
        case 'address': return ['street', 'city', 'state', 'zipCode', 'country'].includes(field);
        case 'preferences': return ['contactMethod'].includes(field);
        case 'additional': return ['bio', 'website', 'experience'].includes(field);
        default: return false;
      }
    })?.title
  }));

  if (isSubmitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <FormSuccessIndicator
            message="Registration completed successfully!"
            details="Thank you for providing your information. We'll be in touch soon."
            actions={[
              {
                label: 'Start Over',
                onClick: () => {
                  setIsSubmitted(false);
                  setFormData({
                    first_name: '', last_name: '', email: '', phone: '',
                    street: '', city: '', state: '', zipCode: '', country: '',
                    newsletter: false, contactMethod: '', interests: [],
                    bio: '', website: '', experience: ''
                  });
                  setCurrentStep('personal');
                  setErrors({});
                }
              }
            ]}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Form Demo</CardTitle>
          <CardDescription>
            Showcasing progressive disclosure, validation feedback, and accessibility features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormStepIndicator
            steps={steps}
            currentStep={currentStep}
            onStepClick={handleStepChange}
          />

          <FormSkipLink targetId="form-content">
            Skip to form content
          </FormSkipLink>

          <form
            ref={formRef}
            id="user-registration-form"
            onSubmit={handleSubmit}
            noValidate
            className="space-y-6"
            role="form"
            aria-labelledby="form-title"
            aria-describedby="form-description"
          >
            <div id="form-title" className="sr-only">User Registration</div>
            <div id="form-description" className="sr-only">
              Please fill out all required fields to complete your registration.
            </div>

            <RequiredFieldIndicator />

            <AccessibleErrorSummary
              errors={errorList}
              title="Form contains errors"
            />

            <ScreenReaderAnnouncement message={announcement} />
            
            {/* Personal Information Section */}
            <FormSection
              title="Personal Information"
              description="Basic information about yourself"
              required
              error={Boolean(errors.first_name || errors.last_name || errors.email)}
              completed={Boolean(formData.first_name && formData.last_name && formData.email)}
              collapsible
              defaultOpen={currentStep === 'personal'}
            >
              <FormFieldGroup>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EnhancedFormInput
                    id="first_name"
                    label="First Name"
                    value={formData.first_name}
                    onChange={(e) => handleFieldChange('first_name', e.target.value)}
                    onValidationChange={(isValid, error) => {
                      if (!isValid && error) handleFieldValidation('first_name', formData.first_name);
                    }}
                    error={errors.first_name}
                    required
                    helpText="Enter your legal first name"
                  />
                  
                  <EnhancedFormInput
                    id="last_name"
                    label="Last Name"
                    value={formData.last_name}
                    onChange={(e) => handleFieldChange('last_name', e.target.value)}
                    onValidationChange={(isValid, error) => {
                      if (!isValid && error) handleFieldValidation('last_name', formData.last_name);
                    }}
                    error={errors.last_name}
                    required
                    helpText="Enter your legal last name"
                  />
                </div>
                
                <EnhancedFormInput
                  id="email"
                  type="email"
                  label="Email Address"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onValidationChange={(isValid, error) => {
                    if (!isValid && error) handleFieldValidation('email', formData.email);
                  }}
                  error={errors.email}
                  required
                  helpText="We'll use this to send you important updates"
                />
                
                <EnhancedFormInput
                  id="phone"
                  type="tel"
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  onValidationChange={(isValid, error) => {
                    if (!isValid && error) handleFieldValidation('phone', formData.phone);
                  }}
                  error={errors.phone}
                  helpText="Optional - for urgent communications only"
                />
              </FormFieldGroup>
            </FormSection>

            {/* Address Section */}
            <FormSection
              title="Address Information"
              description="Your contact address"
              required
              error={Boolean(errors.street || errors.city || errors.state)}
              completed={Boolean(formData.street && formData.city && formData.state)}
              collapsible
              defaultOpen={currentStep === 'address'}
            >
              <FormFieldGroup>
                <EnhancedFormInput
                  id="street"
                  label="Street Address"
                  value={formData.street}
                  onChange={(e) => handleFieldChange('street', e.target.value)}
                  error={errors.street}
                  required
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <EnhancedFormInput
                    id="city"
                    label="City"
                    value={formData.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    error={errors.city}
                    required
                  />
                  
                  <EnhancedFormSelect
                    id="state"
                    label="State"
                    value={formData.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    error={errors.state}
                    required
                    options={[
                      { value: 'CA', label: 'California' },
                      { value: 'NY', label: 'New York' },
                      { value: 'TX', label: 'Texas' },
                      { value: 'FL', label: 'Florida' }
                    ]}
                  />
                  
                  <EnhancedFormInput
                    id="zipCode"
                    label="ZIP Code"
                    value={formData.zipCode}
                    onChange={(e) => handleFieldChange('zipCode', e.target.value)}
                    onValidationChange={(isValid, error) => {
                      if (!isValid && error) handleFieldValidation('zipCode', formData.zipCode);
                    }}
                    error={errors.zipCode}
                    placeholder="12345"
                  />
                </div>
              </FormFieldGroup>
            </FormSection>

            {/* Preferences Section */}
            <FormSection
              title="Communication Preferences"
              description="How would you like us to contact you?"
              collapsible
              defaultOpen={currentStep === 'preferences'}
            >
              <AccessibleFieldset legend="Contact Method" required>
                <FormFieldGroup orientation="vertical" spacing="sm">
                  <EnhancedFormSelect
                    id="contactMethod"
                    label="Preferred Contact Method"
                    value={formData.contactMethod}
                    onChange={(e) => handleFieldChange('contactMethod', e.target.value)}
                    error={errors.contactMethod}
                    required
                    options={[
                      { value: 'email', label: 'Email' },
                      { value: 'phone', label: 'Phone' },
                      { value: 'mail', label: 'Postal Mail' }
                    ]}
                  />
                </FormFieldGroup>
              </AccessibleFieldset>
            </FormSection>

            {/* Additional Information Section */}
            <FormSection
              title="Additional Information"
              description="Optional details about yourself"
              collapsible
              defaultOpen={currentStep === 'additional'}
            >
              <FormFieldGroup>
                <EnhancedFormTextarea
                  id="bio"
                  label="Bio"
                  description="Tell us a bit about yourself"
                  value={formData.bio}
                  onChange={(e) => handleFieldChange('bio', e.target.value)}
                  error={errors.bio}
                  showCharacterCount
                  maxLength={500}
                  rows={4}
                />
                
                <EnhancedFormInput
                  id="website"
                  type="url"
                  label="Website"
                  value={formData.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  onValidationChange={(isValid, error) => {
                    if (!isValid && error) handleFieldValidation('website', formData.website);
                  }}
                  error={errors.website}
                  placeholder="https://example.com"
                  helpText="Your personal or professional website"
                />
              </FormFieldGroup>
            </FormSection>

            <FormHelpText>
              All information is kept confidential and will only be used for the purposes stated in our privacy policy.
            </FormHelpText>

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const currentIndex = steps.findIndex(s => s.id === currentStep);
                  if (currentIndex > 0 && steps[currentIndex - 1]) {
                    setCurrentStep(steps[currentIndex - 1]!.id);
                  }
                }}
                disabled={currentStep === 'personal'}
              >
                Previous
              </Button>
              
              <div className="space-x-2">
                {currentStep !== 'additional' ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const currentIndex = steps.findIndex(s => s.id === currentStep);
                      if (currentIndex < steps.length - 1 && steps[currentIndex + 1]) {
                        handleStepChange(steps[currentIndex + 1]!.id);
                      }
                    }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

