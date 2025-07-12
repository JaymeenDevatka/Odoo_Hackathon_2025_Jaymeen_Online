import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count
  const { data: unreadData } = useQuery(
    ['notifications', 'unread-count'],
    () => api.get('/api/users/notifications/unread-count'),
    {
      enabled: isAuthenticated,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  useEffect(() => {
    if (unreadData?.data?.count !== undefined) {
      setUnreadCount(unreadData.data.count);
    }
  }, [unreadData]);

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/api/users/notifications/${notificationId}/read`);
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/api/users/notifications/read-all');
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const value = {
    unreadCount,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 