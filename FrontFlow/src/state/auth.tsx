import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "../lib/supabase"

type User = { id: string; email?: string | null } | null

type AuthContextType = {
  user: User
  setUser: (user: User) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null)

  useEffect(() => {
    // initial session
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email } : null)
    })
    // listen for auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    })
    if (error) throw error
  }

  async function signOut() {
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