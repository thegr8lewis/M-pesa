import { Heart } from 'lucide-react';

export default function ProductCard({ product, addToCart }) {
  return (
    <div className="group">
      <div className="relative overflow-hidden rounded-lg mb-4">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-96 object-cover group-hover:scale-105 transition duration-300"
        />
        {product.isNew && (
          <div className="absolute top-4 left-4 bg-black text-white text-xs px-3 py-1 rounded-full">
            NEW
          </div>
        )}
        <button 
          onClick={() => addToCart(product)}
          className="absolute bottom-0 left-0 right-0 bg-black text-white py-3 font-medium translate-y-full group-hover:translate-y-0 transition duration-300"
        >
          Add to Cart
        </button>
      </div>
      <h3 className="font-medium">{product.name}</h3>
      <div className="flex justify-between items-center mt-1">
        <p className="text-gray-900">${product.price.toFixed(2)}</p>
        <button className="text-gray-500 hover:text-black">
          <Heart size={18} />
        </button>
      </div>
    </div>
  );
}