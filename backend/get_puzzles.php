<?php
require 'db.php';

try {
    $stmt = $pdo->query("SELECT id, title, image_url, grid_columns, grid_rows, created_at FROM puzzles ORDER BY id DESC");
    $puzzles = $stmt->fetchAll();

    if ($puzzles) {
        http_response_code(200);
        echo json_encode(['success' => true, 'data' => $puzzles]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No puzzles found.']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
