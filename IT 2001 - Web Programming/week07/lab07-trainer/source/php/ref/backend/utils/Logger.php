<?php
/**
 * Writes one line per event into backend/logs/info.log or backend/logs/error.log
 *
 *   [2026-12-01 14:05:12] INFO GET /events 200 user=2 role=student 35ms
 *   [2026-12-01 14:05:13] ERROR POST /registrations 500 user=2 role=student PDOException: ... (RegistrationDao.php:42)
 */
class Logger
{
    const INFO_FILE = __DIR__ . '/../logs/info.log';
    const ERROR_FILE = __DIR__ . '/../logs/error.log';

    public static function info($message)
    {
        self::write(self::INFO_FILE, 'INFO', $message);
    }

    public static function error($message)
    {
        self::write(self::ERROR_FILE, 'ERROR', $message);
    }

    private static function write($file, $level, $message)
    {
        // "@" – a full disk or a missing permission must never crash the request itself
        if (!is_dir(dirname($file))) {
            @mkdir(dirname($file), 0775, true);
        }
        $line = sprintf("[%s] %s %s%s", date('Y-m-d H:i:s'), $level, $message, PHP_EOL);
        // LOCK_EX: two requests at the same time cannot mix their lines
        @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
    }
}
