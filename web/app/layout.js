import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'Shattered',
  description: 'Shared fragment code lists with protected publishing and raw software output.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${jetbrains.variable}`}>
        <main className="shell animate-fade">
          <header className="appbar">
            <a href="/" className="brand">
              <span>SHATTERED</span>
            </a>
            <nav aria-label="Main navigation" className="mainnav">
              <a href="/">Public</a>
              <a href="/admin">Admin</a>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
