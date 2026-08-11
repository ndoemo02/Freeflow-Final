import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase, SUPABASE_RUNTIME } from "../lib/supabase"
import { clearPendingSignupConsent, rememberPendingOAuthSignupConsent, rememberPendingSignupConsent, syncPendingSignupConsent } from "../lib/analysisConsent"

type User = {
  id: string
  email?: string | null
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
  role?: string | null
} | null

type AuthContextType = {
  user: User
  setUser: (user: User) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, options?: { qualityEnabled?: boolean }) => Promise<void>
  signInWithGoogle: (options?: { qualityEnabled?: boolean }) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null)

  const mapAuthUser = (u: any): User =>
    u
      ? {
          id: u.id,
          email: u.email,
          user_metadata: u.user_metadata || {},
          app_metadata: u.app_metadata || {},
          role: u.role || null,
        }
      : null

  useEffect(() => {
    // initial session
    supabase.auth.getSession().then(({ data }: any) => {
      const u = data.session?.user
      setUser(mapAuthUser(u))
      if (u?.id && data.session?.access_token) {
        void syncPendingSignupConsent(u.id, data.session.access_token).catch((error) => {
          console.warn('[CONSENT_SIGNUP_SYNC]', error?.message || 'sync_failed')
        })
      }
    })
    // listen for auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      const u = session?.user
      setUser(mapAuthUser(u))
      if (u?.id && session?.access_token) {
        void syncPendingSignupConsent(u.id, session.access_token).catch((error) => {
          console.warn('[CONSENT_SIGNUP_SYNC]', error?.message || 'sync_failed')
        })
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string, options: { qualityEnabled?: boolean } = {}) {
    const qualityEnabled = options.qualityEnabled === true
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (qualityEnabled && data.user?.id) {
      rememberPendingSignupConsent(data.user.id, qualityEnabled)
      if (data.session?.access_token) {
        try {
          await syncPendingSignupConsent(data.user.id, data.session.access_token)
        } catch (syncError: any) {
          // The account was already created. Consent capture is privacy-safe
          // fail-closed and can be enabled again from the profile; do not show
          // a misleading registration failure.
          console.warn('[CONSENT_SIGNUP_SYNC]', syncError?.message || 'sync_failed')
        }
      }
    }
  }

  async function signInWithGoogle(options: { qualityEnabled?: boolean } = {}) {
    rememberPendingOAuthSignupConsent(options.qualityEnabled === true)
    const redirectTo = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      }
    })
    if (error) {
      clearPendingSignupConsent()
      throw error
    }
    const oauthUrl = data?.url
    if (!oauthUrl) {
      clearPendingSignupConsent()
      throw new Error('Brak URL autoryzacji Google (Supabase OAuth).')
    }

    let oauthHost: string | null = null
    try {
      oauthHost = new URL(oauthUrl).hostname
    } catch {
      oauthHost = null
    }

    console.info('[AUTH_GOOGLE_START]', {
      supabaseUrl: SUPABASE_RUNTIME.url,
      supabaseSource: SUPABASE_RUNTIME.source,
      redirectTo,
      oauthHost,
    })

    window.location.assign(oauthUrl)
  }

  async function signOut() {
    clearPendingSignupConsent()
    await supabase.auth.signOut()
  }

  const value: AuthContextType = { user, setUser, signIn, signUp, signInWithGoogle, signOut }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => {
  const context = useContext(Ctx)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
