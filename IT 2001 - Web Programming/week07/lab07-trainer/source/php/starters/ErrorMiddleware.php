<?php
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/exceptions.php';

/**
 * ERROR HANDLING middleware – catches every exception that was not handled elsewhere.
 *
 *  - HttpException (thrown on purpose)  -> its status code + its message
 *  - anything else (PDOException, bug)  -> 500 + a GENERIC message
 *  - 401/403/500 are written to logs/error.log
 */
class ErrorMiddleware
{
    public function handle(Throwable $e)
    {
        // TODO 1: HttpException -> its status (get_status()) and its message; log it when the status is 401 or 403
        // TODO 2: anything else -> 500 with a GENERAL message (never SQL, files or stack traces)
        //         and log the details: class, message, file (basename) and line
        // TODO 3: send {"error": message} with the status (send_json)
    }

    public function not_found()
    {
        // TODO: 404 + {"error": "Endpoint not found."}
    }

    private function log($status, $message)
    {
        // TODO 1: the request (Flight::request()) and the user (Flight::has('user') ? Flight::get('user') : null)
        // TODO 2: Logger::error("METHOD /path STATUS user=ID role=ROLE message") – path without the query string,
        //         "-" when there is no user
    }

    private function send_json($status, $body)
    {
        Flight::response()
            ->clearBody()
            ->status($status)
            ->header('Content-Type', 'application/json')
            ->write(json_encode($body))
            ->send();
    }
}
