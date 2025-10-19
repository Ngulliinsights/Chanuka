import { Email, UserName, UserRole, VerificationStatus } from './value-objects';

export class User {
  private constructor(
    private readonly _id: string,
    private _email: Email,
    private _name: UserName,
    private _role: UserRole,
    private _verificationStatus: VerificationStatus,
    private readonly _isActive: boolean,
    private readonly _lastLoginAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _reputationScore: number = 0
  ) {}

  static create(data: {
    id: string;
    email: string;
    name: string;
    role?: string;
    verificationStatus?: string;
    isActive?: boolean;
    lastLoginAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    reputationScore?: number;
  }): User {
    return new User(
      data.id,
      Email.create(data.email),
      UserName.create(data.name),
      UserRole.create(data.role || 'citizen'),
      VerificationStatus.create(data.verificationStatus || 'pending'),
      data.isActive ?? true,
      data.lastLoginAt ?? null,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
      data.reputationScore ?? 0
    );
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get email(): Email {
    return this._email;
  }

  get name(): UserName {
    return this._name;
  }

  get role(): UserRole {
    return this._role;
  }

  get verificationStatus(): VerificationStatus {
    return this._verificationStatus;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastLoginAt(): Date | null {
    return this._lastLoginAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get reputationScore(): number {
    return this._reputationScore;
  }

  // Business methods
  updateEmail(newEmail: string): void {
    this._email = Email.create(newEmail);
    this._updatedAt = new Date();
  }

  updateName(newName: string): void {
    this._name = UserName.create(newName);
    this._updatedAt = new Date();
  }

  changeRole(newRole: string): void {
    this._role = UserRole.create(newRole);
    this._updatedAt = new Date();
  }

  updateVerificationStatus(newStatus: string): void {
    this._verificationStatus = VerificationStatus.create(newStatus);
    this._updatedAt = new Date();
  }

  updateReputationScore(newScore: number): void {
    if (newScore < 0 || newScore > 100) {
      throw new Error('Reputation score must be between 0 and 100');
    }
    this._reputationScore = newScore;
    this._updatedAt = new Date();
  }

  canVerify(): boolean {
    return this._role.isModerator() || this._verificationStatus.isVerified();
  }

  canModerate(): boolean {
    return this._role.isModerator();
  }

  isEligibleForVerification(): boolean {
    return this._isActive && this._reputationScore >= 10;
  }

  equals(other: User): boolean {
    return this._id === other._id;
  }

  toJSON() {
    return {
      id: this._id,
      email: this._email.value,
      name: this._name.value,
      role: this._role.value,
      verificationStatus: this._verificationStatus.value,
      isActive: this._isActive,
      lastLoginAt: this._lastLoginAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      reputationScore: this._reputationScore
    };
  }
}




































