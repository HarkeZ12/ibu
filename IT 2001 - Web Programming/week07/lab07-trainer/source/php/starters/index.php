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

// TODO: require the three middleware classes

Flight::register('club_service', 'ClubService');
Flight::register('event_service', 'EventService');
Flight::register('user_service', 'UserService');
// TODO: register auth_service

/* ---------- Global middleware ---------- */
// TODO: 1. every request -> logs/info.log
// TODO: 2. every exception -> JSON (+ logs/error.log), and 404 -> JSON

/* ---------- Public routes (no token needed) ---------- */
Flight::route('GET /', function () {
    Flight::json(['app' => 'CampusEvents API', 'message' => 'The backend is running.']);
});
// TODO

/* ---------- Protected routes ---------- */
// TODO: ClubRoutes.php and EventRoutes.php – protected by AuthMiddleware
require_once __DIR__ . '/rest/routes/ClubRoutes.php';
require_once __DIR__ . '/rest/routes/EventRoutes.php';

Flight::start();
