<?php
/**
 * Writes one line per event into backend/logs/info.log or backend/logs/error.log
 *
 *   [2026-11-12 10:15:03] INFO LOGIN user=2 role=student
 *   [2026-11-12 10:16:40] ERROR LOGIN FAILED email=ema@campusevents.ba
 */
class Logger
{
    const INFO_FILE = __DIR__ . '/../logs/info.log';
    const ERROR_FILE = __DIR__ . '/../logs/error.log';

    public static function info($message)
    {
        // TODO: write $message with the level INFO into INFO_FILE (use self::write)
    }

    public static function error($message)
    {
        // TODO: write $message with the level ERROR into ERROR_FILE (use self::write)
    }

    private static function write($file, $level, $message)
    {
        // TODO 1: (optional) create the folder of $file when it does not exist
        // TODO 2: build ONE line: "[" + date('Y-m-d H:i:s') + "] " + $level + " " + $message + PHP_EOL
        // TODO 3: APPEND the line to $file – never overwrite (FILE_APPEND | LOCK_EX), and never crash the request (@)
    }
}
