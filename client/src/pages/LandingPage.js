import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowRightIcon, 
  HeartIcon, 
  GlobeAltIcon, 
  SparklesIcon,
  UserGroupIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

const categories = [
  { name: 'Tops', image: 'https://via.placeholder.com/120?text=Tops' },
  { name: 'Bottoms', image: 'https://via.placeholder.com/120?text=Bottoms' },
  { name: 'Dresses', image: 'https://via.placeholder.com/120?text=Dresses' },
  { name: 'Outerwear', image: 'https://via.placeholder.com/120?text=Outerwear' },
  { name: 'Shoes', image: 'https://via.placeholder.com/120?text=Shoes' },
  { name: 'Accessories', image: 'https://via.placeholder.com/120?text=Accessories' },
];

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get('/api/items?limit=6').then(res => {
      setItems(res.data.items || []);
    });
  }, []);

  const features = [
    {
      icon: HeartIcon,
      title: 'Sustainable Fashion',
      description: 'Reduce textile waste by giving your clothes a second life through community exchanges.'
    },
    {
      icon: GlobeAltIcon,
      title: 'Community Driven',
      description: 'Connect with like-minded individuals who share your passion for sustainable living.'
    },
    {
      icon: SparklesIcon,
      title: 'AI-Powered',
      description: 'Smart categorization and recommendations help you find the perfect items to swap.'
    },
    {
      icon: UserGroupIcon,
      title: 'Easy Swapping',
      description: 'Simple and secure platform for direct item swaps or point-based redemptions.'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Point System',
      description: 'Earn points by listing items and redeem them for clothing you love.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gradient">ReWear</h1>
            </div>
            <div className="flex items-center space-x-4">
              {!isAuthenticated ? (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                    Login
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Get Started
                  </Link>
                </>
              ) : (
                <Link to="/dashboard" className="btn-primary">
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <img src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80" alt="Hero" className="mx-auto rounded-2xl shadow-lg mb-8 w-full max-w-3xl h-64 object-cover" />
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Sustainable Fashion
              <span className="text-gradient block">Community Exchange</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Join ReWear and be part of the sustainable fashion revolution. Swap clothes, 
              reduce waste, and build a community that cares about our planet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/browse" className="btn-primary text-lg px-8 py-3 inline-flex items-center">
                Browse Items
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/register" className="btn-secondary text-lg px-8 py-3">
                Start Swapping
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
            {categories.map(cat => (
              <div key={cat.name} className="flex flex-col items-center">
                <img src={cat.image} alt={cat.name} className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-primary-200" />
                <span className="text-gray-800 font-medium">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Listings Section */}
      <div className="py-12 bg-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Listings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {items.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card animate-pulse h-64 flex flex-col items-center justify-center">
                  <div className="w-32 h-32 bg-gray-200 rounded-lg mb-4" />
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                </div>
              ))
            ) : (
              items.map(item => {
                let imagesArr = [];
                try {
                  imagesArr = Array.isArray(item.images) ? item.images : JSON.parse(item.images || '[]');
                } catch {
                  imagesArr = [];
                }
                return (
                  <Link to={`/item/${item.id}`} key={item.id} className="card-hover flex flex-col">
                    <img src={imagesArr[0] || 'https://via.placeholder.com/300x300?text=No+Image'} alt={item.title} className="w-full h-40 object-cover rounded-lg mb-3" />
                    <h3 className="font-semibold text-lg text-gray-900 truncate">{item.title}</h3>
                    <p className="text-gray-600 text-sm truncate">{item.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">{item.category}</span>
                      <span className="text-xs font-bold text-primary-600">{item.points_value} pts</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose ReWear?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform combines technology and community to create a sustainable 
              fashion ecosystem that benefits everyone.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-hover text-center group">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-200 transition-colors">
                  <feature.icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Your Sustainable Fashion Journey?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already making a difference by 
            participating in our clothing exchange community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center">
              Join ReWear
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link to="/browse" className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-3 px-8 rounded-lg transition-colors">
              Explore Items
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">ReWear</h3>
              <p className="text-gray-400">
                Sustainable fashion community exchange platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/browse" className="hover:text-white">Browse Items</Link></li>
                <li><Link to="/register" className="hover:text-white">Join Community</Link></li>
                <li><Link to="/login" className="hover:text-white">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Community Guidelines</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ReWear. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 