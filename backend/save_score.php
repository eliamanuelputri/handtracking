<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $playerName = $data['player_name'] ?? '';
    $puzzleId = $data['puzzle_id'] ?? 0;
    $score = $data['score'] ?? 0;
    $timeTaken = $data['time_taken'] ?? 0;

    if (empty($playerName) || empty($puzzleId)) {
        echo json_encode(['success' => false, 'message' => 'Missing data']);
        exit;
    }

    try {
        // 1. Get or create user
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$playerName]);
        $user = $stmt->fetch();

        if (!$user) {
            $tempPass = password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
            $stmt->execute([$playerName, $tempPass]);
            $userId = $pdo->lastInsertId();
        } else {
            $userId = $user['id'];
        }

        // 2. Insert score
        $stmt = $pdo->prepare("INSERT INTO scores (user_id, puzzle_id, score, time_taken) VALUES (?, ?, ?, ?)");
        if ($stmt->execute([$userId, (int)$puzzleId, (int)$score, (int)$timeTaken])) {
            echo json_encode(['success' => true, 'message' => 'Score saved successfully']);
        } else {
            $errorInfo = $stmt->errorInfo();
            echo json_encode(['success' => false, 'message' => 'Score insertion failed: ' . ($errorInfo[2] ?? 'Unknown error')]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
}
?>
