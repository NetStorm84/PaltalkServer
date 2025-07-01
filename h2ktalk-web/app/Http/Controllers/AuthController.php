<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class AuthController extends Controller
{
    /**
     * Handle admin login
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors()->first()
            ], 400);
        }

        $username = $request->username;
        $password = $request->password;

        // Check hardcoded dashboard admin first
        if ($username === 'admin' && $password === 'password123') {
            // Create a temporary admin user for session
            session(['admin_user' => [
                'uid' => 0,
                'nickname' => 'admin',
                'first' => 'Dashboard',
                'last' => 'Admin',
                'admin' => 3,
                'is_active' => true
            ]]);
            
            // Create a token manually (since we can't use Sanctum with non-database user)
            $token = 'admin-' . bin2hex(random_bytes(32));

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => 0,
                    'username' => 'admin',
                    'nickname' => 'Dashboard Admin',
                    'admin' => 3
                ],
                'token' => $token
            ]);
        }

        // Check database users
        $user = User::where('nickname', $username)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid credentials'
            ], 401);
        }

        // Check if account is locked out
        if ($user->isLockedOut()) {
            return response()->json([
                'success' => false,
                'error' => 'Account is temporarily locked. Please try again later.'
            ], 423);
        }

        // Check password
        if (!Hash::check($password, $user->password)) {
            // Increment failed attempts
            $user->increment('failed_attempts');
            
            // Lock account after 5 failed attempts
            if ($user->failed_attempts >= 5) {
                $user->update([
                    'lockout_until' => Carbon::now()->addMinutes(15)
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Invalid credentials'
            ], 401);
        }

        // Check if user has admin privileges
        if (!$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => 'Admin access required'
            ], 403);
        }

        // Check if account is active
        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'error' => 'Account is disabled'
            ], 403);
        }

        // Successful login - reset failed attempts and update last login
        $user->update([
            'failed_attempts' => 0,
            'lockout_until' => null,
            'last_login' => Carbon::now()
        ]);

        // Create Sanctum token
        $token = $user->createToken('admin-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'username' => $user->nickname,
                'nickname' => $user->nickname,
                'admin' => $user->admin,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name
            ],
            'token' => $token
        ]);
    }

    /**
     * Handle logout
     */
    public function logout(Request $request)
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }
}
