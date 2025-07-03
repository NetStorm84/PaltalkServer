<?php

namespace App\Http\Controllers;

use App\Services\ChatServerService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StreamController extends Controller
{
    protected $chatServerService;

    public function __construct(ChatServerService $chatServerService)
    {
        $this->chatServerService = $chatServerService;
    }

    /**
     * Server-Sent Events stream for real-time dashboard updates
     */
    public function dashboardStream(Request $request)
    {
        // Check authentication - SSE can't send headers, so check token from query param
        $token = $request->query('token') ?: $request->bearerToken();
        
        if (!$token) {
            return response()->json(['error' => 'No token provided'], 401);
        }
        
        // Verify token (same logic as middleware)
        $authenticated = false;
        if (str_starts_with($token, 'admin-')) {
            $authenticated = true;
        } else {
            $user = \Laravel\Sanctum\PersonalAccessToken::findToken($token)?->tokenable;
            if ($user && isset($user->admin) && $user->admin >= 2) {
                $authenticated = true;
            }
        }
        
        if (!$authenticated) {
            return response()->json(['error' => 'Invalid token'], 403);
        }
        
        $response = new StreamedResponse();
        
        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no'); // Disable nginx buffering
        
        $response->setCallback(function () {
            $lastUpdate = 0;
            $updateInterval = 5; // Update every 5 seconds
            
            while (true) {
                $currentTime = time();
                
                if ($currentTime - $lastUpdate >= $updateInterval) {
                    try {
                        // Get server state
                        $serverData = $this->chatServerService->getServerState();
                        
                        // Get rooms data
                        $roomsData = $this->chatServerService->getRooms();
                        
                        // Combine data
                        $data = [
                            'type' => 'dashboard_update',
                            'timestamp' => now()->toISOString(),
                            'server' => $serverData,
                            'rooms' => $roomsData,
                        ];
                        
                        echo "data: " . json_encode($data) . "\n\n";
                        
                        if (ob_get_level()) {
                            ob_flush();
                        }
                        flush();
                        
                        $lastUpdate = $currentTime;
                        
                    } catch (\Exception $e) {
                        echo "data: " . json_encode([
                            'type' => 'error',
                            'message' => 'Failed to fetch server data',
                            'timestamp' => now()->toISOString()
                        ]) . "\n\n";
                        
                        if (ob_get_level()) {
                            ob_flush();
                        }
                        flush();
                    }
                }
                
                // Short sleep to prevent excessive CPU usage
                usleep(100000); // 0.1 seconds
                
                // Check if client disconnected
                if (connection_aborted()) {
                    break;
                }
            }
        });
        
        return $response;
    }
}
