import { apiClient } from '../utils/api';

export interface Profile {
  _id: string;
  account: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  phone?: string;
  personalEmail?: string;
  address?: string;
  dateOfBirth?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
  personalEmail?: string;
  address?: string;
  dateOfBirth?: string;
  avatar?: string;
  bio?: string;
  currentPassword?: string;
  newPassword?: string;
}

export const profileAPI = {
  getMyProfile: async (): Promise<{ profile: Profile }> => {
    return apiClient.request<{ profile: Profile }>('/profile/me');
  },

  updateMyProfile: async (data: UpdateProfileData): Promise<{ message: string; profile: Profile }> => {
    return apiClient.request<{ message: string; profile: Profile }>('/profile/me', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};
