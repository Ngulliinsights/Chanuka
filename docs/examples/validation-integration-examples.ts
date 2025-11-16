// Validation Integration Examples
// This file demonstrates how to use the real validation services
// instead of mock implementations

import { inputValidationService } from '@server/core/validation';
import { GovernmentDataValidationService } from '@server/core/validation';
import { DataIntegrityValidationService } from '@server/core/validation';
import { validationService } from '@shared/core/validation';
import { userRegistrationSchema, billSubmissionSchema } from '@shared/schema';

/**
 * Example 1: Basic Input Validation
 * Shows how to validate user input using the real InputValidationService
 */
export async function validateUserRegistration(userData: unknown) {
    try {
        // Use real validation service instead of mock
        const result = await inputValidationService.validateApiInput(
            userRegistrationSchema,
            userData
        );

        if (result.isValid) {
            // Process validated data
            console.log('User registration data is valid:', result.data);
            return { success: true, data: result.data };
        } else {
            // Handle validation errors
            console.log('Validation errors:', result.errors);
            return { success: false, errors: result.errors };
        }
    } catch (error) {
        console.error('Validation service error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Example 2: Email Validation with Real Service
 * Demonstrates specialized email validation
 */
export function validateEmailAddress(email: string) {
    // Use real email validation instead of mock
    const result = inputValidationService.validateEmail(email);

    if (result.isValid) {
        console.log('Email is valid:', result.sanitized);
        return { valid: true, sanitized: result.sanitized };
    } else {
        console.log('Email validation failed:', result.error);
        return { valid: false, error: result.error };
    }
}

/**
 * Example 3: Government Data Validation
 * Shows how to validate external government data sources
 */
export async function validateGovernmentBillData(billData: unknown) {
    try {
        // Use real government data validation service
        const validation = GovernmentDataValidationService.validateBill(billData);

        if (validation.isValid) {
            console.log('Government bill data is valid');
            return { success: true, data: validation.data };
        } else {
            console.log('Government data validation failed:', validation.errors);
            return { success: false, errors: validation.errors };
        }
    } catch (error) {
        console.error('Government data validation error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Example 4: Batch Validation with Real Services
 * Demonstrates processing multiple records with validation
 */
export async function validateBatchUserData(userRecords: unknown[]) {
    try {
        // Use real batch validation from shared validation service
        const results = await validationService.validateBatch(
            userRegistrationSchema,
            userRecords,
            {
                useCache: true,
                abortEarly: false // Continue validating all records
            }
        );

        console.log(`Batch validation complete:`);
        console.log(`- Total records: ${results.totalCount}`);
        console.log(`- Valid records: ${results.validCount}`);
        console.log(`- Invalid records: ${results.invalidCount}`);

        // Process valid records
        if (results.valid.length > 0) {
            console.log('Processing valid records...');
            // Here you would save valid records to database
        }

        // Handle invalid records
        if (results.invalid.length > 0) {
            console.log('Invalid records found:');
            results.invalid.forEach(({ index, errors }) => {
                console.log(`Record ${index}:`, errors);
            });
        }

        return results;
    } catch (error) {
        console.error('Batch validation error:', error);
        throw error;
    }
}

/**
 * Example 5: Database Integrity Validation
 * Shows how to validate data integrity before database operations
 */
export async function validateAndSaveBill(billData: unknown) {
    try {
        // Step 1: Validate input data
        const inputResult = await inputValidationService.validateApiInput(
            billSubmissionSchema,
            billData
        );

        if (!inputResult.isValid) {
            return { success: false, errors: inputResult.errors };
        }

        // Step 2: Validate government data compliance
        const govResult = GovernmentDataValidationService.validateBill(inputResult.data);
        if (!govResult.isValid) {
            return { success: false, errors: govResult.errors };
        }

        // Step 3: Check database integrity
        const integrityResult = await DataIntegrityValidationService.validateRecord(
            govResult.data,
            'bills'
        );

        if (!integrityResult.isValid) {
            return { success: false, errors: integrityResult.errors };
        }

        // Step 4: Save validated data
        console.log('All validations passed, saving bill...');
        // Here you would save to database
        // await billRepository.save(integrityResult.data);

        return { success: true, data: integrityResult.data };
    } catch (error) {
        console.error('Validation pipeline error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Example 6: Real-time Validation Monitoring
 * Shows how to monitor validation performance
 */
export async function monitorValidationPerformance() {
    // Get metrics from input validation service
    const inputMetrics = inputValidationService.getMetrics();
    console.log('Input Validation Metrics:');
    console.log(`- Total validations: ${inputMetrics.totalValidations}`);
    console.log(`- Success rate: ${inputMetrics.successfulValidations / inputMetrics.totalValidations * 100}%`);
    console.log(`- Average response time: ${inputMetrics.avgValidationTime}ms`);
    console.log(`- Cache hit rate: ${inputMetrics.cacheHits / (inputMetrics.cacheHits + inputMetrics.cacheMisses) * 100}%`);

    // Get cache statistics
    const cacheStats = inputValidationService.getCacheStats();
    console.log('Cache Statistics:');
    console.log(`- Cache size: ${cacheStats.size}/${cacheStats.maxSize}`);
    console.log(`- Cache utilization: ${cacheStats.utilization}%`);
    console.log(`- Cache efficiency: ${cacheStats.efficiency}%`);

    return {
        inputMetrics,
        cacheStats
    };
}

/**
 * Example 7: Cross-Validation of Data Sources
 * Demonstrates comparing data from multiple government sources
 */
export async function crossValidateGovernmentData(records: unknown[]) {
    try {
        // Use real cross-validation service
        const crossValidation = GovernmentDataValidationService.crossValidate(
            records,
            'bills'
        );

        console.log('Cross-validation results:');
        console.log(`- Total records compared: ${crossValidation.totalRecords}`);
        console.log(`- Consistent records: ${crossValidation.consistentRecords}`);
        console.log(`- Conflicting records: ${crossValidation.conflictingRecords}`);
        console.log(`- Average confidence: ${crossValidation.averageConfidence}`);

        if (crossValidation.conflicts.length > 0) {
            console.log('Conflicts found:');
            crossValidation.conflicts.forEach(conflict => {
                console.log(`- ${conflict.field}: ${conflict.description}`);
            });
        }

        return crossValidation;
    } catch (error) {
        console.error('Cross-validation error:', error);
        throw error;
    }
}

/**
 * Example 8: File Upload Validation
 * Shows how to validate file uploads with real services
 */
export async function validateFileUpload(file: any, options: any = {}) {
    try {
        // Use real file validation service
        const result = inputValidationService.validateFileUpload(file, {
            maxSize: options.maxSize || 10 * 1024 * 1024, // 10MB default
            allowedTypes: options.allowedTypes || ['application/pdf', 'image/jpeg'],
            allowMultiple: options.allowMultiple || false
        });

        if (result.isValid) {
            console.log('File upload validation passed');
            return { success: true, file: result.data };
        } else {
            console.log('File validation failed:', result.errors);
            return { success: false, errors: result.errors };
        }
    } catch (error) {
        console.error('File validation error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Example 9: Validation Pipeline with Error Recovery
 * Demonstrates robust validation with fallback strategies
 */
export async function robustValidationPipeline(data: unknown) {
    const results = {
        inputValidation: null,
        governmentValidation: null,
        integrityValidation: null,
        finalResult: null
    };

    try {
        // Step 1: Input validation (always required)
        results.inputValidation = await inputValidationService.validateApiInput(
            userRegistrationSchema,
            data
        );

        if (!results.inputValidation.isValid) {
            return {
                success: false,
                stage: 'input',
                errors: results.inputValidation.errors
            };
        }

        // Step 2: Government data validation (if applicable)
        try {
            results.governmentValidation = GovernmentDataValidationService.validateBill(
                results.inputValidation.data
            );
        } catch (govError) {
            console.warn('Government validation failed, continuing with fallback:', govError);
            // Continue without government validation
        }

        // Step 3: Database integrity validation
        try {
            results.integrityValidation = await DataIntegrityValidationService.validateRecord(
                results.inputValidation.data,
                'users'
            );
        } catch (integrityError) {
            console.warn('Integrity validation failed, attempting repair:', integrityError);
            // Attempt automatic repair or flag for manual review
        }

        // Step 4: Final decision based on validation results
        const hasCriticalErrors = (
            !results.inputValidation.isValid ||
            (results.integrityValidation && !results.integrityValidation.isValid)
        );

        if (hasCriticalErrors) {
            return {
                success: false,
                stage: 'final',
                errors: [
                    ...(results.inputValidation.errors || []),
                    ...(results.integrityValidation?.errors || [])
                ]
            };
        }

        results.finalResult = {
            success: true,
            data: results.inputValidation.data,
            warnings: results.governmentValidation?.warnings || []
        };

        return results.finalResult;

    } catch (error) {
        console.error('Validation pipeline failed:', error);
        return {
            success: false,
            stage: 'pipeline',
            error: error.message
        };
    }
}

/**
 * Example 10: Health Check Integration
 * Shows how to integrate validation health checks
 */
export async function performValidationHealthCheck() {
    try {
        // Check input validation service health
        const inputHealth = await fetch('/api/system/health/schema');
        const inputData = await inputHealth.json();

        // Check validation metrics
        const metricsResponse = await fetch('/api/system/metrics/validation?period=1h');
        const metricsData = await metricsResponse.json();

        // Check overall validation health
        const overallResponse = await fetch('/api/system/health/validation');
        const overallData = await overallResponse.json();

        const healthStatus = {
            inputValidation: inputData.services?.InputValidationService?.status,
            metrics: {
                successRate: metricsData.summary?.successRate,
                avgResponseTime: metricsData.summary?.avgValidationTime
            },
            overall: overallData.status
        };

        console.log('Validation Health Status:', healthStatus);

        // Determine if system is healthy
        const isHealthy = (
            healthStatus.inputValidation === 'healthy' &&
            healthStatus.metrics.successRate > 0.95 &&
            healthStatus.overall === 'healthy'
        );

        return {
            healthy: isHealthy,
            details: healthStatus
        };

    } catch (error) {
        console.error('Health check failed:', error);
        return {
            healthy: false,
            error: error.message
        };
    }
}

// Export all examples for easy testing
export const validationExamples = {
    validateUserRegistration,
    validateEmailAddress,
    validateGovernmentBillData,
    validateBatchUserData,
    validateAndSaveBill,
    monitorValidationPerformance,
    crossValidateGovernmentData,
    validateFileUpload,
    robustValidationPipeline,
    performValidationHealthCheck
};