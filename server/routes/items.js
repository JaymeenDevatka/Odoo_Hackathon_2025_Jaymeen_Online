const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { body, validationResult } = require('express-validator');
const { getConnection } = require('../config/database');
const { auth, optionalAuth } = require('../middleware/auth');
const AIService = require('../services/aiService');

const router = express.Router();

// Configure Cloudinary (temporarily disabled for testing)
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all items with filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      category,
      type,
      condition,
      minPoints,
      maxPoints,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      page = 1,
      limit = 12
    } = req.query;

    const pool = getConnection();
    const offset = (page - 1) * limit;
    
    let whereConditions = ['i.is_available = TRUE', 'i.is_approved = TRUE'];
    let queryParams = [];

    if (category) {
      whereConditions.push('i.category = ?');
      queryParams.push(category);
    }

    if (type) {
      whereConditions.push('i.type = ?');
      queryParams.push(type);
    }

    if (condition) {
      whereConditions.push('i.`condition` = ?');
      queryParams.push(condition);
    }

    if (minPoints) {
      whereConditions.push('i.points_value >= ?');
      queryParams.push(parseInt(minPoints));
    }

    if (maxPoints) {
      whereConditions.push('i.points_value <= ?');
      queryParams.push(parseInt(maxPoints));
    }

    if (search) {
      whereConditions.push('(i.title LIKE ? OR i.description LIKE ? OR JSON_EXTRACT(i.tags, "$") LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get items with user info
    let [items] = await pool.execute(`
      SELECT 
        i.*,
        u.name as uploader_name,
        u.avatar as uploader_avatar,
        COUNT(s.id) as swap_requests
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN swaps s ON i.id = s.item_id AND s.status = 'pending'
      WHERE ${whereClause}
      GROUP BY i.id
      ORDER BY i.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), parseInt(offset)]);

    // Make items robust
    const safeImages = (images) => {
      try {
        return Array.isArray(images) ? images : JSON.parse(images || '[]');
      } catch {
        return [];
      }
    };
    const safeTags = (tags) => {
      try {
        return Array.isArray(tags) ? tags : JSON.parse(tags || '[]');
      } catch {
        return [];
      }
    };
    items = items.map(item => ({
      ...item,
      images: safeImages(item.images),
      tags: safeTags(item.tags),
      title: item.title || 'Untitled',
      description: item.description || '',
      category: item.category || '',
      points_value: item.points_value || 0,
    }));

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM items i
      WHERE ${whereClause}
    `, queryParams);

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
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single item
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    const [items] = await pool.execute(`
      SELECT 
        i.*,
        u.name as uploader_name,
        u.avatar as uploader_avatar,
        u.bio as uploader_bio,
        u.id as uploader_id
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ? AND i.is_available = TRUE
    `, [id]);

    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = items[0];

    // Check if user can swap this item
    let canSwap = false;
    if (req.user && req.user.id !== item.uploader_id) {
      canSwap = true;
    }

    res.json({
      item: {
        ...item,
        canSwap
      }
    });

  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new item
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      type,
      size,
      condition,
      tags,
      pointsValue
    } = req.body;

    const pool = getConnection();

    // Upload images to Cloudinary (temporarily disabled)
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // For testing, we'll create a placeholder URL
        // In production, this should upload to Cloudinary
        const placeholderUrl = `https://via.placeholder.com/800x800/cccccc/666666?text=${encodeURIComponent(file.originalname)}`;
        imageUrls.push(placeholderUrl);
      }
    }

    // AI content moderation (temporarily disabled for testing)
    // const moderationResult = await AIService.moderateContent(title, description);
    // if (!moderationResult.isAppropriate) {
    //   return res.status(400).json({ 
    //     message: 'Content violates community guidelines',
    //     reason: moderationResult.reason,
    //     suggestedChanges: moderationResult.suggestedChanges
    //   });
    // }

    // AI image analysis if images provided (temporarily disabled for testing)
    let aiCategory = category;
    let aiTags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    
    // if (imageUrls.length > 0) {
    //   try {
    //     const aiAnalysis = await AIService.analyzeClothingImage(imageUrls[0]);
    //     aiCategory = aiAnalysis.category;
    //     aiTags = [...aiTags, ...aiAnalysis.tags];
        
    //     // Generate AI description if not provided
    //     if (!description) {
    //       const aiDescription = await AIService.generateItemDescription(aiAnalysis);
    //       if (aiDescription) {
    //         req.body.description = aiDescription;
    //       }
    //     }
    //   } catch (error) {
    //     console.error('AI analysis failed:', error);
    //     // Continue without AI analysis
    //   }
    // }

    // AI points suggestion if not provided (temporarily disabled for testing)
    let finalPointsValue = pointsValue ? parseInt(pointsValue) : 50;
    // if (!pointsValue) {
    //   try {
    //     finalPointsValue = await AIService.suggestPointsValue({
    //       category: aiCategory,
    //       type,
    //       condition
    //     });
    //   } catch (error) {
    //     console.error('AI points suggestion failed:', error);
    //   }
    // }

    // Create item
    const [result] = await pool.execute(`
      INSERT INTO items (
        user_id, title, description, category, type, size, ``condition``, 
        tags, images, points_value, ai_category, ai_tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      title,
      req.body.description || description,
      aiCategory,
      type,
      size,
      condition,
      JSON.stringify(aiTags),
      JSON.stringify(imageUrls),
      finalPointsValue,
      aiCategory,
      JSON.stringify(aiTags)
    ]);

    // Get created item
    const [items] = await pool.execute(`
      SELECT 
        i.*,
        u.name as uploader_name,
        u.avatar as uploader_avatar
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Item created successfully',
      item: items[0]
    });

  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update item
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, type, size, condition, tags, pointsValue } = req.body;
    
    const pool = getConnection();

    // Check if item belongs to user
    const [items] = await pool.execute(
      'SELECT user_id FROM items WHERE id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (items[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this item' });
    }

    // AI content moderation (temporarily disabled for testing)
    // const moderationResult = await AIService.moderateContent(title, description);
    // if (!moderationResult.isAppropriate) {
    //   return res.status(400).json({ 
    //     message: 'Content violates community guidelines',
    //     reason: moderationResult.reason
    //   });
    // }

    // Update item
    await pool.execute(`
      UPDATE items 
      SET title = ?, description = ?, category = ?, type = ?, size = ?, 
          ``condition`` = ?, tags = ?, points_value = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, category, type, size, condition, JSON.stringify(tags ? tags.split(',').map(tag => tag.trim()) : []), pointsValue, id]);

    // Get updated item
    const [updatedItems] = await pool.execute(`
      SELECT 
        i.*,
        u.name as uploader_name,
        u.avatar as uploader_avatar
      FROM items i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `, [id]);

    res.json({
      message: 'Item updated successfully',
      item: updatedItems[0]
    });

  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete item
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    // Check if item belongs to user
    const [items] = await pool.execute(
      'SELECT user_id, images FROM items WHERE id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (items[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }

    // Delete images from Cloudinary
    if (items[0].images) {
      const imageUrls = JSON.parse(items[0].images);
      for (const url of imageUrls) {
        try {
          const publicId = url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`rewear-items/${publicId}`);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    // Delete item
    await pool.execute('DELETE FROM items WHERE id = ?', [id]);

    res.json({ message: 'Item deleted successfully' });

  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's items
router.get('/user/me', auth, async (req, res) => {
  try {
    const pool = getConnection();

    const [items] = await pool.execute(`
      SELECT * FROM items 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({ items });

  } catch (error) {
    console.error('Get user items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get categories and types
router.get('/categories/list', async (req, res) => {
  try {
    const pool = getConnection();

    const [categories] = await pool.execute(`
      SELECT DISTINCT category, type 
      FROM items 
      WHERE is_available = TRUE AND is_approved = TRUE
      ORDER BY category, type
    `);

    const categoryMap = {};
    categories.forEach(item => {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = [];
      }
      if (!categoryMap[item.category].includes(item.type)) {
        categoryMap[item.category].push(item.type);
      }
    });

    res.json({ categories: categoryMap });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 