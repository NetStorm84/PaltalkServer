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
     * This would normally connect to the chat server for real-time data
     */
    public function serverState()
    {
        // Since we don't have direct access to the Node.js chat server from Laravel,
        // we'll return basic info and let the frontend make additional requests to the chat server
        return response()->json([
            'server' => [
                'status' => 'running',
                'uptime' => time(),
                'version' => '1.0.0'
            ],
            'database' => [
                'users_total' => User::count(),
                'users_active' => User::where('is_active', true)->count(),
                'email_notifications' => EmailNotification::active()->count()
            ],
            'chat_server' => [
                'status' => 'Check Node.js server directly',
                'port' => 5001,
                'voice_port' => 2090
            ],
            'message' => 'For real-time chat data, connect to the Node.js chat server on port 5001'
        ]);
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
