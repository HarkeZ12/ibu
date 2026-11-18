<?php
require_once __DIR__ . '/../utils/Logger.php';

/**
 * REQUEST LOGGING middleware – writes EVERY request to logs/info.log:
 *
 *   [2026-12-01 14:05:12] INFO GET /events 200 user=2 role=student 35ms
 *
 * Registered once in index.php:  Flight::before('start', ...)
 *
 * Why a shutdown function? The status code is only known at the very END of the request,
 * and some responses stop the script early (exit). PHP runs shutdown functions in every case.
 */
class RequestLogMiddleware
{
    public function before()
    {
        $start = microtime(true);

        register_shutdown_function(function () use ($start) {
            $request = Flight::request();
            $user = Flight::has('user') ? Flight::get('user') : null;

            Logger::info(sprintf(
                '%s %s %d user=%s role=%s %dms',
                $request->method,
                parse_url($request->url, PHP_URL_PATH),
                http_response_code(),
                $user['id'] ?? '-',
                $user['role'] ?? '-',
                round((microtime(true) - $start) * 1000)
            ));
        });
    }
}
