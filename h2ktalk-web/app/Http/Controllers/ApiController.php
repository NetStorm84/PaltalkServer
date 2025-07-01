<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\EmailNotification;
use Illuminate\Http\Request;

class ApiController extends Controller
{
    /**
     * Get basic server statistics
     */
    public function stats()
    {
        $stats = [
            'server' => 'h2ktalk.fun',
            'status' => 'running',
            'timestamp' => now()->toISOString(),
            'users' => [
                'total' => User::count(),
                'active' => User::where('is_active', true)->count(),
                'admins' => User::where('admin', '>=', 2)->count()
            ],
            'notifications' => [
                'total' => EmailNotification::count(),
                'active' => EmailNotification::active()->count()
            ]
        ];

        return response()->json($stats);
    }

    /**
     * Get server state for admin dashboard
     * Fetches real-time data from the Node.js chat server
     */
    public function serverState()
    {
        try {
            // Connect to the actual Node.js server API
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $response = file_get_contents($chatServerUrl . '/api/server-state');
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            $chatServerData = json_decode($response, true);
            
            // Get comprehensive database stats
            $totalUsers = User::count();
            $activeUsers = User::where('listed', 1)->count();
            $adminUsers = User::where('admin', '>=', 2)->count();
            
            // Combine with database stats and enhance with admin-specific data
            $combinedData = array_merge($chatServerData, [
                'database' => [
                    'users_total' => $totalUsers,
                    'users_active' => $activeUsers,
                    'admins' => $adminUsers,
                    'email_notifications' => EmailNotification::active()->count()
                ],
                'chat_server_url' => $chatServerUrl,
                'timestamp' => now()->toISOString()
            ]);
            
            // Ensure we have default stats structure
            if (!isset($combinedData['stats'])) {
                $combinedData['stats'] = [
                    'onlineUsers' => 0,
                    'activeRooms' => 0,
                    'totalConnections' => 0
                ];
            }
            
            // Ensure we have server info
            if (!isset($combinedData['server'])) {
                $combinedData['server'] = [
                    'status' => 'unknown',
                    'uptime' => 'Unknown',
                    'version' => '1.0.0',
                    'port' => 5001
                ];
            }
            
            // Add performance data if available from Node.js
            if (!isset($combinedData['performance'])) {
                $combinedData['performance'] = [
                    'cpu' => 'N/A',
                    'memory' => 'N/A'
                ];
            }
            
            return response()->json($combinedData);
            
        } catch (\Exception $e) {
            // Fallback to basic info if chat server is not available
            $totalUsers = User::count();
            $activeUsers = User::where('listed', 1)->count();
            $adminUsers = User::where('admin', '>=', 2)->count();
            
            return response()->json([
                'server' => [
                    'status' => 'offline',
                    'uptime' => 'Unknown',
                    'version' => '1.0.0',
                    'port' => 5001
                ],
                'database' => [
                    'users_total' => $totalUsers,
                    'users_active' => $activeUsers,
                    'admins' => $adminUsers,
                    'email_notifications' => EmailNotification::active()->count()
                ],
                'stats' => [
                    'onlineUsers' => 0,
                    'activeRooms' => 0,
                    'totalConnections' => 0
                ],
                'users' => [],
                'rooms' => [],
                'voice' => null,
                'performance' => [
                    'cpu' => 'N/A',
                    'memory' => 'N/A'
                ],
                'timestamp' => now()->toISOString(),
                'error' => 'Chat server not available: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get all users (admin only)
     */
    public function getUsers(Request $request)
    {
        $users = User::select([
            'id', 
            'name', 
            'first_name', 
            'last_name', 
            'nickname', 
            'email', 
            'admin', 
            'is_active', 
            'last_login', 
            'created_at',
            'paid1'
        ])->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'users' => $users
        ]);
    }

    /**
     * Update user (admin only)
     */
    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        $user->update($request->only([
            'first_name',
            'last_name', 
            'nickname',
            'email',
            'admin',
            'is_active',
            'paid1'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'user' => $user
        ]);
    }

    /**
     * Delete user (admin only)
     */
    public function deleteUser($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    }

    /**
     * Get packet logs from Node.js server
     */
    public function getPacketLogs(Request $request)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $filter = $request->get('filter', 'all');
            $limit = $request->get('limit', 100);
            
            $url = $chatServerUrl . '/api/logs/packets?filter=' . urlencode($filter) . '&limit=' . $limit;
            $response = file_get_contents($url);
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Chat server not available: ' . $e->getMessage(),
                'logs' => []
            ]);
        }
    }

    /**
     * Clear packet logs
     */
    public function clearPacketLogs()
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => '{}'
                ]
            ]);
            
            $response = file_get_contents($chatServerUrl . '/api/logs/clear-packets', false, $context);
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Chat server not available: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Export packet logs
     */
    public function exportPacketLogs(Request $request)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $format = $request->get('format', 'json');
            
            $url = $chatServerUrl . '/api/logs/export-packets?format=' . urlencode($format);
            $response = file_get_contents($url);
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            $contentType = $format === 'csv' ? 'text/csv' : 'application/json';
            $filename = 'packet-logs-' . date('Y-m-d-H-i-s') . '.' . $format;
            
            return response($response)
                ->header('Content-Type', $contentType)
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Chat server not available: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get voice server statistics
     */
    public function getVoiceStats()
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $response = file_get_contents($chatServerUrl . '/api/voice/stats');
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Voice server not available: ' . $e->getMessage(),
                'stats' => [
                    'activeSessions' => 0,
                    'totalBandwidth' => 0,
                    'serverStatus' => 'offline'
                ]
            ]);
        }
    }

    /**
     * Get voice server logs
     */
    public function getVoiceLogs(Request $request)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $limit = $request->get('limit', 100);
            
            $url = $chatServerUrl . '/api/voice/logs?limit=' . $limit;
            $response = file_get_contents($url);
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Voice server not available: ' . $e->getMessage(),
                'logs' => []
            ]);
        }
    }

    /**
     * Mute user in voice chat
     */
    public function muteUser(Request $request)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $userId = $request->get('userId');
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode(['userId' => $userId])
                ]
            ]);
            
            $response = file_get_contents($chatServerUrl . '/api/voice/mute', false, $context);
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Voice server not available: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Kick user from voice chat
     */
    public function kickUser(Request $request)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $userId = $request->get('userId');
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode(['userId' => $userId])
                ]
            ]);
            
            $response = file_get_contents($chatServerUrl . '/api/voice/kick', false, $context);
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Voice server not available: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get bot statistics
     */
    public function getBotStats()
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $response = file_get_contents($chatServerUrl . '/api/bots/stats');
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Bot server not available: ' . $e->getMessage(),
                'stats' => [
                    'activeBots' => 0,
                    'totalBots' => 0,
                    'serverStatus' => 'offline'
                ]
            ]);
        }
    }

    /**
     * Start a bot
     */
    public function startBot(Request $request)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $botConfig = $request->all();
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode($botConfig)
                ]
            ]);
            
            $response = file_get_contents($chatServerUrl . '/api/bots/start', false, $context);
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Bot server not available: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Stop a bot
     */
    public function stopBot(Request $request)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $botId = $request->get('botId');
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode(['botId' => $botId])
                ]
            ]);
            
            $response = file_get_contents($chatServerUrl . '/api/bots/stop', false, $context);
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Bot server not available: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Restart a bot
     */
    public function restartBot(Request $request)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $botId = $request->get('botId');
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode(['botId' => $botId])
                ]
            ]);
            
            $response = file_get_contents($chatServerUrl . '/api/bots/restart', false, $context);
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Bot server not available: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Health check endpoint
     */
    public function health()
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toISOString(),
            'laravel_version' => app()->version(),
            'php_version' => PHP_VERSION
        ]);
    }
}
