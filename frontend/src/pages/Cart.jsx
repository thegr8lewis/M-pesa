
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import Header from '../components/Header';

export default function CartPage() {
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCartItems(prevItems => {
      const updatedItems = prevItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      );
      localStorage.setItem('cart', JSON.stringify(updatedItems));
      return updatedItems;
    });
  };

  const removeItem = (id) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.filter(item => item.id !== id);
      localStorage.setItem('cart', JSON.stringify(updatedItems));
      return updatedItems;
    });
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 100 ? 0 : 15;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header 
        cartItems={cartItems}
        mobileMenuOpen={false}
        setMobileMenuOpen={() => {}}
        selectedCategory="All"
        setSelectedCategory={() => {}}
      />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Your Shopping Cart</h1>
        
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-medium mb-4">Your cart is empty</h2>
            <Link 
              to="/" 
              className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition inline-block"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-2/3">
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="grid grid-cols-12 gap-4 font-medium">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
              </div>
              
              {cartItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-center py-4 border-b border-gray-200">
                  <div className="col-span-6 flex items-center gap-4">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.category}</p>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-red-500 hover:text-red-700 mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">${item.price.toFixed(2)}</div>
                  <div className="col-span-2 flex justify-center">
                    <div className="flex items-center border border-gray-300 rounded">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="px-3 py-1">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="md:w-1/3">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <Link
                  to="/checkout"
                  className="block w-full bg-black text-white text-center py-3 rounded-md hover:bg-gray-800 transition"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}