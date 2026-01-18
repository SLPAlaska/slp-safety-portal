import './globals.css'

export const metadata = {
  title: 'SLP Safety Portal',
  description: 'Safety • Leadership • Performance',
  manifest: '/manifest.json',
  themeColor: '#ea580c',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ea580c" />
        <link rel="apple-touch-icon" href="/Logo.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
