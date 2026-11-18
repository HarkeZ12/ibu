<?php
/* Lab 5 routes – they do not change in Lab 7. index.php puts them into the protected group. */

Flight::route('GET /events', function () {
    Flight::json(Flight::event_service()->get_all());
});

Flight::route('GET /events/@id:[0-9]+', function ($id) {
    Flight::json(Flight::event_service()->get_by_id($id));
});
