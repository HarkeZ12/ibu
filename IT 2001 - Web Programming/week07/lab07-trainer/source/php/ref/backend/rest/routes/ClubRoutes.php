<?php
/* Lab 5 routes – they do not change in Lab 7. index.php puts them into the protected group. */

Flight::route('GET /clubs', function () {
    Flight::json(Flight::club_service()->get_all());
});

Flight::route('GET /clubs/@id:[0-9]+', function ($id) {
    Flight::json(Flight::club_service()->get_by_id($id));
});

Flight::route('POST /clubs', function () {
    Flight::json(Flight::club_service()->add(Flight::request()->data->getData()), 201);
});

Flight::route('DELETE /clubs/@id:[0-9]+', function ($id) {
    Flight::club_service()->delete($id);
    Flight::json(['message' => 'Club deleted.']);
});
