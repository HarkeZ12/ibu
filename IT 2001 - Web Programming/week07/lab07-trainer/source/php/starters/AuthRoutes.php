<?php
/**
 * register and login are PUBLIC; /auth/me needs a valid token.
 */

// TODO: POST /auth/register – read the JSON body, call auth_service register(), answer with status 201

// TODO: POST /auth/login – read the JSON body, call auth_service login()

// TODO: GET /auth/me – the profile of the user from the token (Flight::get('user')['id']);
//       this route is outside the protected group, so give it its own AuthMiddleware

// TODO: PUT /auth/me – update_profile() of the user from the token, also with its own AuthMiddleware
