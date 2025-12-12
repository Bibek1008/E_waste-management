# E-Waste Management System

A comprehensive Next.js web application for managing electronic waste collection and disposal with role-based access for residents, collectors, and administrators.

![E-Waste Management](https://img.shields.io/badge/Next.js-16.0.10-black?logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0+-06B6D4?logo=tailwindcss)

## 🌟 Features

### 👥 Multi-Role Dashboard

- **Residents**: Schedule e-waste pickups, track status, manage items
- **Collectors**: View assigned pickups, accept/complete requests
- **Administrators**: Analytics, user management, system overview

### 📱 Modern UI/UX

- Responsive design with glassmorphism effects
- Real-time loading states and user feedback
- Professional gradient backgrounds
- Mobile-optimized interface

### 🔐 Authentication System

- JWT-based secure authentication
- Password reset functionality with email codes
- Role-based access control
- Session management

### 📦 Smart Item Management

- Pre-defined e-waste categories (Electronics, Appliances, Batteries, etc.)
- Custom "Other Items" section for unlisted items
- Quantity tracking for accurate analytics
- Hazard level classification

### ⚡ Advanced Features

- **Urgency Levels**: Low, Standard, Medium, High priority pickups
- **Real-time Analytics**: Track pickup statistics and item counts
- **Status Tracking**: Pending → Assigned → In Progress → Completed
- **Automatic Notifications**: Success messages with auto-dismiss
- **Double-click Prevention**: Loading states prevent duplicate submissions

## 🚀 Tech Stack

- **Frontend**: Next.js 16.0.10 with Turbopack
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: TailwindCSS with custom components
- **Authentication**: JWT with bcryptjs hashing
- **Deployment**: Ready for Vercel/Netlify

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Git for version control

## ⚙️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Bibek1008/E_waste-management.git
   cd E_waste-management
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your database credentials:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/ewaste_db"
   JWT_SECRET="your-super-secure-jwt-secret-key"
   ```

4. **Set up the database**

   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Seed the database (optional)**

   ```bash
   npx prisma db seed
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### Core Models

- **User**: Residents, Collectors, Admins with authentication
- **PickupRequest**: Waste collection requests with urgency levels
- **PickupItem**: Individual items with quantities and categories
- **ItemCategory**: E-waste categories with hazard levels
- **DropoffLocation**: Collection centers and disposal sites

### Key Relationships

- Users can create multiple pickup requests (1:many)
- Collectors can be assigned multiple pickups (1:many)
- Pickup requests contain multiple items (1:many)
- Items belong to categories (many:1)

## 🎯 Usage

### For Residents

1. **Register/Login** with your credentials
2. **Schedule Pickup**: Select items, quantities, and urgency level
3. **Track Status**: Monitor pickup progress in real-time
4. **View History**: See completed and active requests

### For Collectors

1. **Login** with collector credentials
2. **View Assignments**: See available pickup requests
3. **Accept Pickups**: Claim requests to collect
4. **Update Status**: Mark pickups as in-progress/completed

### For Administrators

1. **Dashboard Overview**: View system-wide analytics
2. **User Management**: Monitor residents and collectors
3. **Analytics**: Track pickup trends and item statistics

## 🛠️ API Endpoints

| Endpoint                 | Method   | Description          |
| ------------------------ | -------- | -------------------- |
| `/api/auth/register`     | POST     | User registration    |
| `/api/auth/login`        | POST     | User authentication  |
| `/api/auth/me`           | GET      | Current user info    |
| `/api/pickups`           | GET/POST | Pickup requests CRUD |
| `/api/pickups/[id]`      | PATCH    | Update pickup status |
| `/api/items`             | GET      | Item categories      |
| `/api/analytics/summary` | GET      | System analytics     |
| `/api/users`             | GET      | User management      |
| `/api/locations`         | GET      | Dropoff locations    |

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Database Management

```bash
npx prisma studio              # Open database browser
npx prisma migrate dev         # Create new migration
npx prisma generate           # Regenerate Prisma client
npx prisma db push           # Push schema changes
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy automatically

### Manual Deployment

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma for the excellent ORM
- TailwindCSS for beautiful styling
- Vercel for seamless deployment

## 📞 Support

For support, email bibek@example.com or create an issue in the GitHub repository.

---

**Built with ❤️ for a sustainable future**
