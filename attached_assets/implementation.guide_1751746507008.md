# Chanuka Implementation Guide

This guide focuses on critical implementation details for key architectural components of the Chanuka civic engagement platform.

## Frontend Implementation

### 1. Next.js Application Setup with Server Components

```typescript
// app/layout.tsx - Root Layout with Providers
import { Providers } from '@/components/providers'
import { Analytics } from '@/components/analytics'
import { SpeedInsights } from '@/components/speed-insights'

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <Providers>
          {children}
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}

// components/providers.tsx - Optimized Provider Nesting
import { AuthProvider } from '@/context/auth-context'
import { ThemeProvider } from '@/context/theme-context'
import { ConsultationProvider } from '@/context/consultation-context'
import { NetworkProvider } from '@/context/network-context'
import { QueryClientProvider } from '@/context/query-client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider>
      <NetworkProvider>
        <ThemeProvider>
          <AuthProvider>
            <ConsultationProvider>
              {children}
            </ConsultationProvider>
          </AuthProvider>
        </ThemeProvider>
      </NetworkProvider>
    </QueryClientProvider>
  )
}
```

### 2. Authentication and Authorization Implementation

```typescript
// context/auth-context.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { authService } from '@/services/auth-service'
import { useLocalStorage } from '@/hooks/use-local-storage'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  hasVerifiedPhone: boolean
  hasCompletedProfile: boolean
  roles: string[]
  token: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  verifyPhone: (code: string) => Promise<boolean>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useLocalStorage<string | null>('auth_token', null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  
  // Token validation and silent refresh
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }
      
      try {
        // Check if token is expired or will expire soon
        const decoded = jwtDecode(token)
        const expiresAt = decoded.exp * 1000
        const isExpiringSoon = expiresAt - Date.now() < 5 * 60 * 1000 // 5 minutes
        
        if (isExpiringSoon) {
          await refreshToken()
        } else {
          // Just fetch user profile
          const user = await authService.getUserProfile(token)
          setUser(user)
        }
      } catch (error) {
        // Invalid token
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    
    validateToken()
    
    // Set up token refresh interval
    const refreshInterval = setInterval(() => {
      if (token) refreshToken()
    }, 15 * 60 * 1000) // 15 minutes
    
    return () => clearInterval(refreshInterval)
  }, [token])
  
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    try {
      const { token, user } = await authService.login(credentials)
      setToken(token)
      setUser(user)
      
      // Redirect based on verification status
      if (!user.isPhoneVerified) {
        router.push('/verify')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }
  
  const logout = () => {
    setToken(null)
    setUser(null)
    router.push('/login')
  }
  
  const refreshToken = async () => {
    try {
      const { token: newToken, user } = await authService.refreshToken(token)
      setToken(newToken)
      setUser(user)
      return true
    } catch (error) {
      setToken(null)
      setUser(null)
      router.push('/login')
      return false
    }
  }
  
  const verifyPhone = async (code: string) => {
    try {
      const result = await authService.verifyPhone(token, code)
      if (result.success) {
        setUser({ ...user, isPhoneVerified: true })
        return true
      }
      return false
    } catch {
      return false
    }
  }
  
  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasVerifiedPhone: user?.isPhoneVerified || false,
    hasCompletedProfile: user?.isProfileComplete || false,
    roles: user?.roles || [],
    token,
    login,
    logout,
    verifyPhone,
    refreshToken
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### 3. Offline-First Data Management

```typescript
// hooks/use-offline-sync.ts
import { useState, useEffect } from 'react'
import { openDB, IDBPDatabase } from 'idb'
import { useNetwork } from '@/hooks/use-network'
import { useAuth } from '@/context/auth-context'

interface SyncItem {
  id: string
  endpoint: string
  method: string
  body: any
  timestamp: number
  retries: number
  userId: string
}

