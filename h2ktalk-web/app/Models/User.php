<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The primary key for the model.
     */
    protected $primaryKey = 'uid';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'nickname',
        'email', 
        'first',
        'last',
        'password',
        'admin',
        'privacy',
        'verified',
        'paid1',
        'listed',
        'color'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'verified' => 'boolean',
            'listed' => 'boolean',
            'created' => 'datetime',
            'last_login' => 'datetime',
        ];
    }

    /**
     * Get the user's full name
     */
    public function getNameAttribute(): string
    {
        return $this->first . ' ' . $this->last;
    }

    /**
     * Get first name (alias for 'first' field)
     */
    public function getFirstNameAttribute(): string
    {
        return $this->first;
    }

    /**
     * Get last name (alias for 'last' field)  
     */
    public function getLastNameAttribute(): string
    {
        return $this->last;
    }

    /**
     * Check if user is active (based on 'listed' field)
     */
    public function getIsActiveAttribute(): bool
    {
        return (bool) $this->listed;
    }

    /**
     * Check if user has paid account
     */
    public function getIsPaidAttribute(): bool
    {
        return $this->paid1 === 'Y' || $this->paid1 === '6' || $this->paid1 === 'E';
    }

    /**
     * Check if user is admin (level 2 or higher)
     */
    public function isAdmin(): bool
    {
        return $this->admin >= 2;
    }

    /**
     * Check if user is super admin (level 3)
     */
    public function isSuperAdmin(): bool
    {
        return $this->admin >= 3;
    }

    /**
     * Check if user account is locked out (not implemented in existing schema)
     */
    public function isLockedOut(): bool
    {
        return false; // Not implemented in existing database
    }
}
