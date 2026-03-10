'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface User {
  id: string
  email: string
  name: string
  company?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Simulate checking if user is logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('invoice_snap_user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('invoice_snap_user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name: email.split('@')[0],
    }

    setUser(newUser)
    localStorage.setItem('invoice_snap_user', JSON.stringify(newUser))
  }

  const signup = async (email: string, password: string, name: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    if (!email || !name) {
      throw new Error('Email and name are required')
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
    }

    setUser(newUser)
    localStorage.setItem('invoice_snap_user', JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('invoice_snap_user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
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
