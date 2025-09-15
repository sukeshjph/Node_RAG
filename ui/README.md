# RAG Chat UI

A modern Angular application for intelligent document search and chat interface using RAG (Retrieval-Augmented Generation) technology.

## 🚀 Features

- **Chat Interface**: Real-time chat with AI-powered responses
- **Document Upload**: Drag and drop file upload with progress tracking
- **Azure Integration**: Seamless integration with Azure Storage and Cognitive Search
- **Responsive Design**: Mobile-first responsive design with Angular Material
- **Dark Theme**: Built-in dark/light theme switching
- **Real-time Updates**: Live typing indicators and progress tracking
- **Error Handling**: Comprehensive error handling and user feedback

## 🏗️ Architecture

The application is built with Angular 16 and follows modern Angular best practices:

- **Standalone Components**: Uses the new standalone component architecture
- **Reactive Forms**: Form handling with Angular Reactive Forms
- **RxJS**: Asynchronous data handling with reactive programming
- **Angular Material**: Modern UI components and theming
- **TypeScript**: Full type safety and modern JavaScript features

## 📁 Project Structure

```
ui/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── chat/           # Chat interface component
│   │   │   └── upload/         # File upload component
│   │   ├── services/
│   │   │   ├── chat.service.ts # Chat API service
│   │   │   └── upload.service.ts # Upload service
│   │   ├── models/
│   │   │   ├── chat.model.ts   # Chat data models
│   │   │   └── upload.model.ts # Upload data models
│   │   ├── app.component.*     # Root component
│   │   ├── app.module.ts       # Root module
│   │   └── app-routing.module.ts # Routing configuration
│   ├── environments/
│   │   ├── environment.ts      # Development environment
│   │   └── environment.prod.ts # Production environment
│   ├── assets/                 # Static assets
│   ├── styles.scss            # Global styles
│   ├── index.html             # Main HTML file
│   └── main.ts                # Application entry point
├── package.json               # Dependencies and scripts
├── angular.json              # Angular CLI configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## 🛠️ Installation

1. **Navigate to the UI directory:**
   ```bash
   cd ui
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp src/environments/environment.ts src/environments/environment.local.ts
   # Edit environment.local.ts with your configuration
   ```

4. **Start development server:**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Create `src/environments/environment.local.ts`:

```typescript
export const environment = {
  production: false,
  
  // API Configuration
  apiBaseUrl: 'http://localhost:3000',
  apiUploadUrl: 'http://localhost:3000/upload',
  sasTokenApi: 'http://localhost:3000/sas-token',
  
  // Azure Storage Configuration
  storageContainerName: 'docs-input',
  storageAccountName: 'your-storage-account',
  storageAccountKey: 'your-storage-key',
  
  // Application Settings
  appName: 'RAG Chat UI',
  appVersion: '1.0.0',
  
  // Feature Flags
  enableDragDrop: true,
  enableMarkdown: true,
  enableFilePreview: true,
  
  // Upload Settings
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['.txt', '.pdf'],
  
  // Chat Settings
  maxChatHistory: 50,
  enableTypingIndicator: true,
  
  // UI Settings
  theme: 'light',
  primaryColor: '#1976d2',
  accentColor: '#ff4081',
};
```

## 🚀 Usage

### Development

Start the development server with hot reload:

```bash
npm start
```

The application will be available at `http://localhost:4200`.

### Production

Build and serve the production application:

```bash
npm run build:prod
npm run serve:prod
```

### Testing

Run unit tests:

```bash
npm test
```

Run end-to-end tests:

```bash
npm run e2e
```

## 🔧 Development

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for development
- `npm run build:prod` - Build for production
- `npm run serve:prod` - Serve production build
- `npm test` - Run unit tests
- `npm run e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint

### Code Quality

The project includes:
- **TypeScript** with strict type checking
- **ESLint** for code linting
- **Prettier** for code formatting
- **Angular Material** for consistent UI
- **Responsive design** with mobile-first approach

## 🎨 UI Components

### Chat Component

- Real-time message display
- Typing indicators
- Message history with scroll
- Citation display
- Error handling
- Copy to clipboard functionality

### Upload Component

- Drag and drop file upload
- File validation and preview
- Upload progress tracking
- Multiple file support
- Error handling and retry
- Azure Storage integration

## 🔗 Integration

### Backend API

The UI integrates with the RAG Query Service API:

- **POST /query** - Send chat queries
- **GET /health** - Health check
- **GET /info** - Service information

### Azure Services

- **Azure Storage** - File upload and storage
- **Azure Cognitive Search** - Document search
- **Azure OpenAI** - AI-powered responses

## 📱 Responsive Design

The application is fully responsive and works on:

- Desktop computers
- Tablets
- Mobile phones
- Various screen sizes and orientations

## 🌙 Theming

The application supports both light and dark themes:

- Automatic theme detection
- Manual theme switching
- Persistent theme preference
- Smooth theme transitions

## ♿ Accessibility

The application includes accessibility features:

- Keyboard navigation
- Screen reader support
- High contrast mode support
- Focus management
- ARIA labels and descriptions

## 🚀 Deployment

### Build for Production

```bash
npm run build:prod
```

### Deploy to Azure Static Web Apps

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy dist/rag-chat-ui
```

### Deploy to Other Platforms

The built application can be deployed to any static hosting service:

- Azure Static Web Apps
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Angular Documentation](https://angular.io/docs)
- [Angular Material](https://material.angular.io/)
- [Azure Storage Documentation](https://learn.microsoft.com/en-us/azure/storage/)
- [Azure Cognitive Search](https://learn.microsoft.com/en-us/azure/search/)
- [Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
