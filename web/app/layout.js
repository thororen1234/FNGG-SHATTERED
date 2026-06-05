import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'Shattered',
  description: 'FNGG Shattered Teaser with a code list, automatically updated & interactive map, and more.',
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
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
