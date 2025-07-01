<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Authentication required'
            ], 401);
        }

        // Check if user has admin privileges (level 2 or higher)
        $isAdmin = false;
        if (is_object($user) && isset($user->admin)) {
            $isAdmin = $user->admin >= 2;
        } elseif (is_object($user) && method_exists($user, 'isAdmin')) {
            $isAdmin = $user->isAdmin();
        }
        
        if (!$isAdmin) {
            return response()->json([
                'success' => false,
                'error' => 'Admin access required'
            ], 403);
        }

        return $next($request);
    }
}
