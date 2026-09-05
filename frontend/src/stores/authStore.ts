import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isClerkConfigured } from '../lib/clerk';
import { mockCurrentUser, mockHospitalAdmin, mockDoctor } from '../lib/mockData';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'patient' | 'hospital_admin' | 'doctor';

export interface ClerkUserLike {
  id: string;
  email: string | null;
  fullName: string | null;
  role?: string | null;
  imageUrl?: string | null;
}

const clerkInstance = () => (window as unknown as { Clerk?: { user?: unknown; signIn?: unknown; signOut?: unknown } | undefined }).Clerk;

const clerkUserLikeFromInstance = (cu: unknown): ClerkUserLike | null => {
  if (!cu || typeof cu !== 'object') return null;
  const c = cu as { id?: string; fullName?: string | null; imageUrl?: string | null; primaryEmailAddress?: { emailAddress?: string | null }; emailAddresses?: { emailAddress?: string }[]; publicMetadata?: Record<string, unknown> };
  if (!c.id) return null;
  const email = c.primaryEmailAddress?.emailAddress ?? c.emailAddresses?.[0]?.emailAddress ?? null;
  return {
    id: c.id,
    email: email ?? null,
    fullName: c.fullName ?? null,
    role: (c.publicMetadata?.role as string | undefined) ?? null,
    imageUrl: c.imageUrl ?? null,
  };
};

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
  syncFromClerk: (u: ClerkUserLike | null) => Promise<void>;
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
    if (isClerkConfigured()) {
      const clerk = window.Clerk as unknown as { signIn?: { create?: (p: { identifier: string; password: string }) => Promise<{ status?: string }> } } | undefined;
      const signIn = clerk?.signIn;
      if (signIn?.create) {
        try {
          const result = await signIn.create({ identifier: email, password });
          if (result.status === 'complete') {
            await get().fetchUser();
          }
          return;
        } catch (err) {
          const msg =
            err && typeof err === 'object' && 'errors' in err
              ? String((err as { errors?: { message?: string }[] }).errors?.[0]?.message || (err as { message?: string }).message || 'Login failed')
              : err instanceof Error ? err.message : 'Login failed. Please try again.';
          throw new Error(msg);
        }
      }
    }

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
    if (isClerkConfigured()) {
      const clerk = window.Clerk as unknown as { signOut?: (opts?: { redirectUrl?: string }) => Promise<void> } | undefined;
      try {
        await clerk?.signOut?.({ redirectUrl: '/' });
      } catch {
        void 0;
      }
    }
    await supabase.auth.signOut().catch(() => {});
    set({ user: null, profile: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    if (isClerkConfigured()) {
      const cu = clerkInstance();
      await get().syncFromClerk(cu?.user ? clerkUserLikeFromInstance(cu.user) : null);
      return;
    }

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

    if (isClerkConfigured()) {
      const cu = clerkInstance() as { user?: { update?: (p: { publicMetadata?: Record<string, unknown> }) => Promise<unknown> } } | undefined;
      try {
        const current = cu?.user;
        if (current?.update) {
          const core = {
            role: (data as { role?: UserRole }).role ?? user.role,
            full_name: (data as { full_name?: string }).full_name ?? user.full_name,
            email: (data as { email?: string }).email ?? user.email,
            phone: (data as { phone?: string | null }).phone ?? user.phone ?? null,
          };
          await current.update({ publicMetadata: { ...core } });
        }
      } catch (err) {
        console.error('Clerk profile mirror failed (non-fatal):', err);
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.warn('Supabase profile update skipped:', error.message);
    }
    await get().fetchUser();
  },

  syncFromClerk: async (u: ClerkUserLike | null) => {
    if (!u) {
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
      return;
    }

    set({ isLoading: true });

    let dbProfile: Profile | null = null;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      if (data) dbProfile = data as Profile;
    } catch {
      dbProfile = null;
    }

    const validRoles: UserRole[] = ['patient', 'hospital_admin', 'doctor'];
    const role: UserRole = u.role && validRoles.includes(u.role as UserRole)
      ? (u.role as UserRole)
      : (dbProfile?.role ?? 'patient');

    const base: UserProfile = {
      id: u.id,
      email: u.email || dbProfile?.email || '',
      full_name: u.fullName || dbProfile?.full_name || '',
      role,
      phone: (dbProfile as { phone?: string | null } | null)?.phone ?? null,
      avatar_url: u.imageUrl || (dbProfile as { avatar_url?: string | null } | null)?.avatar_url || null,
      created_at: (dbProfile as { created_at?: string } | null)?.created_at || new Date().toISOString(),
      updated_at: (dbProfile as { updated_at?: string } | null)?.updated_at || new Date().toISOString(),
    };

    const mergedProfile: Profile = (
      dbProfile
        ? { ...dbProfile, id: u.id, email: base.email, full_name: base.full_name, role }
        : { ...base }
    ) as Profile;

    set({ user: base, profile: mergedProfile, isAuthenticated: true, isLoading: false });
  },

  initialize: async () => {
    set({ isLoading: true });

    if (isClerkConfigured()) {
      const clerk = window.Clerk as unknown as { user?: unknown } | undefined;
      await get().syncFromClerk(clerk?.user ? clerkUserLikeFromInstance(clerk.user) : null);
      return;
    }

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
