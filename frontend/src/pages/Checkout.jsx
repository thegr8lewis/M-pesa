import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import Header from '../components/Header';

const CheckoutPage = () => {
  const [cartItems] = useState(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Kenya',
    paymentMethod: 'mpesa'
  });

  // M-Pesa payment states
  const [step, setStep] = useState('form');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Waiting for payment confirmation...');

  // Calculate order totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 100 ? 0 : 15;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  const formatPhoneNumber = (phone) => {
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0') && formatted.length === 10) {
      return `254${formatted.substring(1)}`;
    } else if (formatted.length === 9 && !formatted.startsWith('0')) {
      return `254${formatted}`;
    }
    return formatted;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

    const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  setErrorMessage('');
  
  try {
    const formattedPhone = formatPhoneNumber(formData.phone);
    if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
      throw new Error('Please enter a valid Kenyan phone number (e.g., 07... or 254...)');
    }

    // FIXED: Remove duplicate http://
    const response = await fetch('http://localhost:8000/api/payment/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: formattedPhone,
        amount: total * 100, // Convert to cents
        customer_details: formData
      }),
    });

    // Add network error handling
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'pending') {
      throw new Error(data.message || 'Unexpected response from server');
    }

    setCheckoutRequestId(data.checkout_request_id);
    setStep('pending');
  } catch (err) {
    console.error('Payment initiation error:', err);
    setErrorMessage(err.message || 'Failed to initiate payment');
    setStep('error');
  } finally {
    setIsLoading(false);
  }
};

    useEffect(() => {
  if (step !== 'pending' || !checkoutRequestId) return;

  let isMounted = true; // Track component mount state
  const pollInterval = setInterval(async () => {
    if (!isMounted) return;

    try {
      // FIXED: Remove duplicate http://
      const response = await fetch('http://localhost:8000/api/status/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkout_request_id: checkoutRequestId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle actual M-Pesa status response
      if (data.status && data.status.ResultCode !== undefined) {
        const resultCode = data.status.ResultCode.toString();
        
        if (resultCode === '0') {
          if (isMounted) {
            setStatusMessage('Payment confirmed!');
            setStep('success');
            localStorage.removeItem('cart');
          }
          clearInterval(pollInterval);
        } else if (resultCode === '1032') {
          if (isMounted) {
            setErrorMessage('Payment was cancelled by user');
            setStep('error');
          }
          clearInterval(pollInterval);
        } else if (resultCode === '1') {
          // Still processing
          if (isMounted) {
            setStatusMessage('Waiting for payment confirmation...');
          }
        } else {
          if (isMounted) {
            setErrorMessage(data.status.ResultDesc || 'Payment failed. Please try again.');
            setStep('error');
          }
          clearInterval(pollInterval);
        }
      }
    } catch (err) {
      console.error('Status check error:', err);
      if (isMounted) {
        setErrorMessage('Unable to verify payment status. Please check your payment history.');
        setStep('error');
      }
      clearInterval(pollInterval);
    }
  }, 5000);

  return () => {
    isMounted = false;
    clearInterval(pollInterval);
  };
}, [step, checkoutRequestId]);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <Header 
          cartItems={cartItems}
          mobileMenuOpen={false}
          setMobileMenuOpen={() => {}}
          selectedCategory="All"
          setSelectedCategory={() => {}}
        />
        <div className="text-center py-12">
          <h2 className="text-2xl font-medium mb-4">Your cart is empty</h2>
          <Link 
            to="/" 
            className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition inline-block"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Checkout Form */}
          <div className="lg:w-2/3">
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-xl font-bold mb-4">Shipping Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium mb-1">
                        Phone Number (for M-Pesa)
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="e.g. 254712345678 or 0712345678"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium mb-1">
                        Country
                      </label>
                      <select
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="Kenya">Kenya</option>
                        <option value="Uganda">Uganda</option>
                        <option value="Tanzania">Tanzania</option>
                        <option value="Rwanda">Rwanda</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-xl font-bold mb-4">Payment Method</h2>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="mpesa"
                        name="paymentMethod"
                        value="mpesa"
                        checked={formData.paymentMethod === 'mpesa'}
                        onChange={handleChange}
                        className="h-4 w-4 text-black focus:ring-black"
                      />
                      <label htmlFor="mpesa" className="ml-2 block text-sm font-medium">
                        M-Pesa
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="card"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === 'card'}
                        onChange={handleChange}
                        className="h-4 w-4 text-black focus:ring-black"
                      />
                      <label htmlFor="card" className="ml-2 block text-sm font-medium">
                        Credit/Debit Card
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="cash"
                        name="paymentMethod"
                        value="cash"
                        checked={formData.paymentMethod === 'cash'}
                        onChange={handleChange}
                        className="h-4 w-4 text-black focus:ring-black"
                      />
                      <label htmlFor="cash" className="ml-2 block text-sm font-medium">
                        Cash on Delivery
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition text-lg font-medium ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : `Pay KES ${(total * 100).toFixed(0)} with M-Pesa`}
                </button>
              </form>
            )}

            {/* Payment Status Screens */}
            {step === 'pending' && (
              <div className="bg-gray-50 p-6 rounded-lg text-center space-y-6">
                <div className="flex justify-center">
                  <svg className="animate-spin h-12 w-12 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold">{statusMessage}</h2>
                <p className="text-gray-600">Reference: {checkoutRequestId}</p>
                <div className="bg-gray-100 p-4 rounded-md">
                  <p className="text-gray-800">
                    Please check your phone and enter your M-Pesa PIN when prompted.
                    This page will update automatically.
                  </p>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="bg-gray-50 p-6 rounded-lg text-center space-y-6">
                <div className="flex justify-center">
                  <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-green-600">Payment Successful!</h2>
                <p className="text-gray-600">Thank you for your order. Your items will be shipped soon.</p>
                <Link
                  to="/"
                  className="inline-block bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition"
                >
                  Continue Shopping
                </Link>
              </div>
            )}

            {step === 'error' && (
              <div className="bg-gray-50 p-6 rounded-lg text-center space-y-6">
                <div className="flex justify-center">
                  <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-red-600">Payment Failed</h2>
                <p className="text-gray-600">{errorMessage || 'An error occurred during payment.'}</p>
                <button
                  onClick={() => setStep('form')}
                  className="inline-block bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-4 mb-6">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <h3 className="font-medium text-sm">{item.name}</h3>
                        <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-3">
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
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;