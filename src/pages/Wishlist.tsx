// src/pages/Wishlist.tsx
import React from 'react';
import { useWishlist } from '../lib/WishlistContext';
import { useCart } from '../lib/CartContext';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function WishlistPage() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (wishlist.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8">
          <Heart className="w-16 h-16 text-white/20" />
        </div>
        <h2 className="font-display text-2xl md:text-4xl uppercase tracking-widest mb-4">
          Your Wishlist is Empty
        </h2>
        <p className="text-white/50 mb-8 max-w-md">
          Start exploring our collection and save your favorite items!
        </p>
        <Link 
          to="/shop"
          className="bg-accent text-black px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] pt-32 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <Heart className="w-8 h-8 text-accent" />
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-widest">
            Your Wishlist
          </h1>
          <span className="text-white/30 text-lg">({wishlist.length})</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {wishlist.map(item => (
            <div key={item.id} className="group">
              <Link to={`/product/${item.id}`} className="block">
                <div className="aspect-[3/4] bg-white/5 rounded-2xl overflow-hidden mb-4 group-hover:scale-105 transition-transform">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                </div>
              </Link>
              
              <div className="space-y-2">
                <h3 className="font-display text-lg uppercase tracking-widest">
                  {item.name}
                </h3>
                <p className="text-xl font-light">GH₵ {item.price.toLocaleString()}</p>
                
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => addToCart({
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      image: item.image,
                      quantity: 1,
                      size: 'M',
                      color: 'Black'
                    })}
                    className="flex-1 bg-accent text-black py-3 rounded-full font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-opacity"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="p-3 border border-white/20 rounded-full hover:border-white/50 hover:bg-white/5 transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
