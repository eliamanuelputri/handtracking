<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = $_POST['title'] ?? 'Untitled Puzzle';
    $columns = isset($_POST['columns']) ? (int)$_POST['columns'] : 3;
    $rows = isset($_POST['rows']) ? (int)$_POST['rows'] : 3;

    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No image uploaded or upload error.']);
        exit;
    }

    $uploadDir = '../uploads/';
    $fileInfo = pathinfo($_FILES['image']['name']);
    $extension = strtolower($fileInfo['extension']);
    
    $allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
    if (!in_array($extension, $allowedExts)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid image format.']);
        exit;
    }

    $newFileName = uniqid('puzzle_') . '.' . $extension;
    $targetPath = $uploadDir . $newFileName;

    if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
        // Insert into database
        $stmt = $pdo->prepare("INSERT INTO puzzles (title, image_url, grid_columns, grid_rows) VALUES (?, ?, ?, ?)");
        if ($stmt->execute([$title, 'uploads/' . $newFileName, $columns, $rows])) {
            $puzzleId = $pdo->lastInsertId();
            
            try {
                $stmtPiece = $pdo->prepare("INSERT INTO puzzle_pieces (puzzle_id, piece_index, correct_x, correct_y, current_x, current_y) VALUES (?, ?, ?, ?, ?, ?)");
                $index = 0;
                for ($r = 0; $r < $rows; $r++) {
                    for ($c = 0; $c < $columns; $c++) {
                        $stmtPiece->execute([$puzzleId, $index, $c, $r, rand(0, 100), rand(0, 100)]);
                        $index++;
                    }
                }
                echo json_encode([
                    'success' => true, 
                    'message' => 'Puzzle uploaded successfully',
                    'puzzle_id' => $puzzleId
                ]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Piece generation failed: ' . $e->getMessage()]);
            }
        } else {
            $errorInfo = $stmt->errorInfo();
            http_response_code(500);
            echo json_encode(['error' => 'Database insert failed: ' . ($errorInfo[2] ?? 'Unknown error')]);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to move uploaded file.']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
}

?>
