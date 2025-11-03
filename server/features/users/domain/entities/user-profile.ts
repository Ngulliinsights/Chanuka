import { UserBio, UserLocation, Organization, Interest } from './value-objects';

export class UserProfile {
  private constructor(
    private readonly _user_id: string,
    private _bio: UserBio | null,
    private _expertise: string[],
    private _location: UserLocation | null,
    private _organization: Organization | null,
    private _reputation_score: number,
    private _is_public: boolean,
    private readonly _created_at: Date,
    private _updated_at: Date
  ) {}

  static create(data: { user_id: string;
    bio?: string;
    expertise?: string[];
    location?: string;
    organization?: string;
    reputation_score?: number;
    is_public?: boolean;
    created_at?: Date;
    updated_at?: Date;
   }): UserProfile {
    return new UserProfile(
      data.user_id,
      data.bio ? UserBio.create(data.bio) : null,
      data.expertise || [],
      data.location ? UserLocation.create(data.location) : null,
      data.organization ? Organization.create(data.organization) : null,
      data.reputation_score ?? 0,
      data.is_public ?? true,
      data.created_at ?? new Date(),
      data.updated_at ?? new Date()
    );
  }

  // Getters
  get user_id(): string {
    return this._user_id;
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

  get reputation_score(): number {
    return this._reputation_score;
  }

  get is_public(): boolean {
    return this._is_public;
  }

  get created_at(): Date {
    return this._created_at;
  }

  get updated_at(): Date {
    return this._updated_at;
  }

  // Business methods
  updateBio(newBio: string): void {
    this._bio = UserBio.create(newBio);
    this._updated_at = new Date();
  }

  clearBio(): void {
    this._bio = null;
    this._updated_at = new Date();
  }

  addExpertise(expertise: string): void {
    if (!this._expertise.includes(expertise)) {
      this._expertise.push(expertise);
      this._updated_at = new Date();
    }
  }

  removeExpertise(expertise: string): void {
    const index = this._expertise.indexOf(expertise);
    if (index > -1) {
      this._expertise.splice(index, 1);
      this._updated_at = new Date();
    }
  }

  updateExpertise(expertise: string[]): void {
    this._expertise = [...expertise];
    this._updated_at = new Date();
  }

  updateLocation(newLocation: string): void {
    this._location = UserLocation.create(newLocation);
    this._updated_at = new Date();
  }

  clearLocation(): void {
    this._location = null;
    this._updated_at = new Date();
  }

  updateOrganization(newOrganization: string): void {
    this._organization = Organization.create(newOrganization);
    this._updated_at = new Date();
  }

  clearOrganization(): void {
    this._organization = null;
    this._updated_at = new Date();
  }

  updateReputationScore(newScore: number): void {
    if (newScore < 0 || newScore > 100) {
      throw new Error('Reputation score must be between 0 and 100');
    }
    this._reputation_score = newScore;
    this._updated_at = new Date();
  }

  setVisibility(is_public: boolean): void {
    this._is_public = is_public;
    this._updated_at = new Date();
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
    return this._user_id === other._user_id;
  }

  toJSON() { return {
      user_id: this._user_id,
      bio: this._bio?.value || null,
      expertise: this._expertise,
      location: this._location?.value || null,
      organization: this._organization?.value || null,
      reputation_score: this._reputation_score,
      is_public: this._is_public,
      created_at: this._created_at,
      updated_at: this._updated_at
     };
  }
}

export class UserInterest {
  private constructor(
    private readonly _user_id: string,
    private readonly _interest: Interest,
    private readonly _created_at: Date
  ) {}

  static create(data: { user_id: string;
    interest: string;
    created_at?: Date;
   }): UserInterest {
    return new UserInterest(
      data.user_id,
      Interest.create(data.interest),
      data.created_at ?? new Date()
    );
  }

  get user_id(): string {
    return this._user_id;
  }

  get interest(): Interest {
    return this._interest;
  }

  get created_at(): Date {
    return this._created_at;
  }

  equals(other: UserInterest): boolean {
    return this._user_id === other._user_id && this._interest.equals(other._interest);
  }

  toJSON() { return {
      user_id: this._user_id,
      interest: this._interest.value,
      created_at: this._created_at
     };
  }
}





































