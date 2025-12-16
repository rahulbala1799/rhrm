export default function NotFound() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404 - Page Not Found</h1>
      <p style={{ marginBottom: '1rem' }}>The page you are looking for does not exist.</p>
      <a href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
        Go back home
      </a>
    </div>
  )
}

