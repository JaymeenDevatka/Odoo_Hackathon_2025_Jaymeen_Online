const express = require('express');
const AIService = require('../services/aiService');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Analyze image and get AI suggestions
router.post('/analyze-image', auth, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const analysis = await AIService.analyzeClothingImage(imageUrl);
    
    res.json({
      message: 'Image analyzed successfully',
      analysis
    });

  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ message: 'Failed to analyze image' });
  }
});

// Generate item description
router.post('/generate-description', auth, async (req, res) => {
  try {
    const { category, type, colors, style, material, condition } = req.body;

    const description = await AIService.generateItemDescription({
      category,
      type,
      colors,
      style,
      material,
      condition
    });

    res.json({
      message: 'Description generated successfully',
      description
    });

  } catch (error) {
    console.error('Description generation error:', error);
    res.status(500).json({ message: 'Failed to generate description' });
  }
});

// Get AI-powered recommendations
router.get('/recommendations', auth, async (req, res) => {
  try {
    const { getConnection } = require('../config/database');
    const pool = getConnection();

    // Get user's preferences based on their items and swaps
    const [userItems] = await pool.execute(`
      SELECT category, type, tags
      FROM items 
      WHERE user_id = ? AND is_approved = TRUE
    `, [req.user.id]);

    const [userSwaps] = await pool.execute(`
      SELECT i.category, i.type, i.tags
      FROM swaps s
      LEFT JOIN items i ON s.item_id = i.id
      WHERE s.requester_id = ? AND s.status IN ('accepted', 'completed')
    `, [req.user.id]);

    const userPreferences = {
      items: userItems,
      swaps: userSwaps,
      interests: [...userItems, ...userSwaps].map(item => ({
        category: item.category,
        type: item.type,
        tags: item.tags ? JSON.parse(item.tags) : []
      }))
    };

    const recommendations = await AIService.getItemRecommendations(req.user.id, userPreferences);

    res.json({
      message: 'Recommendations generated successfully',
      recommendations
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ message: 'Failed to generate recommendations' });
  }
});

// Extract tags from text
router.post('/extract-tags', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const tags = await AIService.extractTagsFromText(text);

    res.json({
      message: 'Tags extracted successfully',
      tags
    });

  } catch (error) {
    console.error('Tag extraction error:', error);
    res.status(500).json({ message: 'Failed to extract tags' });
  }
});

// Suggest points value
router.post('/suggest-points', auth, async (req, res) => {
  try {
    const { category, type, style, condition, brand } = req.body;

    const points = await AIService.suggestPointsValue({
      category,
      type,
      style,
      condition,
      brand
    });

    res.json({
      message: 'Points suggestion generated successfully',
      points
    });

  } catch (error) {
    console.error('Points suggestion error:', error);
    res.status(500).json({ message: 'Failed to suggest points value' });
  }
});

// Moderate content
router.post('/moderate', auth, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title && !description) {
      return res.status(400).json({ message: 'Title or description is required' });
    }

    const moderation = await AIService.moderateContent(title || '', description || '');

    res.json({
      message: 'Content moderated successfully',
      moderation
    });

  } catch (error) {
    console.error('Content moderation error:', error);
    res.status(500).json({ message: 'Failed to moderate content' });
  }
});

module.exports = router; 