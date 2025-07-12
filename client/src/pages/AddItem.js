import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import { 
  PhotoIcon, 
  XMarkIcon, 
  SparklesIcon, 
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const AddItem = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    type: '',
    size: '',
    condition: '',
    tags: '',
    pointsValue: ''
  });

  const [images, setImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [errors, setErrors] = useState({});

  const categories = [
    'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Sportswear', 'Formal'
  ];

  const types = {
    'Tops': ['T-Shirt', 'Shirt', 'Blouse', 'Sweater', 'Hoodie', 'Tank Top', 'Polo'],
    'Bottoms': ['Jeans', 'Pants', 'Shorts', 'Skirt', 'Leggings'],
    'Dresses': ['Casual Dress', 'Formal Dress', 'Sundress', 'Cocktail Dress'],
    'Outerwear': ['Jacket', 'Coat', 'Blazer', 'Cardigan', 'Vest'],
    'Shoes': ['Sneakers', 'Boots', 'Sandals', 'Heels', 'Flats', 'Loafers'],
    'Accessories': ['Bag', 'Hat', 'Scarf', 'Jewelry', 'Belt', 'Sunglasses'],
    'Sportswear': ['Athletic Top', 'Athletic Bottom', 'Sports Bra', 'Athletic Shoes'],
    'Formal': ['Suit', 'Dress Shirt', 'Tie', 'Formal Shoes']
  };

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
  const conditions = ['new', 'like_new', 'good', 'fair', 'poor'];

  // Dropzone for image upload
  const onDrop = useCallback((acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const removeImage = (index) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      return newImages;
    });
  };

  // AI Analysis mutation
  const analyzeImageMutation = useMutation(
    async (imageUrl) => {
      const response = await api.post('/api/ai/analyze-image', { imageUrl });
      return response.data;
    },
    {
      onSuccess: (data) => {
        setAiAnalysis(data.analysis);
        // Auto-fill form with AI suggestions
        if (data.analysis.category && !formData.category) {
          setFormData(prev => ({ ...prev, category: data.analysis.category }));
        }
        if (data.analysis.type && !formData.type) {
          setFormData(prev => ({ ...prev, type: data.analysis.type }));
        }
        if (data.analysis.tags && !formData.tags) {
          setFormData(prev => ({ ...prev, tags: data.analysis.tags.join(', ') }));
        }
        toast.success('AI analysis completed!');
      },
      onError: () => {
        toast.error('AI analysis failed. You can still add the item manually.');
      }
    }
  );

  // Create item mutation
  const createItemMutation = useMutation(
    async (formDataToSend) => {
      const formDataObj = new FormData();
      
      // Add form fields
      Object.keys(formDataToSend).forEach(key => {
        if (formDataToSend[key] !== '') {
          formDataObj.append(key, formDataToSend[key]);
        }
      });

      // Add images
      images.forEach((imageObj, index) => {
        formDataObj.append('images', imageObj.file);
      });

      const response = await api.post('/api/items', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Item added successfully! It will be reviewed by admins.');
        queryClient.invalidateQueries(['user-items']);
        navigate('/dashboard');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to add item';
        toast.error(message);
      }
    }
  );

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    if (!formData.condition) {
      newErrors.condition = 'Condition is required';
    }

    if (images.length === 0) {
      newErrors.images = 'At least one image is required';
    }

    if (formData.pointsValue && (isNaN(formData.pointsValue) || formData.pointsValue < 0)) {
      newErrors.pointsValue = 'Points value must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      await createItemMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeImages = async () => {
    if (images.length === 0) {
      toast.error('Please upload at least one image for AI analysis');
      return;
    }

    // For demo purposes, we'll simulate AI analysis
    // In a real app, you'd upload the image first and then analyze it
    setAiAnalysis({
      category: 'Tops',
      type: 'T-Shirt',
      condition: 'good',
      tags: ['casual', 'cotton', 'comfortable'],
      confidence: 0.85
    });
    
    toast.success('AI analysis completed!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add New Item</h1>
        <p className="text-gray-600 mt-2">List a clothing item for the community to swap.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Image Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Item Images</h2>
            <button
              type="button"
              onClick={handleAnalyzeImages}
              disabled={images.length === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <SparklesIcon className="h-4 w-4" />
              Analyze with AI
            </button>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {isDragActive ? 'Drop images here' : 'Drag & drop images here, or click to select'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Up to 5 images, max 5MB each</p>
          </div>

          {errors.images && (
            <p className="text-sm text-red-600">{errors.images}</p>
          )}

          {/* Image Preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {images.map((imageObj, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageObj.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-900">AI Analysis Results</h3>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Category:</span>
                      <span className="ml-1 text-blue-900">{aiAnalysis.category}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Type:</span>
                      <span className="ml-1 text-blue-900">{aiAnalysis.type}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Condition:</span>
                      <span className="ml-1 text-blue-900">{aiAnalysis.condition}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Confidence:</span>
                      <span className="ml-1 text-blue-900">{(aiAnalysis.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  {aiAnalysis.tags && (
                    <div className="mt-2">
                      <span className="text-blue-700 text-sm">Tags:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {aiAnalysis.tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Item Details Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Item Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Item Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`input-field mt-1 ${errors.title ? 'border-red-500' : ''}`}
                placeholder="e.g., Vintage Denim Jacket"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`input-field mt-1 ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`input-field mt-1 ${errors.type ? 'border-red-500' : ''}`}
                disabled={!formData.category}
              >
                <option value="">Select type</option>
                {formData.category && types[formData.category]?.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type}</p>
              )}
            </div>

            {/* Size */}
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                Size
              </label>
              <select
                id="size"
                name="size"
                value={formData.size}
                onChange={handleChange}
                className="input-field mt-1"
              >
                <option value="">Select size</option>
                {sizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
                Condition *
              </label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className={`input-field mt-1 ${errors.condition ? 'border-red-500' : ''}`}
              >
                <option value="">Select condition</option>
                {conditions.map(condition => (
                  <option key={condition} value={condition}>
                    {condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
              {errors.condition && (
                <p className="mt-1 text-sm text-red-600">{errors.condition}</p>
              )}
            </div>

            {/* Points Value */}
            <div>
              <label htmlFor="pointsValue" className="block text-sm font-medium text-gray-700">
                Points Value
              </label>
              <input
                type="number"
                id="pointsValue"
                name="pointsValue"
                value={formData.pointsValue}
                onChange={handleChange}
                className={`input-field mt-1 ${errors.pointsValue ? 'border-red-500' : ''}`}
                placeholder="50"
                min="0"
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty for AI suggestion</p>
              {errors.pointsValue && (
                <p className="mt-1 text-sm text-red-600">{errors.pointsValue}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="input-field mt-1"
              placeholder="Describe your item, including any notable features, brand, or styling suggestions..."
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="input-field mt-1"
              placeholder="casual, vintage, sustainable, cotton (separate with commas)"
            />
            <p className="mt-1 text-xs text-gray-500">Add relevant tags to help others find your item</p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Adding Item...' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddItem; 