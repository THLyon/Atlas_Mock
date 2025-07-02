import app from './app.ts';
import { ensureTextIndexOnChunks } from './models/mongoModel.ts';

console.log('Starting server.ts');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);

  // safely invoke async logic
  ensureTextIndexOnChunks()
    .then(() => {
      console.log('[Startup] ✅ Text index ensured on MongoDB');
    })
    .catch((err) => {
      console.error('[Startup Error] Failed to ensure text index:', err);
    });
});
