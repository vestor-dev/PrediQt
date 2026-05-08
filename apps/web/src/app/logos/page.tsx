import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { LogosClient } from './logos-client';

export const metadata = { title: 'Logos · Prediqt' };

export default function LogosPage() {
  return (
    <main className="relative min-h-screen flex flex-col">
      <Nav />
      <LogosClient />
      <Footer />
    </main>
  );
}
