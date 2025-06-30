<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Since we don't have access to the actual server state in PHP,
// we'll return basic info and let the frontend handle connecting to the actual server
echo json_encode([
    'server' => [
        'status' => 'running',
        'uptime' => time(),
        'version' => '1.0'
    ],
    'users' => [
        'online' => 0,
        'total' => 0
    ],
    'rooms' => [
        'active' => 0,
        'total' => 0
    ],
    'message' => 'Connect to chat server for real-time data'
]);
?>