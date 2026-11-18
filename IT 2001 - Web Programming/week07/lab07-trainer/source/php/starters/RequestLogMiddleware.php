<?php
require_once __DIR__ . '/../utils/Logger.php';

/**
 * REQUEST LOGGING middleware – writes EVERY request to logs/info.log:
 *
 *   [2026-11-12 10:15:04] INFO GET /events 200 user=2 role=student 14ms
 */
class RequestLogMiddleware
{
    public function before()
    {
        // TODO 1: remember the start time (microtime(true))
        // TODO 2: the status is known only at the END of the request -> register_shutdown_function(function () use (...) { ... })
        // TODO 3: inside: Logger::info("METHOD /path STATUS user=ID role=ROLE <ms>ms")
        //         path without the query string (parse_url), status = http_response_code(), "-" when nobody is logged in
    }
}
