import { UserBio, UserLocation, Organization, Interest } from './value-objects';

export class UserProfile {
  private constructor(
    private readonly _userId: string,
    private _bio: UserBio | null,
    private _expertise: string[],
    private _location: UserLocation | null,
    private _organization: Organization | null,
    private _reputationScore: number,
    private _isPublic: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(data: {
    userId: string;
    bio?: string;
    expertise?: string[];
    location?: string;
    organization?: string;
    reputationScore?: number;
    isPublic?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): UserProfile {
    return new UserProfile(
      data.userId,
      data.bio ? UserBio.create(data.bio) : null,
      data.expertise || [],
      data.location ? UserLocation.create(data.location) : null,
      data.organization ? Organization.create(data.organization) : null,
      data.reputationScore ?? 0,
      data.isPublic ?? true,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date()
    );
  }

  // Getters
  get userId(): string {
    return this._userId;
  }

  get bio(): UserBio | null {
    return this._bio;
  }

  get expertise(): string[] {
    return [...this._expertise];
  }

  get location(): UserLocation | null {
    return this._location;
  }

  get organization(): Organization | null {
    return this._organization;
  }

  get reputationScore(): number {
    return this._reputationScore;
  }

  get isPublic(): boolean {
    return this._isPublic;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business methods
  updateBio(newBio: string): void {
    this._bio = UserBio.create(newBio);
    this._updatedAt = new Date();
  }

  clearBio(): void {
    this._bio = null;
    this._updatedAt = new Date();
  }

  addExpertise(expertise: string): void {
    if (!this._expertise.includes(expertise)) {
      this._expertise.push(expertise);
      this._updatedAt = new Date();
    }
  }

  removeExpertise(expertise: string): void {
    const index = this._expertise.indexOf(expertise);
    if (index > -1) {
      this._expertise.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  updateExpertise(expertise: string[]): void {
    this._expertise = [...expertise];
    this._updatedAt = new Date();
  }

  updateLocation(newLocation: string): void {
    this._location = UserLocation.create(newLocation);
    this._updatedAt = new Date();
  }

  clearLocation(): void {
    this._location = null;
    this._updatedAt = new Date();
  }

  updateOrganization(newOrganization: string): void {
    this._organization = Organization.create(newOrganization);
    this._updatedAt = new Date();
  }

  clearOrganization(): void {
    this._organization = null;
    this._updatedAt = new Date();
  }

  updateReputationScore(newScore: number): void {
    if (newScore < 0 || newScore > 100) {
      throw new Error('Reputation score must be between 0 and 100');
    }
    this._reputationScore = newScore;
    this._updatedAt = new Date();
  }

  setVisibility(isPublic: boolean): void {
    this._isPublic = isPublic;
    this._updatedAt = new Date();
  }

  hasExpertise(expertise: string): boolean {
    return this._expertise.includes(expertise);
  }

  getExpertiseCount(): number {
    return this._expertise.length;
  }

  isComplete(): boolean {
    return !!(this._bio && this._location && this._organization && this._expertise.length > 0);
  }

  equals(other: UserProfile): boolean {
    return this._userId === other._userId;
  }

  toJSON() {
    return {
      userId: this._userId,
      bio: this._bio?.value || null,
      expertise: this._expertise,
      location: this._location?.value || null,
      organization: this._organization?.value || null,
      reputationScore: this._reputationScore,
      isPublic: this._isPublic,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}

export class UserInterest {
  private constructor(
    private readonly _userId: string,
    private readonly _interest: Interest,
    private readonly _createdAt: Date
  ) {}

  static create(data: {
    userId: string;
    interest: string;
    createdAt?: Date;
  }): UserInterest {
    return new UserInterest(
      data.userId,
      Interest.create(data.interest),
      data.createdAt ?? new Date()
    );
  }

  get userId(): string {
    return this._userId;
  }

  get interest(): Interest {
    return this._interest;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  equals(other: UserInterest): boolean {
    return this._userId === other._userId && this._interest.equals(other._interest);
  }

  toJSON() {
    return {
      userId: this._userId,
      interest: this._interest.value,
      createdAt: this._createdAt
    };
  }
}