/**
 * User Profile Page
 * Main page component for user profile management
 */

import React from 'react';
import { UserProfile } from '../components/user/UserProfile';

export function UserProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <UserProfile />
    </div>
  );
}

export default UserProfilePage;