<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class RegistrationController extends Controller
{
    /**
     * Handle user registration
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:32',
            'last_name' => 'required|string|max:32',
            'nickname' => [
                'required',
                'string',
                'min:5',
                'max:32',
                'unique:users,nickname',
                'regex:/^[a-zA-Z0-9_-]+$/',
                function ($attribute, $value, $fail) {
                    $blacklisted = ['admin', 'co-admin', 'coadmin', 'paltalk', 'support', 'palsupport'];
                    $nickname = strtolower($value);
                    
                    foreach ($blacklisted as $word) {
                        if (strpos($nickname, $word) !== false) {
                            $fail("Nickname cannot contain the word \"{$word}\".");
                            return;
                        }
                    }
                    
                    if (strpos($value, '(') !== false || strpos($value, ')') !== false) {
                        $fail('Nickname cannot contain brackets ( ).');
                    }
                },
            ],
            'email' => 'nullable|email|max:255|unique:users,email',
            'password' => 'required|string|min:6|max:64',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors()->first()
            ], 400);
        }

        try {
            $user = User::create([
                'nickname' => $request->nickname,
                'email' => $request->email ?: '',
                'first' => $request->first_name,
                'last' => $request->last_name,
                'password' => Hash::make($request->password),
                'admin' => 0,
                'privacy' => 'A',
                'verified' => false,
                'paid1' => 0, // Use integer instead of string
                'listed' => 1,
                'color' => '000000000'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Registration successful! You can now log in.',
                'user' => [
                    'id' => $user->uid,
                    'nickname' => $user->nickname,
                    'first_name' => $user->first,
                    'last_name' => $user->last,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Registration failed. Please try again.'
            ], 500);
        }
    }

    /**
     * Check if nickname is available
     */
    public function checkNickname(Request $request)
    {
        $nickname = $request->input('nickname');
        
        if (!$nickname) {
            return response()->json([
                'error' => 'Nickname required'
            ], 400);
        }

        $exists = User::where('nickname', $nickname)->exists();

        return response()->json([
            'exists' => $exists
        ]);
    }
}
