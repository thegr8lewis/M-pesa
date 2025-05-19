import { Link } from 'react-router-dom';
import { Search, ShoppingCart, User, Heart, Menu, X } from 'lucide-react';
import { categories } from '../data';

export default function Header({ cartItems, mobileMenuOpen, setMobileMenuOpen, selectedCategory, setSelectedCategory }) {
  return (
    <header className="sticky top-0 bg-white shadow-sm z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Mobile menu button */}
          <button 
            className="md:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold">MODERN</Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {categories.map((category) => (
              <button 
                key={category}
                className={`text-sm font-medium hover:text-gray-600 transition ${
                  selectedCategory === category ? 'border-b-2 border-black' : ''
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </nav>
          
          {/* Icons */}
          <div className="flex items-center space-x-4">
            <button className="hidden md:block text-gray-700 hover:text-gray-900">
              <Search size={20} />
            </button>
            <button className="text-gray-700 hover:text-gray-900 relative">
              <User size={20} />
            </button>
            <button className="text-gray-700 hover:text-gray-900">
              <Heart size={20} />
            </button>
            <Link to="/cart" className="text-gray-700 hover:text-gray-900 relative">
              <ShoppingCart size={20} />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 py-3 space-y-2 bg-gray-50">
          {categories.map((category) => (
            <button 
              key={category}
              className={`block w-full text-left px-3 py-2 text-sm font-medium rounded-md ${
                selectedCategory === category ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
              onClick={() => {
                setSelectedCategory(category);
                setMobileMenuOpen(false);
              }}
            >
              {category}
            </button>
          ))}
          <div className="pt-2 relative">
            <input
              className="w-full p-2 border rounded-md pl-8 text-sm"
              placeholder="Search for products..."
            />
            <Search size={16} className="absolute left-2 top-4 text-gray-400" />
          </div>
        </div>
      )}
    </header>
  );
}