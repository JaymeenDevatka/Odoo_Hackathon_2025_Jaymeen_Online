# ReWear - Community Clothing Exchange Platform

A full-stack web application that enables users to exchange unused clothing through direct swaps or a point-based redemption system. Built with the MERN stack (MongoDB, Express.js, React, Node.js) and MySQL, featuring AI-powered image analysis and content moderation.

## 🌟 Features

### Core Features
- **User Authentication**: Secure email/password registration and login with JWT tokens
- **Item Management**: Upload, categorize, and manage clothing items with AI-powered analysis
- **Swap System**: Direct item-to-item swaps or point-based redemptions
- **Point System**: Earn and spend points for clothing items
- **User Profiles**: Detailed user profiles with swap history and statistics

### AI-Powered Features
- **Image Analysis**: Automatic clothing categorization, condition assessment, and tag generation
- **Content Moderation**: AI-powered content filtering for inappropriate listings
- **Smart Recommendations**: Personalized item suggestions based on user preferences
- **Description Generation**: AI-generated compelling item descriptions
- **Points Valuation**: Intelligent point value suggestions for items

### Admin Features
- **Item Moderation**: Approve/reject item listings
- **User Management**: View and manage user accounts
- **Platform Statistics**: Comprehensive analytics and reporting
- **Content Oversight**: Remove inappropriate content

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MySQL** database with connection pooling
- **JWT** for authentication
- **Multer** for file uploads
- **Cloudinary** for image storage
- **OpenAI API** for AI features
- **bcryptjs** for password hashing

### Frontend
- **React 18** with functional components and hooks
- **React Router** for navigation
- **React Query** for state management
- **Tailwind CSS** for styling
- **Heroicons** for icons
- **React Hot Toast** for notifications
- **React Dropzone** for file uploads

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **MySQL** (v8.0 or higher)
- **npm** or **yarn**

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Odoo_Hack_Next
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Environment Configuration

#### Backend Environment (.env)
Create a `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=rewear_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

#### Frontend Environment (.env)
Create a `.env` file in the `client` directory:

```env
REACT_APP_API_URL=http://localhost:5000
```

### 4. Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE rewear_db;
```

2. The application will automatically create all necessary tables on first run.

### 5. Start the Application

#### Development Mode
```bash
# From the root directory
npm run dev
```

This will start both the backend server (port 5000) and frontend development server (port 3000).

#### Production Mode
```bash
# Build the frontend
cd client
npm run build

# Start the backend
cd ../server
npm start
```

## 📁 Project Structure

```
Odoo_Hack_Next/
├── server/                 # Backend application
│   ├── config/            # Database configuration
│   ├── middleware/        # Authentication middleware
│   ├── routes/           # API routes
│   ├── services/         # AI services and utilities
│   └── index.js          # Main server file
├── client/                # Frontend React application
│   ├── public/           # Static files
│   ├── src/              # React source code
│   │   ├── components/   # Reusable components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── App.js        # Main app component
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Items
- `GET /api/items` - Get all items with filters
- `GET /api/items/:id` - Get single item
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Swaps
- `POST /api/swaps` - Create swap request
- `GET /api/swaps/sent` - Get sent swaps
- `GET /api/swaps/received` - Get received swaps
- `PUT /api/swaps/:id/accept` - Accept swap
- `PUT /api/swaps/:id/reject` - Reject swap

### AI Features
- `POST /api/ai/analyze-image` - Analyze clothing image
- `POST /api/ai/generate-description` - Generate item description
- `GET /api/ai/recommendations` - Get personalized recommendations
- `POST /api/ai/extract-tags` - Extract tags from text
- `POST /api/ai/suggest-points` - Suggest points value

### Admin
- `GET /api/admin/items/pending` - Get pending items
- `PUT /api/admin/items/:id/approve` - Approve item
- `PUT /api/admin/items/:id/reject` - Reject item
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get platform statistics

## 🎯 Key Features Explained

### AI Image Analysis
The platform uses OpenAI's GPT-4 Vision API to analyze uploaded clothing images and automatically:
- Categorize items (tops, bottoms, dresses, etc.)
- Assess condition (new, like-new, good, fair, poor)
- Extract colors, style, and material information
- Generate relevant tags
- Suggest appropriate point values

### Point System
- New users receive 100 points upon registration
- Users earn points by listing items (AI-suggested values)
- Points can be spent to redeem items from other users
- Point transactions are tracked and displayed in user profiles

### Content Moderation
- AI-powered content filtering for inappropriate listings
- Admin approval system for new items
- Community guidelines enforcement
- Automatic flagging of potentially problematic content

## 🔒 Security Features

- JWT-based authentication with token expiration
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Helmet.js for security headers

## 🚀 Deployment

### Backend Deployment
1. Set up a MySQL database (AWS RDS, DigitalOcean, etc.)
2. Configure environment variables
3. Deploy to platforms like Heroku, Railway, or AWS

### Frontend Deployment
1. Build the React application: `npm run build`
2. Deploy to platforms like Vercel, Netlify, or AWS S3

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## 🔮 Future Enhancements

- Real-time chat between users
- Mobile application
- Advanced search filters
- Social features (following, likes)
- Integration with shipping providers
- Blockchain-based point system
- Advanced AI recommendations
- Video uploads for items
- Community challenges and events

---

**ReWear** - Making sustainable fashion accessible to everyone! 🌱👕 