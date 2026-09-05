import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockCurrentUser, mockHospitalAdmin, mockDoctor } from '../lib/mockData';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'patient' | 'hospital_admin' | 'doctor';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientProfile extends UserProfile {
  role: 'patient';
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export interface HospitalAdminProfile extends UserProfile {
  role: 'hospital_admin';
  hospital_name: string | null;
  hospital_address: string | null;
  hospital_phone: string | null;
  registration_number: string | null;
}

export interface DoctorProfile extends UserProfile {
  role: 'doctor';
  qualification: string | null;
  specialization: string | null;
  license_number: string | null;
  hospital_id: string | null;
}

export type Profile = PatientProfile | HospitalAdminProfile | DoctorProfile;

interface AuthState {
  user: UserProfile | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  initialize: () => Promise<void>;
  setMockRole: (role: UserRole) => void;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: UserRole;
  [key: string]: unknown;
}

function getRoleRedirect(role: UserRole): string {
  switch (role) {
    case 'patient':
      return '/patient/dashboard';
    case 'hospital_admin':
      return '/hospital/dashboard';
    case 'doctor':
      return '/doctor/dashboard';
    default:
      return '/login';
  }
}

export { getRoleRedirect };

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await get().fetchUser();
  },

  register: async (data: RegisterData) => {
    const { email, password, role, ...profileData } = data;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: profileData.full_name, role },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed: no user returned');

    const profileRecord: Record<string, unknown> = {
      id: authData.user.id,
      email,
      full_name: profileData.full_name,
      role,
      phone: profileData.phone || null,
    };

    if (role === 'patient') {
      Object.assign(profileRecord, {
        date_of_birth: profileData.date_of_birth || null,
        gender: profileData.gender || null,
        blood_group: profileData.blood_group || null,
        address: profileData.address || null,
        emergency_contact_name: profileData.emergency_contact_name || null,
        emergency_contact_phone: profileData.emergency_contact_phone || null,
      });
    } else if (role === 'hospital_admin') {
      Object.assign(profileRecord, {
        hospital_name: profileData.hospital_name || null,
        hospital_address: profileData.hospital_address || null,
        hospital_phone: profileData.hospital_phone || null,
        registration_number: profileData.registration_number || null,
      });
    } else if (role === 'doctor') {
      Object.assign(profileRecord, {
        qualification: profileData.qualification || null,
        specialization: profileData.specialization || null,
        license_number: profileData.license_number || null,
        hospital_id: profileData.hospital_id || null,
      });
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileRecord);

    if (profileError) {
      console.error('Profile insert error:', profileError);
    }

    await get().fetchUser();
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        const fallbackUser: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email || '',
          role: session.user.user_metadata?.role || 'patient',
          phone: session.user.phone || null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set({ user: fallbackUser, profile: null, isAuthenticated: true, isLoading: false });
        return;
      }

      set({
        user: profile as UserProfile,
        profile: profile as Profile,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      console.error('fetchUser error:', err);
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (data: Partial<Profile>) => {
    const { user } = get();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) throw error;
    await get().fetchUser();
  },

  initialize: async () => {
    set({ isLoading: true });

    if (!isSupabaseConfigured) {
      const fallbackUser: UserProfile = {
        id: mockCurrentUser.id,
        email: mockCurrentUser.email,
        full_name: mockCurrentUser.full_name,
        role: mockCurrentUser.role,
        phone: mockCurrentUser.phone,
        avatar_url: mockCurrentUser.avatar_url,
        created_at: mockCurrentUser.created_at,
        updated_at: mockCurrentUser.updated_at,
      };
      set({ user: fallbackUser, profile: fallbackUser as Profile, isAuthenticated: true, isLoading: false });
      return;
    }

    await get().fetchUser();

    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        await get().fetchUser();
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, isAuthenticated: false });
      }
    });
  },

  setMockRole: (role: UserRole) => {
    const mockMap: Record<UserRole, UserProfile> = {
      patient: {
        id: mockCurrentUser.id,
        email: mockCurrentUser.email,
        full_name: mockCurrentUser.full_name,
        role: mockCurrentUser.role,
        phone: mockCurrentUser.phone,
        avatar_url: mockCurrentUser.avatar_url,
        created_at: mockCurrentUser.created_at,
        updated_at: mockCurrentUser.updated_at,
      },
      hospital_admin: {
        id: mockHospitalAdmin.id,
        email: mockHospitalAdmin.email,
        full_name: mockHospitalAdmin.full_name,
        role: mockHospitalAdmin.role,
        phone: mockHospitalAdmin.phone,
        avatar_url: mockHospitalAdmin.avatar_url,
        created_at: mockHospitalAdmin.created_at,
        updated_at: mockHospitalAdmin.updated_at,
      },
      doctor: {
        id: mockDoctor.id,
        email: mockDoctor.email,
        full_name: mockDoctor.full_name,
        role: mockDoctor.role,
        phone: mockDoctor.phone,
        avatar_url: mockDoctor.avatar_url,
        created_at: mockDoctor.created_at,
        updated_at: mockDoctor.updated_at,
      },
    };
    const user = mockMap[role];
    set({ user, profile: user as Profile, isAuthenticated: true, isLoading: false });
  },
}));
