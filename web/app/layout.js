import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'FNGG Puzzles',
  description: 'Fortnite.gg Collab Puzzles',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${jetbrains.variable}`}>
        <main className="shell animate-fade">
          {children}
        </main>
      </body>
    </html>
  );
}
