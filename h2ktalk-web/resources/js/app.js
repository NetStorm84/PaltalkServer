import './bootstrap';
import socketClient from './socket-client';

// Make socket client available globally for admin pages
window.socketClient = socketClient;
