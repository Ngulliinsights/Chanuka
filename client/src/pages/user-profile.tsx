import { FC } from 'react';
import UserProfile from '..\components\profile\user-profile';
import { logger } from '..\utils\browser-logger';

const UserProfilePage: FC = () => {
  return (
    <div className="pb-20 lg:pb-0">
      <UserProfile />
    </div>
  );
};

export default UserProfilePage;