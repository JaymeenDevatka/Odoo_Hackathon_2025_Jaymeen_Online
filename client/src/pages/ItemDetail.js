import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [otherItems, setOtherItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/items/${id}`)
      .then(res => {
        setItem(res.data.item);
        // Fetch other items by the same user (excluding this one)
        if (res.data.item?.user_id) {
          api.get(`/api/items?user_id=${res.data.item.user_id}`)
            .then(r2 => {
              setOtherItems((r2.data.items || []).filter(i => i.id !== res.data.item.id));
            });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSwapRequest = async () => {
    setActionLoading(true);
    try {
      await api.post('/api/swaps', { itemId: id });
      toast.success('Swap request sent!');
      navigate('/swaps');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send swap request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRedeem = async () => {
    setActionLoading(true);
    try {
      await api.post('/api/swaps', { itemId: id, redeem: true });
      toast.success('Redemption request sent!');
      navigate('/swaps');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to redeem item');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-80 bg-gray-200 rounded-lg" />
          <div className="h-6 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-1/3 bg-gray-100 rounded" />
          <div className="h-4 w-2/3 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }
  if (!item) {
    return <div className="max-w-4xl mx-auto py-16 text-center text-gray-500">Item not found.</div>;
  }

  let imagesArr = [];
  try {
    imagesArr = Array.isArray(item.images) ? item.images : JSON.parse(item.images || '[]');
  } catch {
    imagesArr = [];
  }

  const isUploader = user && item.user_id === user.id;
  const canRequest = item.is_available && !isUploader;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <img
            src={imagesArr[0] || 'https://via.placeholder.com/400x400?text=No+Image'}
            alt={item.title}
            className="w-full h-80 object-cover rounded-lg mb-4 border"
          />
          <div className="flex gap-2 mt-2">
            {imagesArr.slice(1).map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Additional ${i + 1}`}
                className="w-20 h-20 object-cover rounded border"
              />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-gray-900">{item.title}</h1>
          <div className="flex gap-2 items-center">
            <span className="text-primary-700 font-semibold text-lg">{item.points_value} pts</span>
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
              {item.is_available ? 'Available' : 'Unavailable'}
            </span>
            {!item.is_approved && (
              <span className="ml-2 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-bold">Pending Approval</span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{item.description || 'No description provided.'}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Category</h2>
            <span className="inline-block bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">{item.category}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(item.tags) ? item.tags : (item.tags ? JSON.parse(item.tags) : [])).map((tag, i) => (
                <span key={i} className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">{tag}</span>
              ))}
            </div>
          </div>
          {/* Swap/Redeem Actions */}
          <div className="flex gap-4 mt-4">
            <button
              className="btn-primary"
              disabled={!canRequest || actionLoading}
              onClick={handleSwapRequest}
            >
              Request Swap
            </button>
            <button
              className="btn-secondary"
              disabled={!canRequest || actionLoading}
              onClick={handleRedeem}
            >
              Redeem via Points
            </button>
          </div>
          {isUploader && (
            <div className="text-xs text-gray-500 mt-2">You are the uploader of this item.</div>
          )}
        </div>
      </div>
      {/* Previous Listings by User */}
      {otherItems.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Other Listings by This User</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {otherItems.slice(0, 4).map(oi => {
              let oiImages = [];
              try {
                oiImages = Array.isArray(oi.images) ? oi.images : JSON.parse(oi.images || '[]');
              } catch {
                oiImages = [];
              }
              return (
                <Link to={`/item/${oi.id}`} key={oi.id} className="card-hover flex flex-col">
                  <img src={oiImages[0] || 'https://via.placeholder.com/200x200?text=No+Image'} alt={oi.title} className="w-full h-24 object-cover rounded mb-2" />
                  <span className="font-medium text-gray-800 truncate">{oi.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetail; 