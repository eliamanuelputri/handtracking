<?php
require_once 'db.php';

try {
    // Cumulative Top 10 for all users
    $stmt = $pdo->query("
        SELECT 
            u.username, 
            SUM(s.score) as total_score, 
            SUM(s.time_taken) as total_time,
            COUNT(s.id) as puzzles_played
        FROM users u
        JOIN scores s ON u.id = s.user_id
        GROUP BY u.id
        ORDER BY total_score DESC, total_time ASC
        LIMIT 10
    ");

    $data = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Leaderboard error: ' . $e->getMessage()]);
}
?>
