import { useState, FC } from "react";
import {
  Edit,
  Save,
  X,
  MapPin,
  Building,
  Award,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { useProfile, useVerification } from '../hooks/useUsers';
import type { UserProfile as UserProfileType, UpdateProfileData } from '../types';

const UserProfile: FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UpdateProfileData>>({});
  const [newExpertise, setNewExpertise] = useState("");
  const [newInterest, setNewInterest] = useState("");

  const { profile: profileQuery, updateProfile } = useProfile();
  const { verificationStatus } = useVerification();

  const profile = profileQuery.data?.profile;
  const isLoading = profileQuery.isLoading;
  const error = profileQuery.error;

  // Initialize edit state with current profile data
  const handleEdit = (): void => {
    if (!profile) return;

    setIsEditing(true);
    setEditData({
      name: profile.name,
      bio: profile.bio || "",
      location: profile.location || "",
      interests: profile.interests || [],
      expertise: profile.expertise || [],
    });
  };

  // Save changes with proper validation
  const handleSave = (): void => {
    if (!editData.name?.trim()) {
      // Show error toast
      return;
    }

    const payload: UpdateProfileData = {
      name: editData.name.trim(),
      bio: editData.bio?.trim() || "",
      location: editData.location?.trim() || "",
      interests: editData.interests || [],
      expertise: editData.expertise || [],
    };

    updateProfile.mutate(payload);
  };

  // Cancel editing and reset state
  const handleCancel = (): void => {
    setIsEditing(false);
    setEditData({});
  };

  // Add expertise with validation
  const addExpertise = (): void => {
    const trimmedExpertise = newExpertise.trim();
    if (!trimmedExpertise) return;

    const currentExpertise = editData.expertise || [];
    if (currentExpertise.includes(trimmedExpertise)) {
      // Show duplicate error
      return;
    }

    setEditData((prev) => ({
      ...prev,
      expertise: [...currentExpertise, trimmedExpertise],
    }));
    setNewExpertise("");
  };

  // Remove expertise
  const removeExpertise = (expertiseToRemove: string): void => {
    setEditData((prev) => ({
      ...prev,
      expertise: prev.expertise?.filter(exp => exp !== expertiseToRemove) || [],
    }));
  };

  // Add interest with validation
  const addInterest = (): void => {
    const trimmedInterest = newInterest.trim();
    if (!trimmedInterest || !profile) return;

    const currentInterests = editData.interests || [];
    if (currentInterests.includes(trimmedInterest)) {
      // Show duplicate error
      return;
    }

    setEditData((prev) => ({
      ...prev,
      interests: [...currentInterests, trimmedInterest],
    }));
    setNewInterest("");
  };

  // Remove interest
  const removeInterest = (interestToRemove: string): void => {
    setEditData((prev) => ({
      ...prev,
      interests: prev.interests?.filter(interest => interest !== interestToRemove) || [],
    }));
  };

  // Utility function to get user initials
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Get role-specific styling
  const getRoleColor = (role: string): string => {
    const roleColors: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      expert: "bg-purple-100 text-purple-800",
      journalist: "bg-blue-100 text-blue-800",
      advocate: "bg-green-100 text-green-800",
    };
    return roleColors[role] || "bg-gray-100 text-gray-800";
  };

  // Get verification status styling
  const getVerificationColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      verified: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      rejected: "bg-red-100 text-red-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load profile</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback className="text-lg">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <p className="text-muted-foreground">{profile.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getRoleColor('user')}>
                    User
                  </Badge>
                  <Badge className={getVerificationColor(verificationStatus.data?.citizen || 'unverified')}>
                    {verificationStatus.data?.citizen || 'unverified'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <Button onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="space-x-2">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfile.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfile.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={editData.name || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={editData.bio || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="location"
                      placeholder="City, Country"
                      value={editData.location || ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Full Name
                  </Label>
                  <p className="font-medium">{profile.name}</p>
                </div>
                {profile.bio && (
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Bio
                    </Label>
                    <p className="text-sm">{profile.bio}</p>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.location}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expertise Card */}
        <Card>
          <CardHeader>
            <CardTitle>Areas of Expertise</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add expertise area..."
                    value={newExpertise}
                    onChange={(e) => setNewExpertise(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addExpertise()}
                  />
                  <Button onClick={addExpertise} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editData.expertise?.map((exp: string) => (
                    <Badge
                      key={exp}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {exp}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                        onClick={() => removeExpertise(exp)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.expertise?.length ? (
                  profile.expertise.map((exp: string) => (
                    <Badge key={exp} variant="secondary">
                      {exp}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No expertise areas added yet
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Interests Card */}
      <Card>
        <CardHeader>
          <CardTitle>Interests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isEditing ? (
              <>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add interest..."
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addInterest()}
                  />
                  <Button onClick={addInterest} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editData.interests?.map((interest: string) => (
                    <Badge
                      key={interest}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      {interest}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                        onClick={() => removeInterest(interest)}
                      />
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.interests?.length ? (
                  profile.interests.map((interest: string) => (
                    <Badge
                      key={interest}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No interests added yet
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;