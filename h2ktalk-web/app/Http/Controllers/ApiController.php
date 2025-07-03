<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\EmailNotification;
use App\Services\ChatServerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ApiController extends Controller
{
    protected $chatServerService;

    public function __construct(ChatServerService $chatServerService)
    {
        $this->chatServerService = $chatServerService;
    }
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
     * Get system diagnostics
     */
    public function systemDiagnostics()
    {
        return response()->json([
            'php_version' => phpversion(),
            'loaded_extensions' => get_loaded_extensions(),
            'pdo_drivers' => \PDO::getAvailableDrivers(),
            'sqlite_loaded' => extension_loaded('sqlite3'),
            'pdo_sqlite_loaded' => extension_loaded('pdo_sqlite'),
            'database_config' => [
                'default' => config('database.default'),
                'sqlite_database' => config('database.connections.sqlite.database')
            ]
        ]);
    }

    /**
     * Get server state for admin dashboard
     * Fetches real-time data from the Node.js chat server
     */
    public function serverState()
    {
        try {
            // Get data from chat server via internal API
            $chatServerData = $this->chatServerService->getServerState();
            
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
                'chat_server_available' => $this->chatServerService->isAvailable(),
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
            'uid as id',  // Use uid as the primary key
            'first', 
            'last', 
            'nickname', 
            'email', 
            'admin', 
            'listed', 
            'last_login', 
            'created',
            'paid1',
            'color',
            'banners'
        ])->orderBy('created', 'desc')->get();
        
        // Add computed attributes
        $users = $users->map(function($user) {
            $user->first_name = $user->first;
            $user->last_name = $user->last;
            $user->is_active = (bool) $user->listed;
            $user->created_at = $user->created;
            $user->color = $user->color ?: '000000000'; // Ensure color field exists
            $user->banners = $user->banners ?: 'yes'; // Ensure banners field exists
            return $user;
        });

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
        try {
            Log::info('Update user request', [
                'id' => $id,
                'request_data' => $request->all()
            ]);
            
            $user = User::where('uid', $id)->firstOrFail();
            
            // Map frontend field names to database field names
            $updateData = [];
            if ($request->has('first_name')) {
                $updateData['first'] = $request->first_name;
            }
            if ($request->has('last_name')) {
                $updateData['last'] = $request->last_name;
            }
            if ($request->has('nickname')) {
                $updateData['nickname'] = $request->nickname;
            }
            if ($request->has('email')) {
                $updateData['email'] = $request->email;
            }
            if ($request->has('admin')) {
                $updateData['admin'] = $request->admin;
            }
            if ($request->has('is_active')) {
                $updateData['listed'] = $request->is_active;
            }
            if ($request->has('paid1')) {
                $paidLevel = (int) $request->paid1;
                $updateData['paid1'] = $paidLevel;
                
                Log::info('Setting paid1', [
                    'old_value' => $user->paid1,
                    'new_value' => $paidLevel
                ]);
            }
            
            if ($request->has('color')) {
                $updateData['color'] = $request->color;
                Log::info('Setting manual color', [
                    'old_color' => $user->color,
                    'new_color' => $request->color
                ]);
            }
            
            if ($request->has('banners')) {
                $updateData['banners'] = $request->banners;
                Log::info('Setting manual banners', [
                    'old_banners' => $user->banners,
                    'new_banners' => $request->banners
                ]);
            }
            
            Log::info('Updating user with data', $updateData);
            Log::info('User fillable fields', $user->getFillable());
            
            // Try updating each field individually for debugging
            foreach ($updateData as $field => $value) {
                Log::info("Setting {$field} to {$value}");
                $user->{$field} = $value;
            }
            
            // Force save without Laravel's mass assignment protection
            $saved = $user->save();
            Log::info('Save result', ['saved' => $saved]);
            
            // If update failed, try direct SQL update
            if (isset($updateData['paid1'])) {
                $sqlUpdateData = [
                    'paid1' => $updateData['paid1']
                ];
                
                if (isset($updateData['color'])) {
                    $sqlUpdateData['color'] = $updateData['color'];
                }
                
                if (isset($updateData['banners'])) {
                    $sqlUpdateData['banners'] = $updateData['banners'];
                }
                
                $directUpdate = DB::table('users')
                    ->where('uid', $id)
                    ->update($sqlUpdateData);
                Log::info('Direct SQL update result', [
                    'rows_affected' => $directUpdate,
                    'update_data' => $sqlUpdateData
                ]);
            }
            
            // Refresh the user to get updated values
            $user->refresh();
            
            Log::info('User after update', [
                'paid1' => $user->paid1,
                'email' => $user->email,
                'color' => $user->color,
                'all_attributes' => $user->getAttributes()
            ]);
            
            // Double-check that color was actually updated
            if (isset($updateData['paid1'])) {
                $expectedColor = $updateData['color'] ?? 'not_set';
                $actualColor = $user->color;
                Log::info('Color update verification', [
                    'expected_color' => $expectedColor,
                    'actual_color' => $actualColor,
                    'colors_match' => $expectedColor === $actualColor
                ]);
            }

            // Notify the chat server to update in-memory user data
            try {
                $this->chatServerService->refreshUserData($id, $updateData);
            } catch (\Exception $e) {
                Log::info('Could not notify chat server of user update', ['error' => $e->getMessage()]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'user' => $user,
                'note' => 'User may need to reconnect to see changes in chat client'
            ]);
            
        } catch (\Exception $e) {
            Log::error('User update failed', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to update user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete user (admin only)
     */
    public function deleteUser($id)
    {
        $user = User::where('uid', $id)->firstOrFail();
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    }

    /**
     * Get packet logs from chat server
     */
    public function getPacketLogs(Request $request)
    {
        $filter = $request->get('filter', 'all');
        $limit = $request->get('limit', 100);
        
        $result = $this->chatServerService->getPacketLogs($filter, $limit);
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'],
                'logs' => []
            ]);
        }
        
        return response()->json($result);
    }

    /**
     * Clear packet logs
     */
    public function clearPacketLogs()
    {
        $result = $this->chatServerService->clearPacketLogs();
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error']
            ]);
        }
        
        return response()->json($result);
    }

    /**
     * Export packet logs
     */
    public function exportPacketLogs(Request $request)
    {
        $format = $request->get('format', 'json');
        $result = $this->chatServerService->exportPacketLogs($format);
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error']
            ]);
        }
        
        $filename = 'packet-logs-' . date('Y-m-d-H-i-s') . '.' . $format;
        
        return response($result['data'])
            ->header('Content-Type', $result['contentType'])
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * Get voice server statistics
     */
    public function getVoiceStats()
    {
        $result = $this->chatServerService->getVoiceStats();
        
        if (isset($result['error'])) {
            return response()->json([
                'success' => false,
                'error' => $result['error'],
                'stats' => [
                    'activeSessions' => 0,
                    'totalBandwidth' => 0,
                    'serverStatus' => 'offline'
                ]
            ]);
        }
        
        return response()->json($result);
    }

    /**
     * Get voice server logs
     */
    public function getVoiceLogs(Request $request)
    {
        $limit = $request->get('limit', 100);
        $result = $this->chatServerService->getVoiceLogs($limit);
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'],
                'logs' => []
            ]);
        }
        
        return response()->json($result);
    }

    /**
     * Mute user in voice chat
     */
    public function muteUser(Request $request)
    {
        $userId = $request->get('userId');
        $result = $this->chatServerService->muteUser($userId);
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error']
            ]);
        }
        
        return response()->json($result);
    }

    /**
     * Kick user from voice chat
     */
    public function kickUser(Request $request)
    {
        $userId = $request->get('userId');
        $result = $this->chatServerService->kickUser($userId);
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error']
            ]);
        }
        
        return response()->json($result);
    }

    /**
     * Get bot statistics
     */
    public function getBotStats()
    {
        $result = $this->chatServerService->getBotStats();
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'],
                'stats' => [
                    'activeBots' => 0,
                    'totalBots' => 0,
                    'serverStatus' => 'offline'
                ]
            ]);
        }
        
        return response()->json($result);
    }

    /**
     * Start a bot
     */
    public function startBot(Request $request)
    {
        $botConfig = $request->all();
        $result = $this->chatServerService->startBots($botConfig);
        
        return response()->json($result);
    }

    /**
     * Stop a bot
     */
    public function stopBot(Request $request)
    {
        $result = $this->chatServerService->stopBots();
        return response()->json($result);
    }

    /**
     * Restart a bot - for now, just stop and start
     */
    public function restartBot(Request $request)
    {
        // First stop all bots
        $stopResult = $this->chatServerService->stopBots();
        
        if (!$stopResult['success']) {
            return response()->json($stopResult);
        }
        
        // Wait a moment then start them again
        sleep(1);
        
        // Get default config for restart
        $config = $request->all();
        $startResult = $this->chatServerService->startBots($config);
        
        return response()->json($startResult);
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

    /**
     * Get rooms from chat server
     */
    public function getRooms()
    {
        $result = $this->chatServerService->getRooms();
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'],
                'rooms' => []
            ]);
        }
        
        return response()->json($result);
    }

    /**
     * Update room
     */
    public function updateRoom($id, Request $request)
    {
        $updateData = $request->only([
            'name', 'topic', 'category', 'type', 'voice', 'private', 
            'locked', 'closed', 'password', 'mike', 'text', 'color'
        ]);
        
        $result = $this->chatServerService->updateRoom($id, $updateData);
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error']
            ]);
        }
        
        return response()->json($result);
    }

    /**
     * Delete room
     */
    public function deleteRoom($id)
    {
        $result = $this->chatServerService->deleteRoom($id);
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error']
            ]);
        }
        
        return response()->json($result);
    }

    /**
     * Close room (kick all users and disable)
     */
    public function closeRoom($id)
    {
        $result = $this->chatServerService->closeRoom($id);
        
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error']
            ]);
        }
        
        return response()->json($result);
    }

}
