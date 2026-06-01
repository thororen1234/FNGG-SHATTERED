import LoginForm from './LoginForm';

export const metadata = {
  title: 'Admin Login - Shattered',
};

export default function LoginPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
          <span>SHATTERED</span>
        </div>
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Admin Access</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Enter your password to continue.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
