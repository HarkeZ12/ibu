<?php
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/exceptions.php';

/**
 * ERROR HANDLING middleware – catches every exception that was not handled elsewhere.
 *
 * Registered once in index.php:  Flight::map('error', [new ErrorMiddleware(), 'handle'])
 *
 *  - HttpException (thrown on purpose)  -> its status code + its message
 *  - anything else (PDOException, bug)  -> 500 + a GENERIC message
 *  - 401/403/500 are written to logs/error.log
 *  - the client NEVER sees stack traces, SQL or file paths
 */
class ErrorMiddleware
{
    public function handle(Throwable $e)
    {
        if ($e instanceof HttpException) {
            $status = $e->get_status();
            $message = $e->getMessage();
            if (in_array($status, [401, 403])) {
                $this->log($status, $message);          // rejected requests
            }
        } else {
            $status = 500;
            $message = 'Something went wrong on the server. Please try again later.';
            // Full details only in OUR log: class, message, file and line
            $this->log($status, sprintf('%s: %s (%s:%d)', get_class($e), $e->getMessage(), basename($e->getFile()), $e->getLine()));
        }

        $this->send_json($status, ['error' => $message]);
    }

    public function not_found()
    {
        $this->send_json(404, ['error' => 'Endpoint not found.']);
    }

    private function log($status, $message)
    {
        $request = Flight::request();
        $user = Flight::has('user') ? Flight::get('user') : null;
        Logger::error(sprintf(
            '%s %s %d user=%s role=%s %s',
            $request->method,
            parse_url($request->url, PHP_URL_PATH),
            $status,
            $user['id'] ?? '-',
            $user['role'] ?? '-',
            $message
        ));
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
