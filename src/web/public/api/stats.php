<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'server' => 'h2ktalk.fun',
    'status' => 'running',
    'timestamp' => date('c')
]);
?>