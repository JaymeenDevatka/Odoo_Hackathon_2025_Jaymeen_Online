const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class AIService {
  // Analyze clothing image and extract features
  static async analyzeClothingImage(imageUrl) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this clothing item image and provide:
                1. Category (e.g., tops, bottoms, dresses, outerwear, shoes, accessories)
                2. Type (e.g., t-shirt, jeans, dress, jacket, sneakers, bag)
                3. Color(s)
                4. Style (e.g., casual, formal, vintage, sporty)
                5. Material (if visible)
                6. Condition assessment (new, like_new, good, fair, poor)
                7. Relevant tags (comma-separated)
                
                Respond in JSON format:
                {
                  "category": "string",
                  "type": "string", 
                  "colors": ["string"],
                  "style": "string",
                  "material": "string",
                  "condition": "string",
                  "tags": ["string"]
                }`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('AI image analysis error:', error);
      throw new Error('Failed to analyze image');
    }
  }

  // Generate item description
  static async generateItemDescription(itemData) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a fashion expert helping users describe clothing items for a sustainable fashion exchange platform. Write engaging, accurate descriptions that highlight the item's features and appeal."
          },
          {
            role: "user",
            content: `Generate a compelling description for this clothing item:
            Category: ${itemData.category}
            Type: ${itemData.type}
            Colors: ${itemData.colors?.join(', ')}
            Style: ${itemData.style}
            Material: ${itemData.material}
            Condition: ${itemData.condition}
            
            Write a 2-3 sentence description that's engaging and accurate.`
          }
        ],
        max_tokens: 150
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('AI description generation error:', error);
      return null;
    }
  }

  // Suggest points value for item
  static async suggestPointsValue(itemData) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a fashion expert helping determine fair point values for clothing items in a sustainable fashion exchange. Consider brand, condition, style, and market demand."
          },
          {
            role: "user",
            content: `Suggest a fair point value (10-500 points) for this item:
            Category: ${itemData.category}
            Type: ${itemData.type}
            Style: ${itemData.style}
            Condition: ${itemData.condition}
            Brand: ${itemData.brand || 'Unknown'}
            
            Respond with just the number.`
          }
        ],
        max_tokens: 10
      });

      const points = parseInt(response.choices[0].message.content.trim());
      return Math.max(10, Math.min(500, points || 50));
    } catch (error) {
      console.error('AI points suggestion error:', error);
      return 50; // Default value
    }
  }

  // Generate item recommendations
  static async getItemRecommendations(userId, userPreferences) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a fashion recommendation system. Based on user preferences and behavior, suggest clothing categories and styles they might like."
          },
          {
            role: "user",
            content: `Based on these user preferences, suggest 5 clothing categories/types they might be interested in:
            ${JSON.stringify(userPreferences)}
            
            Respond with a JSON array of category/type combinations.`
          }
        ],
        max_tokens: 200
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('AI recommendation error:', error);
      return [];
    }
  }

  // Moderate item content
  static async moderateContent(title, description) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a content moderator for a clothing exchange platform. Check if the content is appropriate and follows community guidelines."
          },
          {
            role: "user",
            content: `Moderate this clothing item content:
            Title: ${title}
            Description: ${description}
            
            Respond with JSON:
            {
              "isAppropriate": boolean,
              "reason": "string if inappropriate",
              "suggestedChanges": "string if needed"
            }`
          }
        ],
        max_tokens: 200
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('AI content moderation error:', error);
      return { isAppropriate: true, reason: null, suggestedChanges: null };
    }
  }

  // Extract tags from text description
  static async extractTagsFromText(text) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Extract relevant fashion tags from the given text. Focus on style, color, material, occasion, and brand information."
          },
          {
            role: "user",
            content: `Extract relevant tags from this text: "${text}"
            
            Respond with a JSON array of tags (strings).`
          }
        ],
        max_tokens: 100
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('AI tag extraction error:', error);
      return [];
    }
  }
}

module.exports = AIService; 