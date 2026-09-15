// The game is a full-screen, one-thumb app on a phone in a truck. It gets its
// own viewport (no pinch-zoom sliding the card stack around mid-run) and its
// own dark theme color, rather than inheriting the portal's orange.
export const metadata = {
  title: 'Run the Job — MagTec Drilling Support',
  description: 'Prove the order. SOP training run for MagTec Alaska crews.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a1d21',
}

export default function GameLayout({ children }) {
  return children
}
