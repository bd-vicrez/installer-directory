import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-vicrez-red mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-white mb-4">Page Not Found</h2>
          <p className="text-vicrez-muted mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist. Try searching for an installer or browsing our directory.
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/" className="btn-primary">Find an Installer</a>
            <a href="/directory" className="btn-secondary">Browse Directory</a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}