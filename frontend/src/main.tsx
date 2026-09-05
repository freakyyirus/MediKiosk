import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App'
import ClerkBridge from './components/auth/ClerkBridge'
import { clerkPublishableKey } from './lib/clerk'

const clerkKey = clerkPublishableKey();

function Root() {
  const app = (
    <BrowserRouter>
      {clerkKey && <ClerkBridge />}
      <App />
    </BrowserRouter>
  );

  return clerkKey ? (
    <ClerkProvider publishableKey={clerkKey}>{app}</ClerkProvider>
  ) : (
    app
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
