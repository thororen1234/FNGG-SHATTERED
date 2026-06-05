import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'Shattered',
  description: 'FNGG Shattered was built around 6 teasers for Fortnite Chapter 7 Season 3, where players gathered fragments to complete each of the 6 puzzles together as a community.',
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
            <span className="appbar-badge">Chapter 7 · Season 3</span>
          </header>
          <div className="site-tagline">
            <span className="eyebrow">Community Event</span>
            <p className="tagline-text">
              FNGG Shattered was built around 6 teasers for Fortnite Chapter 7 Season 3,
              where players gathered fragments to complete each of the 6 puzzles together as a community.
            </p>
          </div>
          {children}
        </main>
      </body>
    </html>
  );
}
