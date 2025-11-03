import { Email, UserName, UserRole, VerificationStatus } from './value-objects';

export class User {
  private constructor(
    private readonly _id: string,
    private _email: Email,
    private _name: UserName,
    private _role: UserRole,
    private _verification_status: VerificationStatus,
    private readonly _is_active: boolean,
    private readonly _last_login_at: Date | null,
    private readonly _created_at: Date,
    private _updated_at: Date,
    private _reputation_score: number = 0
  ) {}

  static create(data: {
    id: string;
    email: string;
    name: string;
    role?: string;
    verification_status?: string;
    is_active?: boolean;
    last_login_at?: Date | null;
    created_at?: Date;
    updated_at?: Date;
    reputation_score?: number;
  }): User {
    return new User(
      data.id,
      Email.create(data.email),
      UserName.create(data.name),
      UserRole.create(data.role || 'citizen'),
      VerificationStatus.create(data.verification_status || 'pending'),
      data.is_active ?? true,
      data.last_login_at ?? null,
      data.created_at ?? new Date(),
      data.updated_at ?? new Date(),
      data.reputation_score ?? 0
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

  get verification_status(): VerificationStatus {
    return this._verification_status;
  }

  get is_active(): boolean {
    return this._is_active;
  }

  get last_login_at(): Date | null {
    return this._last_login_at;
  }

  get created_at(): Date {
    return this._created_at;
  }

  get updated_at(): Date {
    return this._updated_at;
  }

  get reputation_score(): number {
    return this._reputation_score;
  }

  // Business methods
  updateEmail(newEmail: string): void {
    this._email = Email.create(newEmail);
    this._updated_at = new Date();
  }

  updateName(newName: string): void {
    this._name = UserName.create(newName);
    this._updated_at = new Date();
  }

  changeRole(newRole: string): void {
    this._role = UserRole.create(newRole);
    this._updated_at = new Date();
  }

  updateVerificationStatus(newStatus: string): void {
    this._verification_status = VerificationStatus.create(newStatus);
    this._updated_at = new Date();
  }

  updateReputationScore(newScore: number): void {
    if (newScore < 0 || newScore > 100) {
      throw new Error('Reputation score must be between 0 and 100');
    }
    this._reputation_score = newScore;
    this._updated_at = new Date();
  }

  canVerify(): boolean {
    return this._role.isModerator() || this._verification_status.is_verified();
  }

  canModerate(): boolean {
    return this._role.isModerator();
  }

  isEligibleForVerification(): boolean {
    return this._is_active && this._reputation_score >= 10;
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
      verification_status: this._verification_status.value,
      is_active: this._is_active,
      last_login_at: this._last_login_at,
      created_at: this._created_at,
      updated_at: this._updated_at,
      reputation_score: this._reputation_score
    };
  }
}





































