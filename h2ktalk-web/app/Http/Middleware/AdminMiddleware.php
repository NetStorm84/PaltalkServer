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
        if (!$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => 'Admin access required'
            ], 403);
        }

        return $next($request);
    }
}