export function useOfflineSync() {
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const { isOnline } = useNetwork()
  const { token, user } = useAuth()
  const [db, setDb] = useState<IDBPDatabase | null>(null)
  
  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      const database = await openDB('chanuka-offline', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('syncQueue')) {
            db.createObjectStore('syncQueue', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('consultations')) {
            db.createObjectStore('consultations', { keyPath: 'id' })
          }
        }
      })
      setDb(database)
      
      // Load existing queue
      const tx = database.transaction('syncQueue', 'readonly')
      const store = tx.objectStore('syncQueue')
      const items = await store.getAll()
      setSyncQueue(items)
    }
    
    initDB()
    
    return () => {
      db?.close()
    }
  }, [])
  
  // Process queue when online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncing && token) {
      processQueue()
    }
  }, [isOnline, syncQueue, token])
  
  // Add item to sync queue
  const addToSyncQueue = async (endpoint: string, method: string, body: any) => {
    if (!db || !user) return null
    
    const syncItem: SyncItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      endpoint,
      method,
      body,
      timestamp: Date.now(),
      retries: 0,
      userId: user.id
    }
    
    const tx = db.transaction('syncQueue', 'readwrite')
    await tx.objectStore('syncQueue').add(syncItem)
    
    setSyncQueue(prev => [...prev, syncItem])
    
    return syncItem.id
  }
  
  // Process the sync queue
  const processQueue = async () => {
    if (!db || !token || isSyncing) return
    
    setIsSyncing(true)
    
    for (const item of syncQueue) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${item.endpoint}`, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(item.body)
        })
        
        if (response.ok) {
          // Remove from queue on success
          const tx = db.transaction('syncQueue', 'readwrite')
          await tx.objectStore('syncQueue').delete(item.id)
          setSyncQueue(prev => prev.filter(i => i.id !== item.id))
        } else {
          // Increment retry count
          const updatedItem = { ...item, retries: item.retries + 1 }
          if (updatedItem.retries < 5) { // Max 5 retries
            const tx = db.transaction('syncQueue', 'readwrite')
            await tx.objectStore('syncQueue').put(updatedItem)
            setSyncQueue(prev => 
              prev.map(i => i.id === item.id ? updatedItem : i)
            )
          } else {
            // Give up after 5 retries
            const tx = db.transaction('syncQueue', 'readwrite')
            await tx.objectStore('syncQueue').delete(item.id)
            setSyncQueue(prev => prev.filter(i => i.id !== item.id))
          }
        }
      } catch (error) {
        console.error("Sync error:", error)
      }
    }
    
    setIsSyncing(false)
  }
  
  return {
    addToSyncQueue,
    processQueue,
    syncQueue,
    isSyncing,
    pendingCount: syncQueue.length
  }
}
```

### 4. Data Fetching with React Query

```typescript
// hooks/api/use-consultation.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { consultationService } from '@/services/consultation-service'
import { useAuth } from '@/context/auth-context'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { useNetwork } from '@/hooks/use-network'
import { useGeoFence } from '@/hooks/use-geo-fence'

export function useConsultation(id?: string) {
  const { token } = useAuth()
  const { isOnline } = useNetwork()
  const { addToSyncQueue } = useOfflineSync()
  const queryClient = useQueryClient()
  
  // Get single consultation
  const { data: consultation, isLoading, error } = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => consultationService.getConsultation(id, token),
    enabled: !!id && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  })
  
  // Get all active consultations
  const { data: consultations, isLoading: isLoadingAll } = useQuery({
    queryKey: ['consultations'],
    queryFn: () => consultationService.getConsultations(token),
    enabled: !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
  
  // Submit response to consultation
  const submitResponse = useMutation({
    mutationFn: async (response: ConsultationResponse) => {
      if (!isOnline) {
        // Store for offline sync
        const syncId = await addToSyncQueue(
          `/consultations/${id}/responses`, 
          'POST', 
          response
        )
        return { syncId, offline: true }
      }
      
      return consultationService.submitResponse(id, response, token)
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['consultation', id])
    },
    onError: (error) => {
      console.error('Failed to submit response:', error)
    }
  })
  
  // Add comment to discussion
  const addComment = useMutation({
    mutationFn: async (comment: ConsultationComment) => {
      if (!isOnline) {
        const syncId = await addToSyncQueue(
          `/consultations/${id}/comments`,
          'POST',
          comment
        )
        return { syncId, offline: true, tempId: Date.now() }
      }
      
      return consultationService.addComment(id, comment, token)
    },
    onMutate: async (newComment) => {
      // Optimistic update
      await queryClient.cancelQueries(['consultation', id])
      const previousConsultation = queryClient.getQueryData(['consultation', id])
      
      queryClient.setQueryData(['consultation', id], (old: any) => {
        return {
          ...old,
          comments: [
            ...(old.comments || []),
            { 
              ...newComment, 
              id: `temp-${Date.now()}`,
              status: 'pending',
              createdAt: new Date().toISOString()
            }
          ]
        }
      })
      
      return { previousConsultation }
    },
    onError: (err, newComment, context) => {
      // Roll back to previous state
      queryClient.setQueryData(
        ['consultation', id],
        context?.previousConsultation
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['consultation', id])
    }
  })
  
  return {
    consultation,
    consultations,
    isLoading,
    isLoadingAll,
    error,
    submitResponse,
    addComment
  }
}
```

### 5. GeoFencing Implementation

```typescript
// hooks/use-geo-fence.ts
import { useState, useEffect } from 'react'

interface GeoFenceOptions {
  enabled?: boolean
  watchPosition?: boolean
  fenceRadius?: number // in meters
}

interface Position {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export function useGeoFence(options: GeoFenceOptions = {}) {
  const {
    enabled = true,
    watchPosition = false,
    fenceRadius = 5000 // Default 5km radius
  } = options
  
  const [position, setPosition] = useState<Position | null>(null)
  const [error, setError] = useState<GeolocationPositionError | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  
  // Check if a consultation is within the geofence
  const isInRange = (targetLat: number, targetLng: number): boolean => {
    if (!position) return false
    
    // Haversine formula to calculate distance between two points
    const toRad = (value: number) => (value * Math.PI) / 180
    const R = 6371000 // Earth radius in meters
    
    const dLat = toRad(targetLat - position.latitude)
    const dLng = toRad(targetLng - position.longitude)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(position.latitude)) * 
      Math.cos(toRad(targetLat)) * 
      Math.sin(dLng / 2) * 
      Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    
    return distance <= fenceRadius
  }
  
  // Filter consultations by geofence
  const filterByLocation = <T extends { latitude: number; longitude: number }>(
    items: T[]
  ): T[] => {
    if (!position) return items
    return items.filter(item => isInRange(item.latitude, item.longitude))
  }
  
  useEffect(() => {
    if (!enabled || !navigator.geolocation) return
    
    setLoading(true)
    
    const successHandler = (pos: GeolocationPosition) => {
      setPosition({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp
      })
      setLoading(false)
      setError(null)
    }
    
    const errorHandler = (err: GeolocationPositionError) => {
      setError(err)
      setLoading(false)
    }
    
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000 // 5 minutes
    }
    
    let watchId: number | undefined
    
    if (watchPosition) {
      watchId = navigator.geolocation.watchPosition(
        successHandler,
        errorHandler,
        options
      )
    } else {
      navigator.geolocation.getCurrentPosition(
        successHandler,
        errorHandler,
        options
      )
    }
    
    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [enabled, watchPosition])
  
  return {
    position,
    loading,
    error,
    isInRange,
    filterByLocation
  }
}
```

### 6. React Component Structure for Consultation Page

```tsx
// app/consultations/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getConsultationById } from '@/lib/api/consultations'
import { ConsultationHeader } from '@/components/consultations/ConsultationHeader'
import { ConsultationTabs } from '@/components/consultations/ConsultationTabs'
import { ConsultationBrief } from '@/components/consultations/ConsultationBrief'
import { DeliberationThread } from '@/components/deliberation/DeliberationThread'
import { FeedbackForm } from '@/components/consultations/FeedbackForm'
import { RelatedDocuments } from '@/components/consultations/RelatedDocuments'
import { ConsultationStats } from '@/components/consultations/ConsultationStats'
import { COIBanner } from '@/components/coi/COIBanner'
import { Skeleton } from '@/components/ui/skeleton'

export default async function ConsultationPage({ params }: { params: { id: string } }) {
  // Server component data fetching
  const consultation = await getConsultationById(params.id)
  
  if (!consultation) {
    notFound()
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <ConsultationHeader 
        title={consultation.title}
        status={consultation.status}
        deadline={consultation.deadline}
        agency={consultation.agency}
      />
      
      {/* Conflict of interest warnings if present */}
      {consultation.sponsors && (
        <COIBanner sponsors={consultation.sponsors} />
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2">
          <ConsultationTabs 
            consultation={consultation} 
            defaultTab="overview"
          >
            <ConsultationTabs.Tab id="overview" label="Overview">
              <ConsultationBrief 
                summary={consultation.summary}
                background={consultation.background}
              />
              <RelatedDocuments documents={consultation.documents} />
            </ConsultationTabs.Tab>
            
            <ConsultationTabs.Tab id="discuss" label="Discussion">
              <Suspense fallback={<Skeleton className="h-96" />}>
                <DeliberationThread consultationId={consultation.id} />
              </Suspense>
            </ConsultationTabs.Tab>
            
            <ConsultationTabs.Tab id="feedback" label="Your Input">
              <FeedbackForm 
                consultationId={consultation.id}
                questions={consultation.questions}
              />
            </ConsultationTabs.Tab>
          </ConsultationTabs>
        </div>
        
        <div className="lg:col-span-1">
          <ConsultationStats 
            consultationId={consultation.id} 
            initialStats={consultation.stats}
          />
        </div>
      </div>
    </div>
  )
}
```

## Backend Implementation

### 1. API Gateway Service

```typescript
// api-gateway/src/index.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { logger } from './middleware/logger'
import { errorHandler } from './middleware/error-handler'
import { authMiddleware } from './middleware/auth'
import { requestValidator } from './middleware/validator'
import { serviceRegistry } from './config/services'

const app = express()
const PORT = process.env.PORT || 3000

// Global middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))
app.use(express.json({ limit: '1mb' }))
app.use(logger)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false
})
app.use(limiter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// API version routes
app.use('/v1', (req, res, next) => {
  // Version-specific middleware or validation
  next()
})

// Service proxies with path-based routing
for (const [serviceName, config] of Object.entries(serviceRegistry)) {
  // Apply auth middleware if required
  const middlewares = []
  if (config.requiresAuth) {
    middlewares.push(authMiddleware)
  }
  
  // Apply request validation if configured
  if (config.validationSchema) {
    middlewares.push(requestValidator(config.validationSchema))
  }
  
  // Mount service routes
  app.use(
    config.pathPrefix,
    ...middlewares,
    createProxyMiddleware({
      target: config.url,
      changeOrigin: true,
      pathRewrite: config.pathRewrite,
      onProxyReq: (proxyReq, req, res) => {
        // Add correlation ID header
        const correlationId = req.headers['x-correlation-id'] || 
                            `chanuka-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        proxyReq.setHeader('x-correlation-id', correlationId as string)
        
        // Add user ID from token if authenticated
        if ((req as any).user) {
          proxyReq.setHeader('x-user-id', (req as any).user.id)
        }
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err)
        res.status(500).json({ error: 'Service unavailable' })
      }
    })
  )
}

