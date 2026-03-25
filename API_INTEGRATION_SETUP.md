# Frontend Backend Integration Guide

This document describes how the frontend React application is integrated with the Django backend API.

## Setup

### 1. Environment Variables

Create a `.env.local` file in the project root:

```env
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_TIMEOUT=30000
VITE_WS_URL=ws://localhost:8000/ws
VITE_TOKEN_KEY=access_token
VITE_REFRESH_TOKEN_KEY=refresh_token
```

### 2. API Client

The API client is configured in `src/utils/api.ts` with:
- Axios instance with base configuration
- JWT token interceptors for request/response
- Automatic token refresh on 401 responses
- Token storage in localStorage

### 3. Authentication

Use the `useAuth()` hook for login/logout:

```tsx
import { useAuth } from '@/hooks/useAuth'

function LoginPage() {
  const { login, logout, user, isAuthenticated, loading, error } = useAuth()

  const handleLogin = async (username: string, password: string) => {
    const success = await login(username, password)
    if (success) {
      // Redirect to dashboard
    }
  }

  return (
    <div>
      {error && <p>{error}</p>}
      {isAuthenticated && <p>Welcome {user?.username}</p>}
    </div>
  )
}
```

## Available Hooks

### useAuth()
Manages user authentication (login, logout, token refresh)

```tsx
const { user, isAuthenticated, loading, error, login, logout } = useAuth()
```

### useAnalyticsAPI()
Fetch dashboard statistics and metrics

```tsx
const { stats, loading, fetchDashboardStats } = useAnalyticsAPI()

useEffect(() => {
  fetchDashboardStats()
}, [])

// Use stats.total_voters, stats.voters_contacted, etc.
```

### useEntryAPI()
Manage entry data (voters, volunteers, booths, events)

```tsx
const { 
  fetchVoters, createVoter, updateVoter, deleteVoter,
  fetchVolunteers, createVolunteer, updateVolunteer,
  fetchBooths, updateBooth,
  fetchCampaignEvents, createCampaignEvent, updateCampaignEvent,
  loading, error 
} = useEntryAPI()

// Fetch voters for a booth
const voters = await fetchVoters(boothId, 'search query')

// Create new voter
const newVoter = await createVoter({
  name: 'John Doe',
  voter_id: 'VOT001',
  phone: '9876543210',
  booth: 1,
  sentiment: 'positive'
})
```

### useMasterAPI()
Manage master data (countries, states, districts, booths, parties, candidates)

```tsx
const {
  fetchCountries, fetchStates, fetchDistricts, fetchConstituencies,
  fetchWards, fetchBooths, createBooth, updateBooth, deleteBooth,
  fetchParties, createParty, fetchCandidates, createCandidate,
  loading, error
} = useMasterAPI()

// Fetch states
const states = await fetchStates()

// Fetch districts for a state
const districts = await fetchDistricts(stateId)

// Create a booth
const newBooth = await createBooth({
  number: '001',
  name: 'School XYZ',
  ward: wardId,
  total_voters: 500
})
```

## Data Flow

1. **Component** calls API hook
2. **Hook** uses `apiClient` to make request
3. **apiClient** adds JWT token from localStorage
4. **Backend** processes request and returns data
5. **Hook** updates state and returns data to component
6. **Component** renders using API data

## Error Handling

All hooks provide an `error` state:

```tsx
const { error, loading } = useEntryAPI()

if (error) {
  return <Alert type="error">{error}</Alert>
}

if (loading) {
  return <Spinner />
}
```

## Authentication Context

The app uses an `AuthContext` to manage global authentication state:

```tsx
import { useAuthContext } from '@/context/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthContext()

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return <div>Welcome {user?.username}</div>
}
```

## Token Management

Tokens are automatically managed:

- **Access Token**: Stored in localStorage, expires in 24 hours
- **Refresh Token**: Stored in localStorage, expires in 7 days
- **Token Refresh**: Automatic on 401 response
- **Logout**: Clears tokens from localStorage

## Making API Calls Directly

If you need to make direct API calls without hooks:

```tsx
import apiClient from '@/utils/api'

// Fetch data
const { data } = await apiClient.get('/voters/voters/')

// Create data
const { data } = await apiClient.post('/voters/voters/', {
  name: 'John',
  voter_id: 'VOT001'
})

// Update data
const { data } = await apiClient.patch('/voters/voters/1/', {
  sentiment: 'positive'
})

// Delete data
await apiClient.delete('/voters/voters/1/')
```

## Example: Complete Integration in a Component

```tsx
import { useEffect, useState } from 'react'
import { useEntryAPI } from '@/hooks/useEntryAPI'
import { useToast } from '@/context/ToastContext'

export function BoothVotersList({ boothId }: { boothId: number }) {
  const { fetchVoters, createVoter, loading, error } = useEntryAPI()
  const { showToast } = useToast()
  const [voters, setVoters] = useState([])

  useEffect(() => {
    const loadVoters = async () => {
      const data = await fetchVoters(boothId)
      if (data) {
        setVoters(data)
      }
    }
    loadVoters()
  }, [boothId, fetchVoters])

  const handleAddVoter = async (name: string, phone: string) => {
    const newVoter = await createVoter({
      name,
      phone,
      voter_id: `VOT${Date.now()}`,
      booth: boothId,
      sentiment: 'undecided'
    })
    
    if (newVoter) {
      setVoters([...voters, newVoter])
      showToast('Voter added successfully', '#138808')
    } else {
      showToast(error || 'Failed to add voter', '#dc2626')
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div>
      <h2>Voters in Booth {boothId}</h2>
      <ul>
        {voters.map(voter => (
          <li key={voter.id}>
            {voter.name} - {voter.phone}
          </li>
        ))}
      </ul>
      <button onClick={() => handleAddVoter('Jane Doe', '9876543210')}>
        Add Voter
      </button>
    </div>
  )
}
```

## Troubleshooting

### CORS Errors
If you see CORS errors:
1. Ensure backend has correct `CORS_ALLOWED_ORIGINS` configured
2. Include frontend origin: `http://localhost:5173`
3. Restart backend server

### 401 Unauthorized
- Clear localStorage: `localStorage.clear()`
- Login again
- Check token expiration (24 hours)

### Network Errors
- Verify backend is running: `http://localhost:8000/admin/`
- Check API base URL in `.env.local`
- Verify firewall allows connection

### TypeScript Errors
- Run `npm install` to ensure all types are installed
- Check `tsconfig.json` for proper path configuration

## Testing the Integration

Use the browser console to test:

```javascript
// Check if token exists
localStorage.getItem('access_token')

// Make a test request
fetch('http://localhost:8000/api/v1/auth/users/me/', {
  headers: { 
    Authorization: `Bearer ${localStorage.getItem('access_token')}`
  }
}).then(r => r.json()).then(console.log)
```

## Backend Documentation

For detailed backend API documentation, visit:
- Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`
