let scriptPromise: Promise<void> | null = null

interface GoogleCredentialResponse {
  credential: string
}

interface GooglePromptMomentNotification {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
}

interface GoogleAccountsId {
  initialize: (options: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }) => void
  prompt: (listener?: (notification: GooglePromptMomentNotification) => void) => void
}

interface GoogleWindow {
  accounts: {
    id: GoogleAccountsId
  }
}

declare global {
  interface Window {
    google?: GoogleWindow
  }
}

function loadGoogleScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google sign-in is only available in the browser'))
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google sign-in script'))
      document.head.appendChild(script)
    })
  }

  return scriptPromise
}

export async function requestGoogleIdToken(clientId: string): Promise<string> {
  if (!clientId) {
    throw new Error('Google sign-in is not configured on the frontend')
  }

  await loadGoogleScript()

  const googleId = window.google?.accounts?.id
  if (!googleId) {
    throw new Error('Google sign-in is unavailable in this browser')
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Google sign-in timed out'))
    }, 60_000)

    googleId.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        window.clearTimeout(timeoutId)
        if (!credential) {
          reject(new Error('Google sign-in did not return a credential'))
          return
        }
        resolve(credential)
      },
    })

    googleId.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        window.clearTimeout(timeoutId)
        reject(new Error('Google sign-in prompt was blocked or dismissed'))
      }
    })
  })
}
