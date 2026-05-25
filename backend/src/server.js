const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const manuscriptRoutes = require('./routes/manuscripts');
const textRoutes = require('./routes/texts');
const teamRoutes = require('./routes/team');
const ebookRoutes = require('./routes/ebooks');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false, // For local 3D assets/external fonts if needed
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// API Routes
app.use('/api/manuscripts', manuscriptRoutes);
app.use('/api/texts', textRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/ebooks', ebookRoutes);

// Simple Status
app.get('/api/status', (req, res) => res.json({ status: 'Suvadi API is live', timestamp: new Date() }));

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Suvadi Backend listening on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('CRITICAL ERROR (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL ERROR (Unhandled Rejection):', reason);
});

process.on('exit', (code) => {
  console.log(`Backend process exiting with code: ${code}`);
});

// Heartbeat to keep event loop active
setInterval(() => {
  // console.log('Heartbeat: Server is alive');
}, 60000);
