import { z } from 'zod';
import { emailSchema } from '@shared/validation';

// Value Objects for User Domain

export class Email {
  private constructor(private readonly _value: string) {}

  static create(email: string): Email {
    const validated = emailSchema.parse(email.toLowerCase().trim());
    return new Email(validated);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export class UserName {
  private constructor(private readonly _value: string) {}

  static create(name: string): UserName {
    const schema = z.string().min(1).max(100).regex(/^[a-zA-Z\s\-']+$/);
    const validated = schema.parse(name.trim());
    return new UserName(validated);
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserName): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export class UserRole {
  private constructor(private _value: string) {}

  static readonly CITIZEN = new UserRole('citizen');
  static readonly MODERATOR = new UserRole('moderator');
  static readonly ADMIN = new UserRole('admin');
  static readonly EXPERT = new UserRole('expert');

  static create(role: string): UserRole {
    const validRoles = ['citizen', 'moderator', 'admin', 'expert'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    return new UserRole(role);
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserRole): boolean {
    return this._value === other._value;
  }

  isAdmin(): boolean {
    return this._value === 'admin';
  }

  isModerator(): boolean {
    return this._value === 'moderator' || this._value === 'admin';
  }

  toString(): string {
    return this._value;
  }
}

export class VerificationStatus {
  private constructor(private readonly _value: string) {}

  static readonly PENDING = new VerificationStatus('pending');
  static readonly VERIFIED = new VerificationStatus('verified');
  static readonly REJECTED = new VerificationStatus('rejected');

  static create(status: string): VerificationStatus {
    const validStatuses = ['pending', 'verified', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid verification status: ${status}`);
    }
    return new VerificationStatus(status);
  }

  get value(): string {
    return this._value;
  }

  equals(other: VerificationStatus): boolean {
    return this._value === other._value;
  }

  is_verified(): boolean {
    return this._value === 'verified';
  }

  isPending(): boolean {
    return this._value === 'pending';
  }

  toString(): string {
    return this._value;
  }
}

export class ExpertiseLevel {
  private constructor(
    private readonly _domain: string,
    private readonly _level: string,
    private readonly _credentials: string[],
    private readonly _verifiedCredentials: boolean,
    private readonly _reputation_score: number
  ) {}

  static create(data: {
    domain: string;
    level: string;
    credentials: string[];
    verifiedCredentials: boolean;
    reputation_score: number;
  }): ExpertiseLevel {
    const schema = z.object({
      domain: z.string().min(1).max(100),
      level: z.enum(['citizen', 'informed', 'professional', 'expert']),
      credentials: z.array(z.string().max(200)).max(10),
      verifiedCredentials: z.boolean(),
      reputation_score: z.number().min(0).max(100)
    });

    const validated = schema.parse(data);
    return new ExpertiseLevel(
      validated.domain,
      validated.level,
      validated.credentials,
      validated.verifiedCredentials,
      validated.reputation_score
    );
  }

  get domain(): string {
    return this._domain;
  }

  get level(): string {
    return this._level;
  }

  get credentials(): string[] {
    return [...this._credentials];
  }

  get verifiedCredentials(): boolean {
    return this._verifiedCredentials;
  }

  get reputation_score(): number {
    return this._reputation_score;
  }

  getWeight(): number {
    const weights = {
      citizen: 0.6,
      informed: 0.75,
      professional: 0.9,
      expert: 1.0
    };
    return weights[this._level as keyof typeof weights] || 0.5;
  }

  equals(other: ExpertiseLevel): boolean {
    return (
      this._domain === other._domain &&
      this._level === other._level &&
      this._verifiedCredentials === other._verifiedCredentials &&
      this._reputation_score === other._reputation_score &&
      JSON.stringify(this._credentials) === JSON.stringify(other._credentials)
    );
  }
}

export class Evidence {
  private constructor(
    private readonly _type: string,
    private readonly _source: string,
    private readonly _url: string | undefined,
    private readonly _credibility: number,
    private readonly _relevance: number,
    private readonly _description: string,
    private readonly _datePublished: Date | undefined
  ) {}

  static create(data: {
    type: string;
    source: string;
    url?: string;
    credibility: number;
    relevance: number;
    description: string;
    datePublished?: Date;
  }): Evidence {
    const schema = z.object({
      type: z.enum(['document', 'data', 'expert_opinion', 'media_report', 'academic_study']),
      source: z.string().min(1).max(500),
      url: z.string().url().optional(),
      credibility: z.number().min(0).max(100),
      relevance: z.number().min(0).max(100),
      description: z.string().min(1).max(1000),
      datePublished: z.date().optional()
    });

    const validated = schema.parse(data);
    return new Evidence(
      validated.type,
      validated.source,
      validated.url,
      validated.credibility,
      validated.relevance,
      validated.description,
      validated.datePublished
    );
  }

  get type(): string {
    return this._type;
  }

  get source(): string {
    return this._source;
  }

  get url(): string | undefined {
    return this._url;
  }

  get credibility(): number {
    return this._credibility;
  }

  get relevance(): number {
    return this._relevance;
  }

  get description(): string {
    return this._description;
  }

  get datePublished(): Date | undefined {
    return this._datePublished;
  }

  getQualityScore(): number {
    const typeWeights = {
      document: 0.8,
      academic_study: 1.0,
      expert_opinion: 0.9,
      data: 0.85,
      media_report: 0.6
    };

    const typeWeight = typeWeights[this._type as keyof typeof typeWeights] || 0.5;
    const credibilityWeight = this._credibility / 100;
    const relevanceWeight = this._relevance / 100;

    return typeWeight * credibilityWeight * relevanceWeight;
  }
}

export class UserBio {
  private constructor(private readonly _value: string) {}

  static create(bio: string): UserBio {
    const schema = z.string().max(1000);
    const validated = schema.parse(bio.trim());
    return new UserBio(validated);
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserBio): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export class UserLocation {
  private constructor(private readonly _value: string) {}

  static create(location: string): UserLocation {
    const schema = z.string().min(1).max(100);
    const validated = schema.parse(location.trim());
    return new UserLocation(validated);
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserLocation): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export class Organization {
  private constructor(private readonly _value: string) {}

  static create(organization: string): Organization {
    const schema = z.string().min(1).max(200);
    const validated = schema.parse(organization.trim());
    return new Organization(validated);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Organization): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export class Interest {
  private constructor(private readonly _value: string) {}

  static create(interest: string): Interest {
    const schema = z.string().min(1).max(50);
    const validated = schema.parse(interest.trim());
    return new Interest(validated);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Interest): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}








































