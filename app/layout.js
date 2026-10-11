import './globals.css'
import HelpLauncher from '@/components/HelpLauncher'
import BackButton from '@/components/BackButton'
import OfflineSync from '@/components/OfflineSync'

export const metadata = {
  title: 'SLP Safety Portal',
  description: 'Safety • Leadership • Performance',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#1e3a5f',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e3a5f" />
        <link rel="apple-touch-icon" href="/AnthroSafe_Logo.PNG" />
      </head>
      <body>{children}<OfflineSync /><HelpLauncher /><BackButton /></body>
    </html>
  )
}
