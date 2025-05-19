import React, { useState, useEffect } from 'react';

const MpesaPaymentApp = () => {
  const [step, setStep] = useState('form');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Waiting for payment confirmation...');

  const formatPhoneNumber = (phone) => {
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0') && formatted.length === 10) {
      return `254${formatted.substring(1)}`;
    } else if (formatted.length === 9 && !formatted.startsWith('0')) {
      return `254${formatted}`;
    }
    return formatted;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const formattedPhone = formatPhoneNumber(phone);
      if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
        throw new Error('Please enter a valid Kenyan phone number (e.g., 07... or 254...)');
      }

      const response = await fetch('http://localhost:8000/api/payment/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phone,  // Let backend handle formatting
          amount: amount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate payment');
      }

      setCheckoutRequestId(data.checkout_request_id);
      setStep('pending');
    } catch (err) {
      setErrorMessage(err.message);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'pending' || !checkoutRequestId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/status/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkout_request_id: checkoutRequestId
          }),
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned non-JSON response');
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check status');
        }

        // Handle MPesa response codes
        if (data.status && data.status.ResultCode !== undefined) {
          const resultCode = data.status.ResultCode.toString();
          
          if (resultCode === '0') {
            setStatusMessage('Payment confirmed!');
            setStep('success');
            clearInterval(pollInterval);
          } else if (resultCode === '1032') {
            setErrorMessage('Payment was cancelled by user');
            setStep('error');
            clearInterval(pollInterval);
          } else if (resultCode === '1') {
            // Still processing
            setStatusMessage('Waiting for payment confirmation...');
          } else {
            setErrorMessage(data.status.ResultDesc || 'Payment failed. Please try again.');
            setStep('error');
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Status check error:', err.message);
        if (err.message.includes('Failed to check status') || 
            err.message.includes('non-JSON')) {
          setErrorMessage('Unable to verify payment status. Please check your payment history.');
          setStep('error');
          clearInterval(pollInterval);
        }
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [step, checkoutRequestId]);

  const resetForm = () => {
    setPhone('');
    setAmount('');
    setStep('form');
    setErrorMessage('');
    setStatusMessage('Waiting for payment confirmation...');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">M-Pesa Payment</h1>
        
        {/* Payment Form */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 07XX XXX XXX or 2547XX XXX XXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Format: 07... or 254...</p>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount (KES)
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Pay with M-Pesa'}
            </button>
          </form>
        )}

        {/* Pending Payment Status */}
        {step === 'pending' && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-800">{statusMessage}</p>
            <p className="text-sm text-gray-600">Checkout ID: {checkoutRequestId}</p>
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                Please check your phone and enter your M-Pesa PIN when prompted.
                This page will update automatically.
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-green-600">Payment Successful!</h2>
            <p className="text-gray-600">Thank you for your payment.</p>
            <button
              onClick={resetForm}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Make Another Payment
            </button>
          </div>
        )}

        {/* Error Message */}
        {step === 'error' && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-600">Payment Failed</h2>
            <p className="text-gray-600">{errorMessage || 'An error occurred during payment.'}</p>
            
            {process.env.NODE_ENV === 'development' && checkoutRequestId && (
              <div className="bg-gray-100 p-3 rounded-md text-left">
                <p className="text-xs font-mono text-gray-700">Reference: {checkoutRequestId}</p>
              </div>
            )}
            
            <button
              onClick={resetForm}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MpesaPaymentApp;