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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { logger } from '../utils/logger.js';

// Main user profile interface - this represents the complete profile from the API
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  verificationStatus: string;
  createdAt: string;
  profile: {
    bio?: string;
    expertise?: string[];
    location?: string;
    organization?: string;
    reputationScore: number; // This remains required as it comes from API
    isPublic: boolean;
  };
  interests: string[];
}

// Separate interface for editing - this makes optional what users can actually edit
interface EditableProfileData {
  firstName?: string;
  lastName?: string;
  profile?: {
    bio?: string;
    expertise?: string[];
    location?: string;
    organization?: string;
    isPublic?: boolean;
    // Note: reputationScore is not editable, so we exclude it from edit state
  };
}

// API update payload interface - defines what can be sent to the server
interface ProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  profile?: {
    bio?: string;
    expertise?: string[];
    location?: string;
    organization?: string;
    isPublic?: boolean;
  };
}

const UserProfile: FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  // Use the specific editable interface for type safety
  const [editData, setEditData] = useState<EditableProfileData>({});
  const [newExpertise, setNewExpertise] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile with proper error handling
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async (): Promise<UserProfile> => {
      const response = await fetch("/api/profile/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }
      return response.json();
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update profile mutation with proper typing
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdatePayload): Promise<UserProfile> => {
      const response = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      setIsEditing(false);
      setEditData({}); // Clear edit state
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update interests mutation with proper typing
  const updateInterestsMutation = useMutation({
    mutationFn: async (interests: string[]): Promise<UserProfile> => {
      const response = await fetch("/api/profile/me/interests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ interests }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update interests: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      toast({
        title: "Interests updated",
        description: "Your interests have been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update interests. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize edit state with current profile data
  const handleEdit = (): void => {
    if (!profile) return;
    
    setIsEditing(true);
    setEditData({
      firstName: profile.firstName,
      lastName: profile.lastName,
      profile: {
        bio: profile.profile?.bio || "",
        location: profile.profile?.location || "",
        organization: profile.profile?.organization || "",
        expertise: profile.profile?.expertise || [],
        isPublic: profile.profile?.isPublic || false,
      },
    });
  };

  // Save changes with proper validation
  const handleSave = (): void => {
    if (!editData.firstName?.trim() || !editData.lastName?.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return;
    }

    // Create the payload, ensuring we only send what's actually changed
    const payload: ProfileUpdatePayload = {
      firstName: editData.firstName.trim(),
      lastName: editData.lastName.trim(),
      profile: {
        bio: editData.profile?.bio?.trim() || "",
        location: editData.profile?.location?.trim() || "",
        organization: editData.profile?.organization?.trim() || "",
        expertise: editData.profile?.expertise || [],
        isPublic: editData.profile?.isPublic || false,
      },
    };

    updateProfileMutation.mutate(payload);
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

    const currentExpertise = editData.profile?.expertise || [];
    if (currentExpertise.includes(trimmedExpertise)) {
      toast({
        title: "Duplicate expertise",
        description: "This expertise area is already added.",
        variant: "destructive",
      });
      return;
    }

    setEditData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        expertise: [...currentExpertise, trimmedExpertise],
      },
    }));
    setNewExpertise("");
  };

  // Remove expertise
  const removeExpertise = (expertiseToRemove: string): void => {
    setEditData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        expertise: prev.profile?.expertise?.filter(
          (exp) => exp !== expertiseToRemove
        ) || [],
      },
    }));
  };

  // Add interest with validation
  const addInterest = (): void => {
    const trimmedInterest = newInterest.trim();
    if (!trimmedInterest || !profile) return;

    if (profile.interests.includes(trimmedInterest)) {
      toast({
        title: "Duplicate interest",
        description: "This interest is already added.",
        variant: "destructive",
      });
      return;
    }

    const updatedInterests = [...profile.interests, trimmedInterest];
    updateInterestsMutation.mutate(updatedInterests);
    setNewInterest("");
  };

  // Remove interest
  const removeInterest = (interestToRemove: string): void => {
    if (!profile) return;
    
    const updatedInterests = profile.interests.filter(
      (interest: string) => interest !== interestToRemove
    );
    updateInterestsMutation.mutate(updatedInterests);
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
                <AvatarImage src="" alt={profile.name} />
                <AvatarFallback className="text-lg">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <p className="text-muted-foreground">{profile.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getRoleColor(profile.role)}>
                    {profile.role}
                  </Badge>
                  <Badge
                    className={getVerificationColor(profile.verificationStatus)}
                  >
                    {profile.verificationStatus}
                  </Badge>
                  {profile.profile?.reputationScore > 0 && (
                    <Badge
                      variant="outline"
                      className="flex items-center space-x-1"
                    >
                      <Award className="h-3 w-3" />
                      <span>{profile.profile.reputationScore}</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {profile.profile?.isPublic ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
              {!isEditing ? (
                <Button onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="space-x-2">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save"}
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={editData.firstName || ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={editData.lastName || ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={editData.profile?.bio || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, bio: e.target.value },
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
                      value={editData.profile?.location || ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          profile: {
                            ...prev.profile,
                            location: e.target.value,
                          },
                        }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="organization"
                      placeholder="Your organization"
                      value={editData.profile?.organization || ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          profile: {
                            ...prev.profile,
                            organization: e.target.value,
                          },
                        }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPublic"
                    checked={editData.profile?.isPublic || false}
                    onCheckedChange={(checked) =>
                      setEditData((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, isPublic: checked },
                      }))
                    }
                  />
                  <Label htmlFor="isPublic">Make profile public</Label>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Full Name
                  </Label>
                  <p className="font-medium">
                    {profile.firstName} {profile.lastName}
                  </p>
                </div>
                {profile.profile?.bio && (
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Bio
                    </Label>
                    <p className="text-sm">{profile.profile.bio}</p>
                  </div>
                )}
                {profile.profile?.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {profile.profile.location}
                    </span>
                  </div>
                )}
                {profile.profile?.organization && (
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {profile.profile.organization}
                    </span>
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
                  {editData.profile?.expertise?.map((exp: string) => (
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
                {profile.profile?.expertise?.length ? (
                  profile.profile.expertise.map((exp: string) => (
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
            <div className="flex space-x-2">
              <Input
                placeholder="Add interest..."
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addInterest()}
              />
              <Button
                onClick={addInterest}
                variant="outline"
                disabled={updateInterestsMutation.isPending}
              >
                {updateInterestsMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.interests?.length ? (
                profile.interests.map((interest: string) => (
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
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No interests added yet
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;