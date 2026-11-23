import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'EDLIZ Digital — Clinical Reference Workspace',description:'An independent workspace for source-linked Zimbabwe clinical reference guidance. Authorised EDLIZ 2025 content pending.',manifest:'/manifest.json',icons:{icon:'/icon.svg',apple:'/icon-192.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
