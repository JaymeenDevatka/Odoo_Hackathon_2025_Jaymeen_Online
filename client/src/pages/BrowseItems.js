import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const categories = [
  'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'
];

const BrowseItems = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/items?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`)
      .then(res => setItems(res.data.items || []))
      .finally(() => setLoading(false));
  }, [search, category]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Items</h1>
      <p className="text-gray-600 mb-8">Browse and discover clothing items from the community.</p>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field md:w-1/2"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="input-field md:w-1/4"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-64 flex flex-col items-center justify-center">
              <div className="w-32 h-32 bg-gray-200 rounded-lg mb-4" />
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-16">
            No items found.
          </div>
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
  );
};

export default BrowseItems; 