// Global error handler
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`)
})

export default app
```

### 2. Auth Service Implementation

```typescript
// auth-service/src/controllers/auth.controller.ts
import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import { UserRepository } from '../repositories/user.repository'
import { TokenService } from '../services/token.service'
import { OtpService } from '../services/otp.service'
import { Logger } from '../utils/logger'

export class AuthController {
  private authService: AuthService
  private userRepository: UserRepository
  private tokenService: TokenService
  private otpService: OtpService
  private logger: Logger
  
  constructor() {
    this.userRepository = new UserRepository()
    this.tokenService = new TokenService()
    this.otpService = new OtpService()
    this.authService = new AuthService(
      this.userRepository,
      this.tokenService,
      this.otpService
    )
    this.logger = new Logger('AuthController')
  }
  
  public register = async (req: Request, res: Response) => {
    try {
      const { name, email, phone, password } = req.body
      
      const existingUser = await this.userRepository.findByEmail(email)
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          message: 'Email already in use'
        })
      }
      
      const user = await this.authService.registerUser({
        name,
        email,
        phone,
        password
      })
      
      // Generate OTP for phone verification
      await this.otpService.generateAndSendOtp(user.id, phone)
      
      // Generate access token
      const token = this.tokenService.generateToken({
        userId: user.id,
        roles: user.roles
      })
      
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isPhoneVerified: user.isPhoneVerified,
          roles: user.roles
        }
      })
    } catch (error) {
      this.logger.error('Registration failed', error)
      return res.status(500).json({
        success: false,
        message: 'Registration failed'
      })
    }
  }
  
  public login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body
      
      const user = await this.authService.validateUser(email, password)
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }
      
      // Generate access token
      const token = this.tokenService.generateToken({
        userId: user.id,
        roles: user.roles
      })
      
      // Generate refresh token
      const refreshToken = this.tokenService.generateRefreshToken(user.id)
      
      // Save refresh token
      await this.userRepository.saveRefreshToken(user.id, refreshToken)
      
      return res.status(200).json({
        success: true,
        token,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isPhoneVerified: user.isPhoneVerified,
          roles: user.roles
        }
      })
    } catch (error) {
      this.logger.error('Login failed', error)
      return res.status(500).json({
        success: false,
        message: 'Login failed'
      })
    }
  }
  
  public verifyPhone = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const { code } = req.body
      
      const isValid = await this.otpService.verifyOtp(userId, code)
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code'
        })
      }
      
      // Mark phone as verified
      await this.userRepository.updatePhoneVerification(userId, true)
      
      return res.status(200).json({
        success: true,
        message: 'Phone verified successfully'
      })
    } catch (error) {
      this.logger.error('Phone verification failed', error)
      return res.status(500).json({
        success: false,
        message: 'Phone verification failed'
      })
    }
  }
  
  public refreshToken = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body
      
      const userId = this.tokenService.verifyRefreshToken(refreshToken)
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        })
      }
      
      // Check if refresh token exists in database
      const isValidToken = await this.userRepository.validateRefreshToken(
        userId,
        refreshToken
      )
      
      if (!isValidToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token revoked'
        })
      }
      
      // Get user
      const user = await this.userRepository.findById(userId)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }
      
      // Generate new access token
      const newToken = this.tokenService.generateToken({
        userId: user.id,
        roles: user.roles
      })
      
      // Generate new refresh token
      const newRefreshToken = this.tokenService.generateRefreshToken(user.id)
      
      // Save new refresh token and invalidate old one
      await this.userRepository.rotateRefreshToken(
        user.id,
        refreshToken,
        newRefreshToken
      )
      
      return res.status(200).json({
        success: true,
        token: newToken,
        refreshToken: newRefreshToken
      })
    } catch (error) {
      this.logger.error('Token refresh failed', error)
      return res.status(500).json({
        success: false,
        message: