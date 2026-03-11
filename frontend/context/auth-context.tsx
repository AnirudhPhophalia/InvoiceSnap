'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { clearToken, googleAuth as googleAuthApi, login as loginApi, logout as logoutApi, me, setToken, signup as signupApi } from '@/lib/api'
import type { User } from '@/lib/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  googleAuth: (idToken: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<User | null>>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const { user: profile } = await me()
        setUser(profile)
      } catch {
        clearToken()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await loginApi(email, password)
    setToken(response.token)
    setUser(response.user)
  }

  const googleAuth = async (idToken: string) => {
    const response = await googleAuthApi(idToken)
    setToken(response.token)
    setUser(response.user)
  }

  const signup = async (email: string, password: string, name: string) => {
    const response = await signupApi(email, password, name)
    setToken(response.token)
    setUser(response.user)
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch {
      // Clear local auth state even if backend logout request fails.
    }
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        googleAuth,
        signup,
        logout,
        setUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
