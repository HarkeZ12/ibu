<?php
/**
 * register and login are PUBLIC; /auth/me needs a valid token (route-level middleware).
 */

Flight::route('POST /auth/register', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::auth_service()->register($data), 201);
});

Flight::route('POST /auth/login', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::auth_service()->login($data));
});

Flight::route('GET /auth/me', function () {
    Flight::json(Flight::auth_service()->get_profile(Flight::get('user')['id']));
})->addMiddleware(new AuthMiddleware());

Flight::route('PUT /auth/me', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::auth_service()->update_profile(Flight::get('user')['id'], $data));
})->addMiddleware(new AuthMiddleware());
