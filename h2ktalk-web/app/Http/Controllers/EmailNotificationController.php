<?php

namespace App\Http\Controllers;

use App\Models\EmailNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmailNotificationController extends Controller
{
    /**
     * Sign up for email notifications
     */
    public function signup(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|unique:email_notifications,email'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors()->first()
            ], 400);
        }

        try {
            EmailNotification::create([
                'email' => $request->email,
                'status' => 'active',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Email notification signup successful! You\'ll be notified when we have updates.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Signup failed. Please try again.'
            ], 500);
        }
    }

    /**
     * Get all active email notifications (admin only)
     */
    public function index()
    {
        $notifications = EmailNotification::active()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'notifications' => $notifications
        ]);
    }

    /**
     * Unsubscribe from email notifications
     */
    public function unsubscribe(Request $request)
    {
        $email = $request->input('email');
        
        if (!$email) {
            return response()->json([
                'success' => false,
                'error' => 'Email required'
            ], 400);
        }

        EmailNotification::where('email', $email)
            ->update(['status' => 'unsubscribed']);

        return response()->json([
            'success' => true,
            'message' => 'Successfully unsubscribed from notifications'
        ]);
    }
}
