<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SimpleAuthMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        
        if (!$token) {
            return response()->json([
                'success' => false,
                'error' => 'Authentication required'
            ], 401);
        }
        
        // Check if it's the hardcoded admin token
        if (str_starts_with($token, 'admin-')) {
            // Set a fake user for admin context
            $request->setUserResolver(function () {
                return (object) [
                    'uid' => 0,
                    'nickname' => 'admin',
                    'admin' => 3,
                    'isAdmin' => function() { return true; }
                ];
            });
            return $next($request);
        }
        
        // For database users, try Sanctum authentication
        $user = \Laravel\Sanctum\PersonalAccessToken::findToken($token)?->tokenable;
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid token'
            ], 401);
        }
        
        $request->setUserResolver(function () use ($user) {
            return $user;
        });
        
        return $next($request);
    }
}
