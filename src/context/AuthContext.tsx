import i18n from "../i18n";
import { requestLoginOtp, sendWelcomeEmail as sendWelcomeEmailApi } from "../api/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isPasswordRecoveryCallback } from "../lib/authRecovery";
import { getSupabase, isSupabaseConfigured, type Profile } from "../lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; requiresOtp?: boolean }>;
  verifyLoginOtp: (email: string, otp: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as Profile);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const metaName = userData.user?.user_metadata?.full_name as string | undefined;
    if (metaName) {
      setProfile({
        id: userId,
        full_name: metaName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    const recoveryCallback = isPasswordRecoveryCallback();

    if (recoveryCallback) {
      setPasswordRecovery(true);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (recoveryCallback || data.session) {
        const hashType = new URLSearchParams(window.location.hash.replace(/^#/, "")).get(
          "type"
        );
        if (hashType === "recovery" || recoveryCallback) {
          setPasswordRecovery(true);
        }
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        if (isPasswordRecoveryCallback()) {
          setPasswordRecovery(true);
        } else {
          const hashType = new URLSearchParams(window.location.hash.replace(/^#/, "")).get(
            "type"
          );
          if (hashType === "recovery") {
            setPasswordRecovery(true);
          }
        }
      }
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
        const onResetPage = window.location.pathname === "/reset-password";
        if (!onResetPage) {
          setPasswordRecovery(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const verified = await requestLoginOtp(trimmedEmail, password);
      if (verified.error) {
        return { error: verified.error };
      }

      const supabase = getSupabase();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: false },
      });

      if (otpError) {
        return { error: otpError.message };
      }

      return { error: null, requiresOtp: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : i18n.t("errors.signInFailed") };
    }
  }, []);

  const verifyLoginOtp = useCallback(async (email: string, otp: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: "email",
      });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : i18n.t("errors.otpInvalid") };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
          },
        });

        if (error) {
          return { error: error.message, needsEmailConfirmation: false };
        }

        if (data.user?.id) {
          try {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              full_name: fullName.trim(),
              updated_at: new Date().toISOString(),
            });
          } catch {
            /* profiles table may not exist yet — auth still succeeds via user_metadata */
          }
        }

        if (data.session?.user) {
          setSession(data.session);
          setUser(data.session.user);
          await fetchProfile(data.session.user.id);
          if (data.session.access_token) {
            sendWelcomeEmailApi(data.session.access_token).catch(() => {
              /* welcome email is best-effort */
            });
          }
        }

        const needsEmailConfirmation = !data.session;
        return { error: null, needsEmailConfirmation };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : i18n.t("errors.signUpFailed"),
          needsEmailConfirmation: false,
        };
      }
    },
    [fetchProfile]
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      return { error: error?.message ?? null };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : i18n.t("errors.passwordResetFailed"),
      };
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) {
        setPasswordRecovery(false);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        window.history.replaceState(null, "", window.location.pathname);
      }
      return { error: error?.message ?? null };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : i18n.t("errors.passwordUpdateFailed"),
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setProfile(null);
    setPasswordRecovery(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      configured: isSupabaseConfigured,
      passwordRecovery,
      signIn,
      verifyLoginOtp,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      loading,
      passwordRecovery,
      signIn,
      verifyLoginOtp,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
