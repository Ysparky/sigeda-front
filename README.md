# SIGEDA Frontend

Sistema de Gestión de Evaluaciones y Desempeño Académico (SIGEDA) - Frontend Application

## Description

SIGEDA is a web application designed to manage academic evaluations and performance tracking. Built with React, TypeScript, and Tailwind CSS, it provides a modern interface for handling student evaluations, grades, and academic progress.

## Technologies

- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router DOM

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-org/sigeda-front.git
cd sigeda-front
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```env
VITE_API_URL=https://your-api-url
```

4. Start the development server:

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/     # Reusable components
├── contexts/       # React contexts
├── hooks/         # Custom hooks
├── pages/         # Page components
├── services/      # API services
└── types/         # TypeScript types
```

## Features

- User authentication
- Academic module management
- Evaluation tracking
- Performance metrics
- Responsive design

## Development

- Use `npm run lint` to check for linting issues
- Follow the existing code style and component patterns
- Keep components small and focused
