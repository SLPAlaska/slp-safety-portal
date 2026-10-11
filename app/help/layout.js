// Help Desk: no sign-in. The answer bank ships inside the page, so it answers
// with no signal; public/help-sw.js keeps the page itself openable offline.
export const metadata = {
  title: 'Help Desk | SLP Safety Portal',
  description: 'Answers to almost any question about the SLP Safety Portal. Works with no signal.',
}

export default function HelpLayout({ children }) {
  return children
}
