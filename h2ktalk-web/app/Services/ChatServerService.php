<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatServerService
{
    private $internalApiUrl;
    private $timeout;

    public function __construct()
    {
        // Use internal API (localhost only)
        $this->internalApiUrl = env('CHAT_SERVER_INTERNAL_URL', 'http://127.0.0.1:5002');
        $this->timeout = 10; // 10 second timeout
    }

    /**
     * Get server state and statistics
     */
    public function getServerState()
    {
        try {
            $response = Http::timeout($this->timeout)
                ->get($this->internalApiUrl . '/internal/server-state');

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning('Failed to get server state', [
                'status' => $response->status(),
                'response' => $response->body()
            ]);

            return $this->getDefaultServerState();
        } catch (\Exception $e) {
            Log::error('Chat server connection failed', [
                'error' => $e->getMessage(),
                'url' => $this->internalApiUrl
            ]);

            return $this->getDefaultServerState();
        }
    }

    /**
     * Get bot statistics and list
     */
    public function getBotStats()
    {
        try {
            $response = Http::timeout($this->timeout)
                ->get($this->internalApiUrl . '/internal/bots/stats');

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to get bot stats'];
        } catch (\Exception $e) {
            Log::error('Failed to get bot stats', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Get list of individual bots
     */
    public function getBots()
    {
        try {
            $response = Http::timeout($this->timeout)
                ->get($this->internalApiUrl . '/internal/bots');

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to get bots'];
        } catch (\Exception $e) {
            Log::error('Failed to get bots', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Start bots with configuration
     */
    public function startBots($config)
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post($this->internalApiUrl . '/internal/bots/start', $config);

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to start bots'];
        } catch (\Exception $e) {
            Log::error('Failed to start bots', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Stop all bots
     */
    public function stopBots()
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post($this->internalApiUrl . '/internal/bots/stop');

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to stop bots'];
        } catch (\Exception $e) {
            Log::error('Failed to stop bots', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Get voice server statistics
     */
    public function getVoiceStats()
    {
        try {
            $response = Http::timeout($this->timeout)
                ->get($this->internalApiUrl . '/internal/voice/stats');

            if ($response->successful()) {
                return $response->json();
            }

            return ['error' => 'Failed to get voice stats'];
        } catch (\Exception $e) {
            Log::error('Failed to get voice stats', ['error' => $e->getMessage()]);
            return ['error' => 'Chat server unavailable'];
        }
    }

    /**
     * Get voice server logs
     */
    public function getVoiceLogs($limit = 100)
    {
        try {
            $response = Http::timeout($this->timeout)
                ->get($this->internalApiUrl . '/internal/voice/logs', ['limit' => $limit]);

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to get voice logs'];
        } catch (\Exception $e) {
            Log::error('Failed to get voice logs', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Mute user in voice chat
     */
    public function muteUser($userId)
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post($this->internalApiUrl . '/internal/voice/mute', ['userId' => $userId]);

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to mute user'];
        } catch (\Exception $e) {
            Log::error('Failed to mute user', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Kick user from voice chat
     */
    public function kickUser($userId)
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post($this->internalApiUrl . '/internal/voice/kick', ['userId' => $userId]);

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to kick user'];
        } catch (\Exception $e) {
            Log::error('Failed to kick user', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Get packet logs
     */
    public function getPacketLogs($filter = 'all', $limit = 100)
    {
        try {
            $response = Http::timeout($this->timeout)
                ->get($this->internalApiUrl . '/internal/logs/packets', [
                    'filter' => $filter,
                    'limit' => $limit
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to get packet logs'];
        } catch (\Exception $e) {
            Log::error('Failed to get packet logs', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Clear packet logs
     */
    public function clearPacketLogs()
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post($this->internalApiUrl . '/internal/logs/clear-packets');

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to clear packet logs'];
        } catch (\Exception $e) {
            Log::error('Failed to clear packet logs', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Export packet logs
     */
    public function exportPacketLogs($format = 'json')
    {
        try {
            $response = Http::timeout(30) // Longer timeout for exports
                ->get($this->internalApiUrl . '/internal/logs/export-packets', ['format' => $format]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->body(),
                    'contentType' => $format === 'csv' ? 'text/csv' : 'application/json'
                ];
            }

            return ['success' => false, 'error' => 'Failed to export packet logs'];
        } catch (\Exception $e) {
            Log::error('Failed to export packet logs', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Get room list
     */
    public function getRooms()
    {
        try {
            $response = Http::timeout($this->timeout)
                ->get($this->internalApiUrl . '/internal/rooms');

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to get rooms'];
        } catch (\Exception $e) {
            Log::error('Failed to get rooms', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Update room
     */
    public function updateRoom($roomId, $updateData)
    {
        try {
            $response = Http::timeout($this->timeout)
                ->put($this->internalApiUrl . '/internal/rooms/' . $roomId, $updateData);

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to update room'];
        } catch (\Exception $e) {
            Log::error('Failed to update room', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Delete room
     */
    public function deleteRoom($roomId)
    {
        try {
            $response = Http::timeout($this->timeout)
                ->delete($this->internalApiUrl . '/internal/rooms/' . $roomId);

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to delete room'];
        } catch (\Exception $e) {
            Log::error('Failed to delete room', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Close room (kick all users and disable)
     */
    public function closeRoom($roomId)
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post($this->internalApiUrl . '/internal/rooms/' . $roomId . '/close');

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to close room'];
        } catch (\Exception $e) {
            Log::error('Failed to close room', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Notify chat server of user data refresh
     */
    public function refreshUserData($userId, $updateData)
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post($this->internalApiUrl . '/internal/admin/refresh-user', [
                    'action' => 'refresh_user_data',
                    'userId' => $userId,
                    'updateData' => $updateData
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'error' => 'Failed to refresh user data'];
        } catch (\Exception $e) {
            Log::error('Failed to refresh user data', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Chat server unavailable'];
        }
    }

    /**
     * Check if chat server is available
     */
    public function isAvailable()
    {
        try {
            $response = Http::timeout(5)
                ->get($this->internalApiUrl . '/internal/health');

            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get default server state when chat server is unavailable
     */
    private function getDefaultServerState()
    {
        return [
            'stats' => [
                'onlineUsers' => 0,
                'activeRooms' => 0,
                'totalConnections' => 0,
                'uptime' => 0
            ],
            'users' => [],
            'rooms' => [],
            'timestamp' => now()->toISOString(),
            'error' => 'Chat server unavailable'
        ];
    }
}
