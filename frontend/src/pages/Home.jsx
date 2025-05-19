import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { products, categories, heroImage } from '../data';
import ProductCard from '../components/ProductCard';
import Header from '../components/Header';

export default function Home() {
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const addToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      const updatedItems = existingItem
        ? prevItems.map(item =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...prevItems, { ...product, quantity: 1 }];
      
      localStorage.setItem('cart', JSON.stringify(updatedItems));
      return updatedItems;
    });
  };
  
  const filteredProducts = selectedCategory === "All" 
    ? products 
    : selectedCategory === "New Arrivals"
      ? products.filter(product => product.isNew)
      : products.filter(product => product.category === selectedCategory);
  
  const featuredProducts = products.filter(product => product.isFeatured);
  
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header 
        cartItems={cartItems}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />
      
      <main>
        {/* Hero Section */}
        <section className="bg-gray-100">
          <div className="container mx-auto py-16 px-4 md:px-8 md:flex items-center">
            <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Spring Collection 2025</h1>
              <p className="text-xl mb-8">Discover our latest styles with sustainable fabrics and timeless designs.</p>
              <div className="flex space-x-4">
                <a href="#featured" className="bg-black text-white px-8 py-3 rounded-md hover:bg-gray-800 transition">
                  Shop Now
                </a>
                <button className="border border-black px-8 py-3 rounded-md hover:bg-gray-100 transition">
                  Learn More
                </button>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="relative h-96 w-full bg-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={heroImage} 
                  alt="Spring Collection" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
        
        {/* Featured Products */}
        <section id="featured" className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Featured Collection</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  addToCart={addToCart}
                />
              ))}
            </div>
          </div>
        </section>
        
        {/* Category List */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">{selectedCategory === "All" ? "All Products" : selectedCategory}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  addToCart={addToCart}
                />
              ))}
            </div>
          </div>
        </section>
        
        {/* Newsletter */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-3xl font-bold mb-4">Join Our Newsletter</h2>
            <p className="text-gray-600 mb-8">Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <button className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">MODERN</h3>
              <p className="text-gray-400 mb-4">Contemporary fashion for the modern individual. Sustainable, ethical, and stylish.</p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">FB</a>
                <a href="#" className="text-gray-400 hover:text-white">IG</a>
                <a href="#" className="text-gray-400 hover:text-white">TW</a>
                <a href="#" className="text-gray-400 hover:text-white">PT</a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Shop</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">All Products</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Men's</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Women's</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">New Arrivals</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Sale</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">About</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Our Story</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Sustainability</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Ethical Practices</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Press</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Customer Care</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Contact Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">FAQs</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Shipping & Returns</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Size Guide</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">© 2025 MODERN. All rights reserved.</p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white text-sm">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}