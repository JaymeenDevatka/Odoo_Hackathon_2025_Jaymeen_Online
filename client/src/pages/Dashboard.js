import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  PlusIcon, 
  ArrowsRightLeftIcon, 
  UserIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch user statistics
  const { data: stats } = useQuery(
    ['user-stats'],
    () => api.get('/api/users/stats'),
    { refetchInterval: 30000 }
  );

  // Fetch user's items
  const { data: userItems } = useQuery(
    ['user-items'],
    () => api.get('/api/items/user/me'),
    { refetchInterval: 30000 }
  );

  // Fetch recent swaps
  const { data: swaps } = useQuery(
    ['user-swaps'],
    () => api.get('/api/swaps/sent'),
    { refetchInterval: 30000 }
  );

  const quickActions = [
    {
      name: 'Add New Item',
      description: 'List a clothing item for exchange',
      href: '/add-item',
      icon: PlusIcon,
      color: 'bg-primary-500'
    },
    {
      name: 'Browse Items',
      description: 'Find items to swap or redeem',
      href: '/browse',
      icon: UserIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Swap Requests',
      description: 'Manage your swap requests',
      href: '/swaps',
      icon: ArrowsRightLeftIcon,
      color: 'bg-secondary-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name}! 👋</h1>
        <p className="text-primary-100">
          You have {user?.points} points available. Start swapping and building a sustainable fashion community!
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="card-hover group"
            >
              <div className="flex items-center">
                <div className={`${action.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">{action.name}</h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600">
              {stats?.data?.items?.total_items || 0}
            </div>
            <div className="text-sm text-gray-500">Total Items</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats?.data?.items?.available_items || 0}
            </div>
            <div className="text-sm text-gray-500">Available Items</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-secondary-600">
              {stats?.data?.swaps?.total_swaps || 0}
            </div>
            <div className="text-sm text-gray-500">Total Swaps</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.data?.swaps?.completed_swaps || 0}
            </div>
            <div className="text-sm text-gray-500">Completed Swaps</div>
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Recent Items</h2>
          <Link to="/add-item" className="btn-primary text-sm">
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Item
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userItems?.data?.items?.slice(0, 6).map((item) => (
            <div key={item.id} className="card-hover">
              <div className="aspect-square bg-gray-200 rounded-lg mb-3 overflow-hidden">
                {item.images && JSON.parse(item.images).length > 0 ? (
                  <img
                    src={JSON.parse(item.images)[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <UserIcon className="h-12 w-12" />
                  </div>
                )}
              </div>
              <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-500">{item.category}</span>
                <span className="text-sm font-medium text-primary-600">{item.points_value} pts</span>
              </div>
              <div className="flex items-center mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  item.is_available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {item.is_available ? 'Available' : 'Unavailable'}
                </span>
                {!item.is_approved && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {(!userItems?.data?.items || userItems.data.items.length === 0) && (
          <div className="text-center py-8">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first item.</p>
            <div className="mt-6">
              <Link to="/add-item" className="btn-primary">
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Your First Item
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Recent Swaps */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Swap Activity</h2>
        <div className="card">
          {swaps?.data?.swaps?.slice(0, 5).map((swap) => (
            <div key={swap.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <ArrowsRightLeftIcon className="h-5 w-5 text-gray-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{swap.item_title}</p>
                  <p className="text-sm text-gray-500">
                    {swap.status === 'pending' && 'Pending approval'}
                    {swap.status === 'accepted' && 'Accepted'}
                    {swap.status === 'rejected' && 'Rejected'}
                    {swap.status === 'completed' && 'Completed'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  swap.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  swap.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {swap.status}
                </span>
              </div>
            </div>
          ))}
          {(!swaps?.data?.swaps || swaps.data.swaps.length === 0) && (
            <div className="text-center py-8">
              <ArrowsRightLeftIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No swap activity</h3>
              <p className="mt-1 text-sm text-gray-500">Start browsing items to make your first swap.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 