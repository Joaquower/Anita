<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

$directory = 'notas';
$files = [];

// Verificar si la carpeta existe
if (is_dir($directory)) {
    // Escanear los archivos, quitando . y ..
    $scanned_files = array_diff(scandir($directory), array('..', '.'));
    
    foreach ($scanned_files as $file) {
        // Solo incluir archivos PDF
        if (strtolower(pathinfo($file, PATHINFO_EXTENSION)) === 'pdf') {
            $files[] = [
                "name" => $file,
                "path" => "/notas/" . $file
            ];
        }
    }
}

echo json_encode(array_values($files));
?>
