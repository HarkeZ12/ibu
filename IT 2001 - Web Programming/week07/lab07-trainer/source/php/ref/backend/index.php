<?php
/*
 * Entry point of the REST API.
 *   request -> [middleware] -> routes -> services -> dao -> database
 */
require __DIR__ . '/vendor/autoload.php';

require_once __DIR__ . '/rest/services/ClubService.php';
require_once __DIR__ . '/rest/services/EventService.php';
require_once __DIR__ . '/rest/services/UserService.php';
require_once __DIR__ . '/rest/services/AuthService.php';

require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/middleware/RequestLogMiddleware.php';
require_once __DIR__ . '/middleware/ErrorMiddleware.php';

Flight::register('club_service', 'ClubService');
Flight::register('event_service', 'EventService');
Flight::register('user_service', 'UserService');
Flight::register('auth_service', 'AuthService');

/* ---------- Global middleware ---------- */

// 1. every request -> logs/info.log
$request_logger = new RequestLogMiddleware();
Flight::before('start', function () use ($request_logger) {
    $request_logger->before();
});

// 2. every exception -> JSON (+ logs/error.log)
$error_handler = new ErrorMiddleware();
Flight::map('error', [$error_handler, 'handle']);
Flight::map('notFound', [$error_handler, 'not_found']);

/* ---------- Public routes (no token needed) ---------- */
Flight::route('GET /', function () {
    Flight::json(['app' => 'CampusEvents API', 'message' => 'The backend is running.']);
});
require_once __DIR__ . '/rest/routes/AuthRoutes.php';

/* ---------- Protected routes – AuthMiddleware runs before EVERY route in this group ---------- */
Flight::group('', function () {
    require_once __DIR__ . '/rest/routes/ClubRoutes.php';
    require_once __DIR__ . '/rest/routes/EventRoutes.php';
}, [new AuthMiddleware()]);

Flight::start();
