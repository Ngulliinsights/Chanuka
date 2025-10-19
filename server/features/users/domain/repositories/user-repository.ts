import { User } from '../entities/user';
import { UserProfile, UserInterest } from '../entities/user-profile';
import { CitizenVerification } from '../entities/citizen-verification';
import { UserAggregate } from '../aggregates/user-aggregate';

export interface UserRepository {
  // User operations
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User, passwordHash?: string): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;

  // Profile operations
  findProfileByUserId(userId: string): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;
  updateProfile(profile: UserProfile): Promise<void>;

  // Interest operations
  findInterestsByUserId(userId: string): Promise<UserInterest[]>;
  saveInterest(interest: UserInterest): Promise<void>;
  deleteInterest(userId: string, interest: string): Promise<void>;
  deleteAllInterests(userId: string): Promise<void>;

  // Verification operations
  findVerificationsByUserId(userId: string): Promise<CitizenVerification[]>;
  findVerificationById(id: string): Promise<CitizenVerification | null>;
  saveVerification(verification: CitizenVerification): Promise<void>;
  updateVerification(verification: CitizenVerification): Promise<void>;

  // Aggregate operations
  findUserAggregateById(id: string): Promise<UserAggregate | null>;
  saveUserAggregate(aggregate: UserAggregate): Promise<void>;

  // Query operations
  findUsersByRole(role: string): Promise<User[]>;
  findUsersByVerificationStatus(status: string): Promise<User[]>;
  findUsersByReputationRange(min: number, max: number): Promise<User[]>;
  searchUsers(query: string, limit?: number): Promise<User[]>;

  // Statistics
  countUsers(): Promise<number>;
  countUsersByRole(): Promise<Record<string, number>>;
  countUsersByVerificationStatus(): Promise<Record<string, number>>;
}




































