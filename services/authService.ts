// @ts-nocheck - Supabase type definitions incompatible with strict mode
import { supabase } from '@/lib/supabase';
import { Profile, ProfileUpdate } from '@/types/database';

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  role: 'student' | 'faculty';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: Profile;
}

/**
 * Sign up a new user
 */
export async function signUp(data: SignUpData): Promise<AuthResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          role: data.role,
        },
      },
    });

    if (authError) {
      // Provide user-friendly error messages
      let errorMessage = authError.message;
      if (authError.message.includes('already registered') || authError.status === 422) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (authError.message.includes('password')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (authError.message.includes('email')) {
        errorMessage = 'Please enter a valid email address.';
      }
      return { success: false, error: errorMessage };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create account' };
    }

    // Check if user already existed (Supabase returns user but no session for existing unconfirmed users)
    if (!authData.session && authData.user.identities?.length === 0) {
      return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
    }

    // Wait for trigger, then try to fetch profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to fetch the profile first
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // If profile doesn't exist (trigger failed), create it manually
    if (profileError && profileError.code === 'PGRST116') {
      console.log('Profile not created by trigger, creating manually...');
      
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        // Still return success since auth user was created
        return { success: true, user: undefined };
      }
      
      profile = newProfile;
    } else if (profileError) {
      console.error('Profile fetch error:', profileError);
      return { success: true, user: undefined };
    }

    return { success: true, user: profile };
  } catch (error) {
    console.error('SignUp error:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(data: SignInData): Promise<AuthResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      // Provide user-friendly error messages
      let errorMessage = authError.message;
      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      }
      return { success: false, error: errorMessage };
    }

    if (!authData.user) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Fetch user profile
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // If profile doesn't exist, create it from auth user metadata
    if (profileError && profileError.code === 'PGRST116') {
      console.log('Profile not found, creating from auth metadata...');
      
      const metadata = authData.user.user_metadata || {};
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: metadata.full_name || '',
          role: metadata.role || 'student',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        return { success: false, error: 'Failed to create user profile. Please contact support.' };
      }
      
      profile = newProfile;
    } else if (profileError) {
      console.error('Profile fetch error:', profileError);
      return { success: false, error: 'Failed to fetch user profile. Please try again.' };
    }

    return { success: true, user: profile };
  } catch (error) {
    console.error('SignIn error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('SignOut error:', error);
    return { success: false, error: 'Failed to sign out' };
  }
}

/**
 * Get the current session and user profile
 */
export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('GetCurrentUser error:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<AuthResult> {
  try {
    // @ts-expect-error Supabase types issue
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data as Profile };
  } catch (error) {
    console.error('UpdateProfile error:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}

/**
 * Reset password request
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'studentportal://reset-password',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('ResetPassword error:', error);
    return { success: false, error: 'Failed to send reset email' };
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: Profile | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const profile = await getCurrentUser();
      callback(profile);
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });
}
