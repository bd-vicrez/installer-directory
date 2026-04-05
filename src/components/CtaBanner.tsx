export default function CtaBanner() {
  return (
    <section className="bg-gradient-to-r from-vicrez-red to-vicrez-red-dark rounded-xl p-8 text-center my-12">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
        Need Parts for Your Build?
      </h2>
      <p className="text-white/80 mb-6 max-w-2xl mx-auto">
        Vicrez is your source for premium aftermarket parts, performance wheels and tires, widebody kits, aero components, vinyl wrap, paint protection film, and OE replacement parts. Whether you&apos;re upgrading performance, styling your build, or replacing damaged parts, Vicrez delivers precision fitment, aggressive styling, and fast shipping. Free shipping on orders over $149.
      </p>
      <a
        href="https://www.vicrez.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-white text-vicrez-red font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
      >
        Shop Vicrez.com
      </a>
    </section>
  );
}
