const express = require('express');
const { body, validationResult } = require('express-validator');
const { getConnection } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create swap request
router.post('/', auth, [
  body('itemId').isInt(),
  body('offeredItemId').optional().isInt(),
  body('offeredPoints').optional().isInt({ min: 0 }),
  body('message').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId, offeredItemId, offeredPoints, message } = req.body;
    const pool = getConnection();

    // Check if item exists and is available
    const [items] = await pool.execute(`
      SELECT i.*, u.id as owner_id 
      FROM items i 
      LEFT JOIN users u ON i.user_id = u.id 
      WHERE i.id = ? AND i.is_available = TRUE AND i.is_approved = TRUE
    `, [itemId]);

    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found or not available' });
    }

    const item = items[0];

    // Check if user is not trying to swap their own item
    if (item.owner_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot swap your own item' });
    }

    // Check if user has enough points if offering points
    if (offeredPoints) {
      if (req.user.points < offeredPoints) {
        return res.status(400).json({ message: 'Insufficient points' });
      }
    }

    // Check if offered item exists and belongs to user
    if (offeredItemId) {
      const [offeredItems] = await pool.execute(`
        SELECT * FROM items 
        WHERE id = ? AND user_id = ? AND is_available = TRUE
      `, [offeredItemId, req.user.id]);

      if (offeredItems.length === 0) {
        return res.status(400).json({ message: 'Offered item not found or not available' });
      }
    }

    // Check if user already has a pending swap for this item
    const [existingSwaps] = await pool.execute(`
      SELECT id FROM swaps 
      WHERE requester_id = ? AND item_id = ? AND status = 'pending'
    `, [req.user.id, itemId]);

    if (existingSwaps.length > 0) {
      return res.status(400).json({ message: 'You already have a pending swap request for this item' });
    }

    // Create swap request
    const [result] = await pool.execute(`
      INSERT INTO swaps (requester_id, item_id, offered_item_id, offered_points, message)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, itemId, offeredItemId || null, offeredPoints || null, message]);

    // Create notification for item owner
    await pool.execute(`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, 'swap_request', 'New Swap Request', ?, ?)
    `, [item.owner_id, `You have a new swap request for "${item.title}"`, result.insertId]);

    // Get created swap with details
    const [swaps] = await pool.execute(`
      SELECT 
        s.*,
        i.title as item_title,
        i.images as item_images,
        u.name as requester_name,
        u.avatar as requester_avatar
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN users u ON s.requester_id = u.id
      WHERE s.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Swap request created successfully',
      swap: swaps[0]
    });

  } catch (error) {
    console.error('Create swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's swap requests (sent)
router.get('/sent', auth, async (req, res) => {
  try {
    const pool = getConnection();

    const [swaps] = await pool.execute(`
      SELECT 
        s.*,
        i.title as item_title,
        i.images as item_images,
        i.points_value as item_points,
        u.name as item_owner_name,
        u.avatar as item_owner_avatar,
        oi.title as offered_item_title,
        oi.images as offered_item_images
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN items oi ON s.offered_item_id = oi.id
      WHERE s.requester_id = ?
      ORDER BY s.created_at DESC
    `, [req.user.id]);

    res.json({ swaps });

  } catch (error) {
    console.error('Get sent swaps error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's swap requests (received)
router.get('/received', auth, async (req, res) => {
  try {
    const pool = getConnection();

    const [swaps] = await pool.execute(`
      SELECT 
        s.*,
        i.title as item_title,
        i.images as item_images,
        i.points_value as item_points,
        u.name as requester_name,
        u.avatar as requester_avatar,
        oi.title as offered_item_title,
        oi.images as offered_item_images
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN users u ON s.requester_id = u.id
      LEFT JOIN items oi ON s.offered_item_id = oi.id
      WHERE i.user_id = ?
      ORDER BY s.created_at DESC
    `, [req.user.id]);

    res.json({ swaps });

  } catch (error) {
    console.error('Get received swaps error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept swap request
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    // Get swap details
    const [swaps] = await pool.execute(`
      SELECT 
        s.*,
        i.user_id as item_owner_id,
        i.title as item_title,
        i.points_value as item_points,
        u.points as requester_points
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN users u ON s.requester_id = u.id
      WHERE s.id = ? AND s.status = 'pending'
    `, [id]);

    if (swaps.length === 0) {
      return res.status(404).json({ message: 'Swap request not found' });
    }

    const swap = swaps[0];

    // Check if user owns the item
    if (swap.item_owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to accept this swap' });
    }

    // Check if requester has enough points if points are involved
    if (swap.offered_points && swap.requester_points < swap.offered_points) {
      return res.status(400).json({ message: 'Requester has insufficient points' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update swap status
      await connection.execute(
        'UPDATE swaps SET status = ? WHERE id = ?',
        ['accepted', id]
      );

      // Mark items as unavailable
      await connection.execute(
        'UPDATE items SET is_available = FALSE WHERE id IN (?, ?)',
        [swap.item_id, swap.offered_item_id].filter(Boolean)
      );

      // Handle points transfer if applicable
      if (swap.offered_points) {
        // Deduct points from requester
        await connection.execute(
          'UPDATE users SET points = points - ? WHERE id = ?',
          [swap.offered_points, swap.requester_id]
        );

        // Add points to item owner
        await connection.execute(
          'UPDATE users SET points = points + ? WHERE id = ?',
          [swap.offered_points, req.user.id]
        );

        // Record point transactions
        await connection.execute(`
          INSERT INTO point_transactions (user_id, type, amount, description, related_item_id)
          VALUES (?, 'spent', ?, 'Swap for item: ${swap.item_title}', ?)
        `, [swap.requester_id, swap.offered_points, swap.item_id]);

        await connection.execute(`
          INSERT INTO point_transactions (user_id, type, amount, description, related_item_id)
          VALUES (?, 'earned', ?, 'Swap for item: ${swap.item_title}', ?)
        `, [req.user.id, swap.offered_points, swap.item_id]);
      }

      // Create notifications
      await connection.execute(`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (?, 'swap_accepted', 'Swap Accepted', ?, ?)
      `, [swap.requester_id, `Your swap request for "${swap.item_title}" has been accepted!`, id]);

      await connection.commit();

      res.json({ message: 'Swap accepted successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Accept swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject swap request
router.put('/:id/reject', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    // Get swap details
    const [swaps] = await pool.execute(`
      SELECT 
        s.*,
        i.user_id as item_owner_id,
        i.title as item_title
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      WHERE s.id = ? AND s.status = 'pending'
    `, [id]);

    if (swaps.length === 0) {
      return res.status(404).json({ message: 'Swap request not found' });
    }

    const swap = swaps[0];

    // Check if user owns the item
    if (swap.item_owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to reject this swap' });
    }

    // Update swap status
    await pool.execute(
      'UPDATE swaps SET status = ? WHERE id = ?',
      ['rejected', id]
    );

    // Create notification
    await pool.execute(`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, 'swap_rejected', 'Swap Rejected', ?, ?)
    `, [swap.requester_id, `Your swap request for "${swap.item_title}" has been rejected.`, id]);

    res.json({ message: 'Swap rejected successfully' });

  } catch (error) {
    console.error('Reject swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel swap request
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    // Get swap details
    const [swaps] = await pool.execute(`
      SELECT 
        s.*,
        i.user_id as item_owner_id,
        i.title as item_title
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      WHERE s.id = ? AND s.status = 'pending'
    `, [id]);

    if (swaps.length === 0) {
      return res.status(404).json({ message: 'Swap request not found' });
    }

    const swap = swaps[0];

    // Check if user is the requester
    if (swap.requester_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this swap' });
    }

    // Update swap status
    await pool.execute(
      'UPDATE swaps SET status = ? WHERE id = ?',
      ['cancelled', id]
    );

    // Create notification
    await pool.execute(`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, 'swap_cancelled', 'Swap Cancelled', ?, ?)
    `, [swap.item_owner_id, `Swap request for "${swap.item_title}" has been cancelled.`, id]);

    res.json({ message: 'Swap cancelled successfully' });

  } catch (error) {
    console.error('Cancel swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete swap (mark as completed)
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    // Get swap details
    const [swaps] = await pool.execute(`
      SELECT 
        s.*,
        i.user_id as item_owner_id,
        i.title as item_title
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      WHERE s.id = ? AND s.status = 'accepted'
    `, [id]);

    if (swaps.length === 0) {
      return res.status(404).json({ message: 'Swap not found or not accepted' });
    }

    const swap = swaps[0];

    // Check if user is involved in the swap
    if (swap.requester_id !== req.user.id && swap.item_owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to complete this swap' });
    }

    // Update swap status
    await pool.execute(
      'UPDATE swaps SET status = ? WHERE id = ?',
      ['completed', id]
    );

    // Create notification for the other party
    const otherUserId = swap.requester_id === req.user.id ? swap.item_owner_id : swap.requester_id;
    await pool.execute(`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, 'swap_completed', 'Swap Completed', ?, ?)
    `, [otherUserId, `Swap for "${swap.item_title}" has been marked as completed.`, id]);

    res.json({ message: 'Swap completed successfully' });

  } catch (error) {
    console.error('Complete swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get swap statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const pool = getConnection();

    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_swaps,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_swaps,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_swaps,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_swaps,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_swaps
      FROM swaps 
      WHERE requester_id = ? OR item_id IN (
        SELECT id FROM items WHERE user_id = ?
      )
    `, [req.user.id, req.user.id]);

    res.json({ stats: stats[0] });

  } catch (error) {
    console.error('Get swap stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 