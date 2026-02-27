# Personalization Module

## Overview

The Personalization module provides user persona detection and personalized experiences for the Chanuka platform. It analyzes user behavior to classify personas and deliver tailored content and features.

## Purpose and Responsibilities

- User persona detection and classification
- Behavior pattern analysis
- Personalized content recommendations
- User preference tracking
- Adaptive UI based on persona

## Public Exports

### Classes
- `PersonaDetector` - Detects and classifies user personas
- `personaDetector` - Global persona detector instance

### Types
- `PersonaType` - User persona classifications
- `PersonaMetrics` - Persona detection metrics
- `PersonaClassification` - Classification results
- `PersonaPreferences` - User preferences by persona

## Usage Examples

```typescript
import { personaDetector } from '@/infrastructure/personalization';

// Detect user persona
const persona = await personaDetector.detectPersona(userId);

// Customize experience based on persona
if (persona.type === 'power-user') {
  showAdvancedFeatures();
}
```

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md
- **Requirement 5.1**: All exports documented
- **Requirement 5.3**: 100% documented exports
