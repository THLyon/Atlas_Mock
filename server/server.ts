import app from './app.ts';

console.log('Starting server.ts');

try{
    app.listen(3000, () => console.log('Server is listening on port 3000'))
} catch (error){
    console.error('Failed to start server:', error);
};
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  