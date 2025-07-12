const express = require('express');
const { getConnection } = require('../config/database');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all pending items for approval
router.get('/items/pending', adminAuth, async (req, res) => {
  try {
    const pool = getConnection();

    const [items] = await pool.execute(`
      SELECT 
        i.*,
        u.name as uploader_name,
        u.email as uploader_email,
        u.avatar as uploader_avatar
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.is_approved = FALSE
      ORDER BY i.created_at ASC
    `);

    res.json({ items });

  } catch (error) {
    console.error('Get pending items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve item
router.put('/items/:id/approve', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    const [result] = await pool.execute(
      'UPDATE items SET is_approved = TRUE WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Get item details for notification
    const [items] = await pool.execute(`
      SELECT i.title, i.user_id, u.name as user_name
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `, [id]);

    if (items.length > 0) {
      // Create notification
      await pool.execute(`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (?, 'item_approved', 'Item Approved', ?, ?)
      `, [items[0].user_id, `Your item "${items[0].title}" has been approved!`, id]);
    }

    res.json({ message: 'Item approved successfully' });

  } catch (error) {
    console.error('Approve item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject item
router.put('/items/:id/reject', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const pool = getConnection();

    const [result] = await pool.execute(
      'DELETE FROM items WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Get item details for notification
    const [items] = await pool.execute(`
      SELECT i.title, i.user_id, u.name as user_name
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `, [id]);

    if (items.length > 0) {
      // Create notification
      await pool.execute(`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (?, 'item_rejected', 'Item Rejected', ?, ?)
      `, [items[0].user_id, `Your item "${items[0].title}" has been rejected. ${reason || ''}`, id]);
    }

    res.json({ message: 'Item rejected successfully' });

  } catch (error) {
    console.error('Reject item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const pool = getConnection();

    const [users] = await pool.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar,
        u.bio,
        u.points,
        u.role,
        u.is_verified,
        u.created_at,
        COUNT(i.id) as items_count,
        COUNT(s.id) as swaps_count
      FROM users u
      LEFT JOIN items i ON u.id = i.user_id
      LEFT JOIN swaps s ON u.id = s.requester_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json({ users });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role
router.put('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const pool = getConnection();

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const [result] = await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User role updated successfully' });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get platform statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const pool = getConnection();

    // User stats
    const [userStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users_week,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_month
      FROM users
    `);

    // Item stats
    const [itemStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_approved = FALSE THEN 1 END) as pending_items,
        COUNT(CASE WHEN is_available = TRUE THEN 1 END) as available_items,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_items_week
      FROM items
    `);

    // Swap stats
    const [swapStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_swaps,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_swaps,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_swaps,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_swaps,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_swaps_week
      FROM swaps
    `);

    // Category distribution
    const [categoryStats] = await pool.execute(`
      SELECT 
        category,
        COUNT(*) as count
      FROM items 
      WHERE is_approved = TRUE
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      users: userStats[0],
      items: itemStats[0],
      swaps: swapStats[0],
      categories: categoryStats
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent activity
router.get('/activity', adminAuth, async (req, res) => {
  try {
    const pool = getConnection();

    // Recent items
    const [recentItems] = await pool.execute(`
      SELECT 
        i.*,
        u.name as uploader_name
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      ORDER BY i.created_at DESC
      LIMIT 10
    `);

    // Recent swaps
    const [recentSwaps] = await pool.execute(`
      SELECT 
        s.*,
        i.title as item_title,
        u.name as requester_name
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN users u ON s.requester_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 10
    `);

    // Recent users
    const [recentUsers] = await pool.execute(`
      SELECT id, name, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      recentItems,
      recentSwaps,
      recentUsers
    });

  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove inappropriate item
router.delete('/items/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const pool = getConnection();

    // Get item details before deletion
    const [items] = await pool.execute(`
      SELECT i.title, i.user_id, u.name as user_name
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `, [id]);

    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Delete item
    await pool.execute('DELETE FROM items WHERE id = ?', [id]);

    // Create notification
    await pool.execute(`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, 'item_removed', 'Item Removed', ?, ?)
    `, [items[0].user_id, `Your item "${items[0].title}" has been removed by admin. ${reason || ''}`, id]);

    res.json({ message: 'Item removed successfully' });

  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 