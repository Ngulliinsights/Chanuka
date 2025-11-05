import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserDomainService } from '../application/users';
import { UserService } from '../application/user-service-direct';
import { User } from '../domain/entities/user';
import { UserProfile } from '../domain/entities/user-profile';
import { UserAggregate } from '../domain/aggregates/user-aggregate';

// Mock the verification repository since we're focusing on user service integration
const mockVerificationRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByUserId: vi.fn(),
  findByBillId: vi.fn(),
  findAll: vi.fn(),
  count: vi.fn()
};

describe('UserDomainService Integration with UserService', () => {
  let userDomainService: UserDomainService;
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    userDomainService = new UserDomainService(userService, mockVerificationRepository as any);
  });

  it('should create UserDomainService with UserService', () => {
    expect(userDomainService).toBeDefined();
    expect(userService).toBeDefined();
  });

  it('should handle user registration flow', async () => {
    // Mock the UserService methods
    vi.spyOn(userService, 'findByEmail').mockResolvedValue(null);
    vi.spyOn(userService, 'save').mockResolvedValue();
    vi.spyOn(userService, 'saveProfile').mockResolvedValue();

    const registrationData = {
      email: 'test@example.com',
      name: 'Test User',
      password_hash: 'hashed_password'
    };

    const result = await userDomainService.registerUser(registrationData);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeInstanceOf(UserAggregate);
      expect(result.value.user.email).toBe('test@example.com');
      expect(result.value.user.name).toBe('Test User');
    }

    expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(userService.save).toHaveBeenCalled();
    expect(userService.saveProfile).toHaveBeenCalled();
  });

  it('should handle duplicate email registration', async () => {
    const existingUser = User.create({
      id: 'existing-id',
      email: 'test@example.com',
      name: 'Existing User',
      role: 'citizen'
    });

    vi.spyOn(userService, 'findByEmail').mockResolvedValue(existingUser);

    const registrationData = {
      email: 'test@example.com',
      name: 'Test User',
      password_hash: 'hashed_password'
    };

    const result = await userDomainService.registerUser(registrationData);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('User with this email already exists');
    }
  });

  it('should handle profile updates', async () => {
    const user = User.create({
      id: 'test-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen'
    });

    const profile = UserProfile.create({
      id: 'profile-id',
      user_id: 'test-id',
      bio: 'Original bio'
    });

    const aggregate = UserAggregate.create({
      user,
      profile,
      interests: [],
      verifications: []
    });

    vi.spyOn(userService, 'findUserAggregateById').mockResolvedValue(aggregate);
    vi.spyOn(userService, 'updateProfile').mockResolvedValue();

    const updateData = {
      bio: 'Updated bio',
      location: 'Nairobi'
    };

    const result = await userDomainService.updateUserProfile('test-id', updateData);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeInstanceOf(UserAggregate);
      expect(result.value.profile?.bio).toBe('Updated bio');
    }

    expect(userService.findUserAggregateById).toHaveBeenCalledWith('test-id');
    expect(userService.updateProfile).toHaveBeenCalled();
  });

  it('should handle user not found scenarios', async () => {
    vi.spyOn(userService, 'findUserAggregateById').mockResolvedValue(null);

    const result = await userDomainService.updateUserProfile('non-existent-id', {});

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('User not found');
    }
  });

  it('should handle interest updates', async () => {
    const user = User.create({
      id: 'test-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen'
    });

    const aggregate = UserAggregate.create({
      user,
      profile: undefined,
      interests: [],
      verifications: []
    });

    vi.spyOn(userService, 'findUserAggregateById').mockResolvedValue(aggregate);
    vi.spyOn(userService, 'deleteAllInterests').mockResolvedValue();
    vi.spyOn(userService, 'saveInterest').mockResolvedValue();

    const interests = ['technology', 'environment', 'healthcare'];

    const result = await userDomainService.updateUserInterests('test-id', interests);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeInstanceOf(UserAggregate);
      expect(result.value.interests).toHaveLength(3);
    }

    expect(userService.findUserAggregateById).toHaveBeenCalledWith('test-id');
    expect(userService.deleteAllInterests).toHaveBeenCalledWith('test-id');
    expect(userService.saveInterest).toHaveBeenCalledTimes(3);
  });

  it('should validate interest limits', async () => {
    const user = User.create({
      id: 'test-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen'
    });

    const aggregate = UserAggregate.create({
      user,
      profile: undefined,
      interests: [],
      verifications: []
    });

    vi.spyOn(userService, 'findUserAggregateById').mockResolvedValue(aggregate);

    // Try to add too many interests (more than 20)
    const tooManyInterests = Array.from({ length: 25 }, (_, i) => `interest-${i}`);

    const result = await userDomainService.updateUserInterests('test-id', tooManyInterests);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Maximum 20 interests allowed');
    }
  });

  it('should get user aggregate', async () => {
    const user = User.create({
      id: 'test-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen'
    });

    const aggregate = UserAggregate.create({
      user,
      profile: undefined,
      interests: [],
      verifications: []
    });

    vi.spyOn(userService, 'findUserAggregateById').mockResolvedValue(aggregate);

    const result = await userDomainService.getUserAggregate('test-id');

    expect(result).toBeInstanceOf(UserAggregate);
    expect(result?.user.id).toBe('test-id');
    expect(userService.findUserAggregateById).toHaveBeenCalledWith('test-id');
  });

  it('should check verification eligibility', async () => {
    const user = User.create({
      id: 'test-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen',
      is_active: true
    });

    const aggregate = UserAggregate.create({
      user,
      profile: undefined,
      interests: [],
      verifications: []
    });

    vi.spyOn(userService, 'findUserAggregateById').mockResolvedValue(aggregate);

    const result = await userDomainService.checkVerificationEligibility('test-id');

    expect(result).toHaveProperty('eligible');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('reputation_score');
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(typeof result.reputation_score).toBe('number');
  });

  it('should get aggregate statistics', async () => {
    vi.spyOn(userService, 'countUsers').mockResolvedValue(100);
    vi.spyOn(userService, 'countUsersByRole').mockResolvedValue({
      citizen: 80,
      expert: 15,
      admin: 5
    });
    vi.spyOn(userService, 'countUsersByVerificationStatus').mockResolvedValue({
      verified: 60,
      pending: 40
    });

    const result = await userDomainService.getAggregateStatistics();

    expect(result).toHaveProperty('totalUsers', 100);
    expect(result).toHaveProperty('activeUsers', 100);
    expect(result).toHaveProperty('verifiedUsers', 60);
    expect(result).toHaveProperty('totalVerifications', 0);
    expect(result).toHaveProperty('averageReputation', 0);

    expect(userService.countUsers).toHaveBeenCalled();
    expect(userService.countUsersByRole).toHaveBeenCalled();
    expect(userService.countUsersByVerificationStatus).toHaveBeenCalled();
  });
});