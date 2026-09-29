import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MobileNav } from '@/components/mobile-nav';

export const metadata: Metadata = { title: 'Trio Sabores | Sabores que acolhem', description: 'Bolos, salgados, doces, cafés e muito mais. Feito com amor para você e sua família.', metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body><SiteHeader/>{children}<SiteFooter/><MobileNav/></body></html> }
