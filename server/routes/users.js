const express = require('express');
const { getConnection } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    const [users] = await pool.execute(`
      SELECT 
        u.id,
        u.name,
        u.avatar,
        u.bio,
        u.points,
        u.created_at,
        COUNT(i.id) as items_count,
        COUNT(s.id) as swaps_count
      FROM users u
      LEFT JOIN items i ON u.id = i.user_id AND i.is_approved = TRUE
      LEFT JOIN swaps s ON u.id = s.requester_id AND s.status IN ('accepted', 'completed')
      WHERE u.id = ?
      GROUP BY u.id
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's available items
    const [items] = await pool.execute(`
      SELECT id, title, images, category, type, condition, points_value, created_at
      FROM items 
      WHERE user_id = ? AND is_available = TRUE AND is_approved = TRUE
      ORDER BY created_at DESC
      LIMIT 6
    `, [id]);

    res.json({
      user: users[0],
      items
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's items
router.get('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const pool = getConnection();

    const offset = (page - 1) * limit;

    const [items] = await pool.execute(`
      SELECT 
        i.*,
        COUNT(s.id) as swap_requests
      FROM items i
      LEFT JOIN swaps s ON i.id = s.item_id AND s.status = 'pending'
      WHERE i.user_id = ? AND i.is_approved = TRUE
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM items 
      WHERE user_id = ? AND is_approved = TRUE
    `, [id]);

    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      items,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get user items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's swap history
router.get('/:id/swaps', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    const [swaps] = await pool.execute(`
      SELECT 
        s.*,
        i.title as item_title,
        i.images as item_images,
        u.name as other_user_name,
        u.avatar as other_user_avatar
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN users u ON (
        CASE 
          WHEN s.requester_id = ? THEN i.user_id
          ELSE s.requester_id
        END
      )
      WHERE s.requester_id = ? OR i.user_id = ?
      ORDER BY s.created_at DESC
    `, [id, id, id]);

    res.json({ swaps });

  } catch (error) {
    console.error('Get user swaps error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pool = getConnection();

    const offset = (page - 1) * limit;

    const [notifications] = await pool.execute(`
      SELECT * FROM notifications 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM notifications 
      WHERE user_id = ?
    `, [req.user.id]);

    const totalNotifications = countResult[0].total;
    const totalPages = Math.ceil(totalNotifications / limit);

    res.json({
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNotifications,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    await pool.execute(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE id = ? AND user_id = ?
    `, [id, req.user.id]);

    res.json({ message: 'Notification marked as read' });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    const pool = getConnection();

    await pool.execute(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE user_id = ?
    `, [req.user.id]);

    res.json({ message: 'All notifications marked as read' });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread notifications count
router.get('/notifications/unread-count', auth, async (req, res) => {
  try {
    const pool = getConnection();

    const [result] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM notifications 
      WHERE user_id = ? AND is_read = FALSE
    `, [req.user.id]);

    res.json({ count: result[0].count });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's point transactions
router.get('/points/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pool = getConnection();

    const offset = (page - 1) * limit;

    const [transactions] = await pool.execute(`
      SELECT 
        pt.*,
        i.title as item_title
      FROM point_transactions pt
      LEFT JOIN items i ON pt.related_item_id = i.id
      WHERE pt.user_id = ?
      ORDER BY pt.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM point_transactions 
      WHERE user_id = ?
    `, [req.user.id]);

    const totalTransactions = countResult[0].total;
    const totalPages = Math.ceil(totalTransactions / limit);

    res.json({
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalTransactions,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get point transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const pool = getConnection();

    // Items stats
    const [itemStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_available = TRUE THEN 1 END) as available_items,
        COUNT(CASE WHEN is_approved = FALSE THEN 1 END) as pending_items,
        SUM(points_value) as total_points_value
      FROM items 
      WHERE user_id = ?
    `, [req.user.id]);

    // Swap stats
    const [swapStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_swaps,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_swaps,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_swaps,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_swaps
      FROM swaps 
      WHERE requester_id = ?
    `, [req.user.id]);

    // Received swaps stats
    const [receivedSwapStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_received,
        COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_received
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      WHERE i.user_id = ?
    `, [req.user.id]);

    res.json({
      items: itemStats[0],
      swaps: swapStats[0],
      receivedSwaps: receivedSwapStats[0]
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 