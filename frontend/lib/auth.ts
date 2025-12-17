import api from './api';

export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export const authService = {
  async register(data: {
    email: string;
    username: string;
    password: string;
    password_confirm: string;
    phone?: string;
    invite_token?: string;
    // role is intentionally not supported client-side anymore; server controls role assignment.
  }): Promise<AuthResponse> {
    const response = await api.post('/auth/register/', data);
    const { user, tokens } = response.data;
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    return { user, tokens };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/auth/login/', { email, password });
    const { user, tokens } = response.data;
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    return { user, tokens };
  },

  async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async requestPasswordReset(email: string): Promise<void> {
    await api.post('/auth/password-reset/', { email });
  },

  async verifyOTPAndResetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    await api.post('/auth/password-reset/verify/', {
      email,
      code,
      new_password: newPassword,
    });
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile/');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put('/auth/profile/update/', data);
    return response.data;
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  },
};

