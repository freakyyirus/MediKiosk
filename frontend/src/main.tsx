import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

/**
 * Clerk is activated the moment a real publishable key is present. Until then
 * we render without <ClerkProvider/> so the existing Supabase-auth flow (and
 * the offline demo) keeps working — graceful degradation, never a hard crash.
 */
const appContent = PUBLISHABLE_KEY ? (
  <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
    <App />
  </ClerkProvider>
) : (
  <App />
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>{appContent}</BrowserRouter>
  </StrictMode>,
)