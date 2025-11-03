import { User } from '../entities/user';
import { UserProfile, UserInterest } from '../entities/user-profile';
import { CitizenVerification } from '../entities/citizen-verification';

export class UserAggregate {
  private constructor(
    private readonly _user: User,
    private _profile: UserProfile | null,
    private _interests: UserInterest[],
    private _verifications: CitizenVerification[]
  ) {}

  static create(data: {
    user: User;
    profile?: UserProfile;
    interests?: UserInterest[];
    verifications?: CitizenVerification[];
  }): UserAggregate {
    return new UserAggregate(
      data.user,
      data.profile || null,
      data.interests || [],
      data.verifications || []
    );
  }

  // Getters
  get user(): User {
    return this._user;
  }

  get profile(): UserProfile | null {
    return this._profile;
  }

  get interests(): UserInterest[] {
    return [...this._interests];
  }

  get verifications(): CitizenVerification[] {
    return [...this._verifications];
  }

  // Business methods
  updateProfile(newProfile: UserProfile): void {
    if (newProfile.user_id !== this._user.id) {
      throw new Error('Profile does not belong to this user');
    }
    this._profile = newProfile;
  }

  addInterest(interest: UserInterest): void {
    if (interest.user_id !== this._user.id) {
      throw new Error('Interest does not belong to this user');
    }
    if (!this._interests.some(i => i.equals(interest))) {
      this._interests.push(interest);
    }
  }

  removeInterest(interest: UserInterest): void {
    this._interests = this._interests.filter(i => !i.equals(interest));
  }

  updateInterests(interests: UserInterest[]): void {
    interests.forEach(interest => {
      if (interest.user_id !== this._user.id) {
        throw new Error('Interest does not belong to this user');
      }
    });
    this._interests = [...interests];
  }

  addVerification(verification: CitizenVerification): void {
    if (verification.citizenId !== this._user.id) {
      throw new Error('Verification does not belong to this user');
    }
    this._verifications.push(verification);
  }

  updateVerification(updatedVerification: CitizenVerification): void {
    const index = this._verifications.findIndex(v => v.id === updatedVerification.id);
    if (index === -1) {
      throw new Error('Verification not found');
    }
    this._verifications[index] = updatedVerification;
  }

  // Computed properties
  get reputation_score(): number {
    const baseScore = this._user.reputation_score;
    const profileBonus = this._profile?.reputation_score || 0;
    const verificationBonus = this._verifications.length * 2;

    return Math.min(100, baseScore + profileBonus + verificationBonus);
  }

  get expertiseAreas(): string[] {
    const userExpertise = this._profile?.expertise || [];
    const verificationExpertise = [...new Set(
      this._verifications.map(v => v.expertise.domain)
    )];

    return [...new Set([...userExpertise, ...verificationExpertise])];
  }

  get verificationCount(): number {
    return this._verifications.length;
  }

  get verifiedVerificationsCount(): number {
    return this._verifications.filter(v => v.is_verified()).length;
  }

  get averageVerificationConfidence(): number {
    if (this._verifications.length === 0) return 0;
    const totalConfidence = this._verifications.reduce((sum, v) => sum + v.confidence, 0);
    return Math.round(totalConfidence / this._verifications.length);
  }

  get isEligibleForAdvancedVerification(): boolean {
    return (
      this._user.isEligibleForVerification() &&
      this.verifiedVerificationsCount >= 5 &&
      this.averageVerificationConfidence >= 70
    );
  }

  get profileCompleteness(): number {
    let completeness = 0;
    const totalFields = 4; // bio, location, organization, expertise

    if (this._profile?.bio) completeness++;
    if (this._profile?.location) completeness++;
    if (this._profile?.organization) completeness++;
    if (this._profile && this._profile.expertise.length > 0) completeness++;

    return Math.round((completeness / totalFields) * 100);
  }

  get engagement_score(): number {
    const verificationScore = this.verificationCount * 10;
    const profileScore = this.profileCompleteness;
    const reputation_score = this.reputation_score;

    return Math.min(100, Math.round((verificationScore + profileScore + reputation_score) / 3));
  }

  // Domain behaviors
  canVerifyBill(bill_id: number): boolean { // Check if user has already verified this bill
    const existingVerification = this._verifications.find(v => v.bill_id === bill_id);
    if (existingVerification) {
      return false; // One verification per bill per user
     }

    // Check eligibility
    return this._user.isEligibleForVerification();
  }

  canEndorseVerification(verificationId: string): boolean {
    const verification = this._verifications.find(v => v.id === verificationId);
    if (verification) {
      return false; // Cannot endorse own verification
    }

    return this._user.is_active;
  }

  canDisputeVerification(verificationId: string): boolean {
    const verification = this._verifications.find(v => v.id === verificationId);
    if (verification) {
      return false; // Cannot dispute own verification
    }

    return this._user.is_active && this.reputation_score >= 20;
  }

  equals(other: UserAggregate): boolean {
    return this._user.equals(other._user);
  }

  toJSON() {
    return {
      user: this._user.toJSON(),
      profile: this._profile?.toJSON() || null,
      interests: this._interests.map(i => i.toJSON()),
      verifications: this._verifications.map(v => v.toJSON()),
      computed: {
        reputation_score: this.reputation_score,
        expertiseAreas: this.expertiseAreas,
        verificationCount: this.verificationCount,
        verifiedVerificationsCount: this.verifiedVerificationsCount,
        averageVerificationConfidence: this.averageVerificationConfidence,
        profileCompleteness: this.profileCompleteness,
        engagement_score: this.engagement_score,
        isEligibleForAdvancedVerification: this.isEligibleForAdvancedVerification
      }
    };
  }
}





































