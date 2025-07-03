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
            \Log::info('Update user request', [
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
                
                \Log::info('Setting paid1', [
                    'old_value' => $user->paid1,
                    'new_value' => $paidLevel
                ]);
            }
            
            if ($request->has('color')) {
                $updateData['color'] = $request->color;
                \Log::info('Setting manual color', [
                    'old_color' => $user->color,
                    'new_color' => $request->color
                ]);
            }
            
            if ($request->has('banners')) {
                $updateData['banners'] = $request->banners;
                \Log::info('Setting manual banners', [
                    'old_banners' => $user->banners,
                    'new_banners' => $request->banners
                ]);
            }
            
            \Log::info('Updating user with data', $updateData);
            \Log::info('User fillable fields', $user->getFillable());
            
            // Try updating each field individually for debugging
            foreach ($updateData as $field => $value) {
                \Log::info("Setting {$field} to {$value}");
                $user->{$field} = $value;
            }
            
            // Force save without Laravel's mass assignment protection
            $saved = $user->save();
            \Log::info('Save result', ['saved' => $saved]);
            
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
                
                $directUpdate = \DB::table('users')
                    ->where('uid', $id)
                    ->update($sqlUpdateData);
                \Log::info('Direct SQL update result', [
                    'rows_affected' => $directUpdate,
                    'update_data' => $sqlUpdateData
                ]);
            }
            
            // Refresh the user to get updated values
            $user->refresh();
            
            \Log::info('User after update', [
                'paid1' => $user->paid1,
                'email' => $user->email,
                'color' => $user->color,
                'all_attributes' => $user->getAttributes()
            ]);
            
            // Double-check that color was actually updated
            if (isset($updateData['paid1'])) {
                $expectedColor = $updateData['color'] ?? 'not_set';
                $actualColor = $user->color;
                \Log::info('Color update verification', [
                    'expected_color' => $expectedColor,
                    'actual_color' => $actualColor,
                    'colors_match' => $expectedColor === $actualColor
                ]);
            }

            // Notify the chat server to update in-memory user data
            try {
                $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
                $notifyData = [
                    'action' => 'refresh_user_data',
                    'userId' => $id,
                    'updateData' => $updateData
                ];
                
                $context = stream_context_create([
                    'http' => [
                        'method' => 'POST',
                        'header' => 'Content-Type: application/json',
                        'content' => json_encode($notifyData),
                        'timeout' => 5
                    ]
                ]);
                
                // Try to notify chat server (don't fail if server is offline)
                @file_get_contents($chatServerUrl . '/api/admin/refresh-user', false, $context);
                
            } catch (\Exception $e) {
                \Log::info('Could not notify chat server of user update', ['error' => $e->getMessage()]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'user' => $user,
                'note' => 'User may need to reconnect to see changes in chat client'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('User update failed', [
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
            
            // Use cURL for better control over headers
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $chatServerUrl . '/api/logs/clear-packets');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Bearer admin-temp-token', // Use a proper admin token
                'X-Admin-Access: true' // Additional admin header
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response, $httpCode)->header('Content-Type', 'application/json');
            
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

    /**
     * Get rooms from Node.js server
     */
    public function getRooms()
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $response = file_get_contents($chatServerUrl . '/api/rooms');
            
            if ($response === false) {
                throw new \Exception('Failed to connect to chat server');
            }
            
            return response($response)->header('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Chat server not available: ' . $e->getMessage(),
                'rooms' => []
            ]);
        }
    }

    /**
     * Update room
     */
    public function updateRoom($id, Request $request)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            
            $updateData = $request->only(['name', 'description', 'maxUsers', 'password', 'isPrivate']);
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'PUT',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode($updateData),
                    'timeout' => 10
                ]
            ]);
            
            $response = file_get_contents($chatServerUrl . '/api/rooms/' . $id, false, $context);
            
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
     * Delete room
     */
    public function deleteRoom($id)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'DELETE',
                    'timeout' => 10
                ]
            ]);
            
            $response = file_get_contents($chatServerUrl . '/api/rooms/' . $id, false, $context);
            
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
     * Close room (kick all users and disable)
     */
    public function closeRoom($id)
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'timeout' => 10
                ]
            ]);
            
            $response = file_get_contents($chatServerUrl . '/api/rooms/' . $id . '/close', false, $context);
            
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
     * Start chat server
     */
    public function startServer()
    {
        try {
            // Check if server is already running
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $response = @file_get_contents($chatServerUrl . '/api/server-state');
            
            if ($response !== false) {
                return response()->json([
                    'success' => true,
                    'message' => 'Server is already running',
                    'status' => 'running'
                ]);
            }
            
            // Start the server using PM2 for process management
            $serverPath = env('CHAT_SERVER_PATH', '/Users/dan/Documents/Sites/serv');
            
            // Ensure logs directory exists
            $logDir = storage_path('logs');
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
            
            // Check if PM2 is available
            $pm2Check = shell_exec('which pm2 2>/dev/null');
            
            if (!empty($pm2Check)) {
                // Ensure dependencies are installed and start the server
                $installCommand = "cd {$serverPath} && npm install 2>&1";
                $installOutput = shell_exec($installCommand);
                
                // Stop any existing PM2 process with the same name first
                shell_exec('pm2 delete h2ktalk-server 2>/dev/null');
                
                // Try using the existing start script first
                if (file_exists($serverPath . '/start.sh')) {
                    // Make start.sh executable and use PM2 to run it
                    shell_exec("chmod +x {$serverPath}/start.sh");
                    $command = "cd {$serverPath} && pm2 start --name h2ktalk-server --interpreter bash start.sh 2>&1";
                } else {
                    // Use PM2 to start the server with npm
                    $command = "cd {$serverPath} && pm2 start --name h2ktalk-server npm -- start 2>&1";
                }
                $output = shell_exec($command);
                
                // Also check PM2 status
                $pm2Status = shell_exec('pm2 list 2>&1');
                
                // Give the server a moment to start
                sleep(5);
                
                // Check if web interface started successfully (port 3000)
                $response = @file_get_contents($chatServerUrl . '/api/health');
                
                // Also check if chat server is listening on port 5001
                $chatServerCheck = @fsockopen('localhost', 5001, $errno, $errstr, 1);
                $chatServerRunning = $chatServerCheck !== false;
                if ($chatServerCheck) fclose($chatServerCheck);
                
                if ($response !== false || $chatServerRunning) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Server started successfully with PM2',
                        'status' => 'running',
                        'output' => $output,
                        'pm2Status' => $pm2Status,
                        'installOutput' => $installOutput,
                        'webInterface' => $response !== false,
                        'chatServer' => $chatServerRunning,
                        'ports' => ['web' => 3000, 'chat' => 5001]
                    ]);
                } else {
                    return response()->json([
                        'success' => false,
                        'error' => 'Server failed to start properly with PM2',
                        'output' => $output,
                        'pm2Status' => $pm2Status,
                        'installOutput' => $installOutput,
                        'serverPath' => $serverPath,
                        'healthUrl' => $chatServerUrl . '/api/health',
                        'webInterface' => $response !== false,
                        'chatServer' => $chatServerRunning,
                        'chatServerError' => $errno . ': ' . $errstr
                    ], 500);
                }
            } else {
                // Fallback: start server directly with nohup
                $logFile = storage_path('logs/chat-server.log');
                $command = "cd {$serverPath} && nohup npm start > {$logFile} 2>&1 & echo $!";
                $pid = shell_exec($command);
                
                // Give the server a moment to start
                sleep(3);
                
                // Check if server started successfully
                $response = @file_get_contents($chatServerUrl . '/api/health');
                
                if ($response !== false) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Server started successfully (background process)',
                        'status' => 'running',
                        'pid' => trim($pid)
                    ]);
                } else {
                    return response()->json([
                        'success' => false,
                        'error' => 'Server failed to start properly',
                        'serverPath' => $serverPath,
                        'logFile' => $logFile,
                        'pid' => trim($pid)
                    ], 500);
                }
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to start server: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Stop chat server
     */
    public function stopServer()
    {
        try {
            // Use PM2 to stop the server
            $command = "pm2 stop h2ktalk-server 2>&1";
            $output = shell_exec($command);
            
            // Give the server a moment to stop
            sleep(1);
            
            // Check if server stopped
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $response = @file_get_contents($chatServerUrl . '/api/server-state');
            
            if ($response === false) {
                return response()->json([
                    'success' => true,
                    'message' => 'Server stopped successfully',
                    'status' => 'stopped',
                    'output' => $output
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Server failed to stop properly',
                    'output' => $output
                ], 500);
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to stop server: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get server status
     */
    public function getServerStatus()
    {
        try {
            $chatServerUrl = env('CHAT_SERVER_URL', 'http://localhost:3000');
            $response = @file_get_contents($chatServerUrl . '/api/health');
            
            if ($response !== false) {
                $data = json_decode($response, true);
                return response()->json([
                    'success' => true,
                    'status' => 'running',
                    'health' => $data
                ]);
            } else {
                // Check PM2 status
                $pm2Status = shell_exec('pm2 jlist 2>/dev/null | grep h2ktalk-server');
                $isInPm2 = !empty($pm2Status);
                
                return response()->json([
                    'success' => true,
                    'status' => 'stopped',
                    'pm2_managed' => $isInPm2
                ]);
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to check server status: ' . $e->getMessage(),
                'status' => 'unknown'
            ]);
        }
    }
}
