(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();const me={index:`<?php
/*
 * Entry point of the REST API (the Presentation Layer).
 *
 *   HTTP request -> routes (presentation) -> services (business logic) -> dao (data access) -> MySQL
 */
require __DIR__ . '/vendor/autoload.php';

if (!file_exists(__DIR__ . '/config/config.php')) {
    http_response_code(500);
    exit('Missing backend/config/config.php – copy config.example.php to config.php and set your database credentials.');
}

require_once __DIR__ . '/rest/services/CategoryService.php';
require_once __DIR__ . '/rest/services/ClubService.php';
require_once __DIR__ . '/rest/services/EventService.php';
require_once __DIR__ . '/rest/services/RegistrationService.php';
require_once __DIR__ . '/rest/services/ReviewService.php';
require_once __DIR__ . '/rest/services/UserService.php';
require_once __DIR__ . '/rest/services/AnnouncementService.php';

/*
 * Register every service ONCE. Flight creates the object the first time it is used,
 * and every route then calls it like this:  Flight::club_service()->get_all()
 */
Flight::register('club_service', 'ClubService');
Flight::register('registration_service', 'RegistrationService');
Flight::register('review_service', 'ReviewService');
Flight::register('user_service', 'UserService');

/*
 * TODO Task 2.1 – register the three services that are still missing:
 *   category_service     -> CategoryService
 *   event_service        -> EventService
 *   announcement_service -> AnnouncementService
 */

/*
 * TODO Task 2.2 – ONE place that turns every exception into a JSON response.
 *   Flight::map('error', function (Throwable $e) { ... });
 *   - HttpException (thrown by the services) -> status $e->get_status(), message $e->getMessage()
 *   - anything else (PDOException, a bug)   -> status 500, message
 *       'Something went wrong on the server. Please try again later.'
 *     and write the details only to the server log: error_log($e);
 *   NEW (not in the lecture version): the body also contains the status code, so the frontend can
 *   read it from the JSON:   {"status": 404, "error": "Club not found."}
 *   Answer with:  Flight::response()->clearBody()->status($status)
 *                     ->header('Content-Type', 'application/json')
 *                     ->write(json_encode(['status' => $status, 'error' => $message]))->send();
 */

/*
 * TODO Task 2.3 – a URL that matches no route answers with JSON too, and says WHICH endpoint is missing:
 *   Flight::map('notFound', function () { ... });  -> status 404, body
 *       {"status": 404, "error": "Endpoint GET /clubs/abc does not exist."}
 *   $request = Flight::request();   $request->method is GET/POST/...,  $request->url is the URL
 *   (without /backend). Remove the query string with  strtok($request->url, '?').
 */

Flight::route('GET /', function () {
    Flight::json(['app' => 'CampusEvents API', 'message' => 'The backend is running.']);
});

require_once __DIR__ . '/rest/routes/ClubRoutes.php';
require_once __DIR__ . '/rest/routes/CategoryRoutes.php';
require_once __DIR__ . '/rest/routes/EventRoutes.php';
require_once __DIR__ . '/rest/routes/RegistrationRoutes.php';
require_once __DIR__ . '/rest/routes/ReviewRoutes.php';
require_once __DIR__ . '/rest/routes/UserRoutes.php';
require_once __DIR__ . '/rest/routes/AnnouncementRoutes.php';

Flight::start();
`,categories:`<?php
/**
 * PRESENTATION LAYER – categories
 * ClubRoutes.php is a finished example of exactly the same five routes.
 */

/*
 * TODO Task 3.1 – the five REST routes for categories. Every route calls Flight::category_service():
 *
 *   GET    /categories                 -> get_all()                                   200
 *   GET    /categories/@id:[0-9]+      -> get_by_id($id)                              200 / 404
 *   POST   /categories                 -> add($data)                                  201 / 400
 *   PUT    /categories/@id:[0-9]+      -> update($data, $id)                          200 / 400 / 404
 *   DELETE /categories/@id:[0-9]+      -> delete($id), then answer
 *                                         Flight::json(['message' => 'Category deleted.']);   200 / 400 / 404
 *
 *   The JSON body of POST and PUT:  $data = Flight::request()->data->getData();
 *   201 for POST:                   Flight::json($result, 201);
 *   No try/catch – the error handler from Task 2.2 answers 400/404 for you.
 *
 * TODO Task 3.2 – NEW: the events of one category (a nested resource):
 *   GET    /categories/@id:[0-9]+/events -> Flight::event_service()->get_by_category($id)  200 / 404
 *   (EventService::get_by_category() from Lab 4 answers 404 "Category not found.")
 */
`,events:`<?php
/**
 * PRESENTATION LAYER – events
 */

/*
 * TODO Task 4.1 – the five REST routes, exactly like ClubRoutes.php:
 *   GET    /events              -> get_all()                (Task 4.2 adds the query parameters)
 *   GET    /events/@id:[0-9]+   -> get_by_id($id)
 *   POST   /events              -> add($data)               201
 *   PUT    /events/@id:[0-9]+   -> update($data, $id)
 *   DELETE /events/@id:[0-9]+   -> delete($id), then {"message": "Event deleted."}
 *
 * TODO Task 4.2 – change GET /events so it understands optional QUERY parameters:
 *   $query = Flight::request()->query;
 *   1. ?search=night  -> if isset($query['search']):  answer with Flight::event_service()->search($query['search'])
 *                        and return; so that only one answer is sent
 *   2. ?club_id=2&min_free_seats=1 ...  -> keep only the allowed filter keys:
 *        $filters = array_intersect_key($query->getData(),
 *                       array_flip(['club_id', 'category_id', 'city', 'only_upcoming', 'min_free_seats']));
 *      if at least one filter is given (count($filters) > 0):  Flight::event_service()->filter($filters)
 *   3. no query parameters  -> Flight::event_service()->get_all()   (as in Task 4.1)
 */

/*
 * TODO Task 4.3 – NESTED resources: things that belong to ONE event or club
 *   GET /events/@id:[0-9]+/reviews     -> Flight::review_service()->get_by_event($id)
 *   GET /clubs/@id:[0-9]+/events       -> Flight::event_service()->get_by_club($id)
 *   (The services answer 404 when the event or club does not exist.)
 */
`,announcements:`<?php
/**
 * PRESENTATION LAYER – club announcements (the table from Lab 3, the service from Lab 4)
 */

/*
 * TODO Task 5 – the routes for announcements. Every route calls Flight::announcement_service():
 *
 *   GET    /announcements                   -> ?limit=3 given: get_latest($limit)   otherwise: get_all()
 *   GET    /announcements/@id:[0-9]+        -> get_by_id($id)
 *   GET    /clubs/@id:[0-9]+/announcements  -> get_by_club($id)                      (nested resource)
 *   POST   /announcements                   -> add($data)                            201
 *   PUT    /announcements/@id:[0-9]+        -> update($data, $id)
 *   DELETE /announcements/@id:[0-9]+        -> delete($id), then {"message": "Announcement deleted."}
 */
`,registrations:`<?php
/**
 * PRESENTATION LAYER – registrations (finished)
 *
 *  - GET /registrations?user_id=2  a QUERY parameter filters the list
 *  - PUT /registrations/5/cancel   an ACTION on one resource gets its own sub-path
 */

Flight::route('GET /registrations', function () {
    $user_id = Flight::request()->query['user_id'] ?? null;
    if ($user_id) {
        Flight::json(Flight::registration_service()->get_by_user($user_id));
    } else {
        Flight::json(Flight::registration_service()->get_all());
    }
});

Flight::route('GET /registrations/@id:[0-9]+', function ($id) {
    Flight::json(Flight::registration_service()->get_by_id($id));
});

/** Register a student for an event. Body: { "user_id": 3, "event_id": 12 } */
Flight::route('POST /registrations', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::registration_service()->add($data), 201);
});

Flight::route('PUT /registrations/@id:[0-9]+/cancel', function ($id) {
    Flight::json(Flight::registration_service()->cancel($id));
});

Flight::route('PUT /registrations/@id:[0-9]+/attend', function ($id) {
    Flight::json(Flight::registration_service()->mark_attended($id));
});

/** Deleting an active registration gives the seat back (RegistrationService::delete()). */
Flight::route('DELETE /registrations/@id:[0-9]+', function ($id) {
    Flight::registration_service()->delete($id);
    Flight::json(['message' => 'Registration deleted.']);
});
`,reviews:`<?php
/**
 * PRESENTATION LAYER – reviews (finished)
 * The reviews of ONE event are a nested resource: GET /events/@id/reviews (Task 4.3).
 */

Flight::route('GET /reviews', function () {
    Flight::json(Flight::review_service()->get_all());
});

Flight::route('GET /reviews/@id:[0-9]+', function ($id) {
    Flight::json(Flight::review_service()->get_by_id($id));
});

/** Body: { "user_id": 3, "event_id": 1, "rating": 5, "comment": "Great!" } */
Flight::route('POST /reviews', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::review_service()->add($data), 201);
});

Flight::route('PUT /reviews/@id:[0-9]+', function ($id) {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::review_service()->update($data, $id));
});

Flight::route('DELETE /reviews/@id:[0-9]+', function ($id) {
    Flight::review_service()->delete($id);
    Flight::json(['message' => 'Review deleted.']);
});
`},be={b_registrations:`
Flight::route('GET /registrations', function () {
    $user_id = Flight::request()->query['user_id'] ?? null;
    if ($user_id) {
        Flight::json(Flight::registration_service()->get_by_user($user_id));
    } else {
        Flight::json(Flight::registration_service()->get_all());
    }
});

Flight::route('GET /registrations/@id:[0-9]+', function ($id) {
    Flight::json(Flight::registration_service()->get_by_id($id));
});

/** Register a student for an event. Body: { "user_id": 3, "event_id": 12 } */
Flight::route('POST /registrations', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::registration_service()->add($data), 201);
});

Flight::route('PUT /registrations/@id:[0-9]+/cancel', function ($id) {
    Flight::json(Flight::registration_service()->cancel($id));
});

Flight::route('PUT /registrations/@id:[0-9]+/attend', function ($id) {
    Flight::json(Flight::registration_service()->mark_attended($id));
});

/** Deleting an active registration gives the seat back (RegistrationService::delete()). */
Flight::route('DELETE /registrations/@id:[0-9]+', function ($id) {
    Flight::registration_service()->delete($id);
    Flight::json(['message' => 'Registration deleted.']);
});
`,b_reviews:`
Flight::route('GET /reviews', function () {
    Flight::json(Flight::review_service()->get_all());
});

Flight::route('GET /reviews/@id:[0-9]+', function ($id) {
    Flight::json(Flight::review_service()->get_by_id($id));
});

/** Body: { "user_id": 3, "event_id": 1, "rating": 5, "comment": "Great!" } */
Flight::route('POST /reviews', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::review_service()->add($data), 201);
});

Flight::route('PUT /reviews/@id:[0-9]+', function ($id) {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::review_service()->update($data, $id));
});

Flight::route('DELETE /reviews/@id:[0-9]+', function ($id) {
    Flight::review_service()->delete($id);
    Flight::json(['message' => 'Review deleted.']);
});
`,s2_1:`Flight::register('category_service', 'CategoryService');
Flight::register('event_service', 'EventService');
Flight::register('announcement_service', 'AnnouncementService');
`,s2_2:`Flight::map('error', function (Throwable $e) {
    if ($e instanceof HttpException) {
        $status = $e->get_status();
        $message = $e->getMessage();
    } else {
        $status = 500;
        $message = 'Something went wrong on the server. Please try again later.';
        error_log($e);
    }

    Flight::response()
        ->clearBody()
        ->status($status)
        ->header('Content-Type', 'application/json')
        ->write(json_encode(['status' => $status, 'error' => $message]))
        ->send();
});
`,s2_3:`Flight::map('notFound', function () {
    $request = Flight::request();
    $url = strtok($request->url, '?');

    Flight::response()
        ->clearBody()
        ->status(404)
        ->header('Content-Type', 'application/json')
        ->write(json_encode(['status' => 404, 'error' => "Endpoint {$request->method} $url does not exist."]))
        ->send();
});
`,s3_1:`Flight::route('GET /categories', function () {
    Flight::json(Flight::category_service()->get_all());
});

Flight::route('GET /categories/@id:[0-9]+', function ($id) {
    Flight::json(Flight::category_service()->get_by_id($id));
});

Flight::route('POST /categories', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::category_service()->add($data), 201);
});

Flight::route('PUT /categories/@id:[0-9]+', function ($id) {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::category_service()->update($data, $id));
});

Flight::route('DELETE /categories/@id:[0-9]+', function ($id) {
    Flight::category_service()->delete($id);
    Flight::json(['message' => 'Category deleted.']);
});
`,s3_2:`Flight::route('GET /categories/@id:[0-9]+/events', function ($id) {
    Flight::json(Flight::event_service()->get_by_category($id));
});
`,s4_1:`Flight::route('GET /events', function () {
    Flight::json(Flight::event_service()->get_all());
});

Flight::route('GET /events/@id:[0-9]+', function ($id) {
    Flight::json(Flight::event_service()->get_by_id($id));
});

Flight::route('POST /events', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::event_service()->add($data), 201);
});

Flight::route('PUT /events/@id:[0-9]+', function ($id) {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::event_service()->update($data, $id));
});

Flight::route('DELETE /events/@id:[0-9]+', function ($id) {
    Flight::event_service()->delete($id);
    Flight::json(['message' => 'Event deleted.']);
});
`,s4_2:`Flight::route('GET /events', function () {
    $query = Flight::request()->query;

    if (isset($query['search'])) {
        Flight::json(Flight::event_service()->search($query['search']));
        return;
    }

    $filters = array_intersect_key($query->getData(),
        array_flip(['club_id', 'category_id', 'city', 'only_upcoming', 'min_free_seats']));

    if (count($filters) > 0) {
        Flight::json(Flight::event_service()->filter($filters));
    } else {
        Flight::json(Flight::event_service()->get_all());
    }
});
`,s4_3:`Flight::route('GET /events/@id:[0-9]+/reviews', function ($id) {
    Flight::json(Flight::review_service()->get_by_event($id));
});

Flight::route('GET /clubs/@id:[0-9]+/events', function ($id) {
    Flight::json(Flight::event_service()->get_by_club($id));
});
`,s5:`Flight::route('GET /announcements', function () {
    $limit = Flight::request()->query['limit'] ?? null;
    if ($limit !== null) {
        Flight::json(Flight::announcement_service()->get_latest($limit));
    } else {
        Flight::json(Flight::announcement_service()->get_all());
    }
});

Flight::route('GET /announcements/@id:[0-9]+', function ($id) {
    Flight::json(Flight::announcement_service()->get_by_id($id));
});

Flight::route('GET /clubs/@id:[0-9]+/announcements', function ($id) {
    Flight::json(Flight::announcement_service()->get_by_club($id));
});

/** Body: { "club_id": 4, "title": "Debate on Friday", "body": "...", "is_pinned": true } */
Flight::route('POST /announcements', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::announcement_service()->add($data), 201);
});

Flight::route('PUT /announcements/@id:[0-9]+', function ($id) {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::announcement_service()->update($data, $id));
});

Flight::route('DELETE /announcements/@id:[0-9]+', function ($id) {
    Flight::announcement_service()->delete($id);
    Flight::json(['message' => 'Announcement deleted.']);
});
`},J={templates:me,ref:be},se={s2_1:{file:"index",marker:"TODO Task 2.1"},s2_2:{file:"index",marker:"TODO Task 2.2"},s2_3:{file:"index",marker:"TODO Task 2.3"},s3_1:{file:"categories",marker:"TODO Task 3.1"},s3_2:{file:"categories",marker:"TODO Task 3.1",after:"s3_1"},s4_2:{file:"events",marker:"TODO Task 4.1"},s4_1:{file:"events",marker:"TODO Task 4.1",after:"s4_2"},s4_3:{file:"events",marker:"TODO Task 4.3"},s5:{file:"announcements",marker:"TODO Task 5"},b_registrations:{file:"registrations",replace:!0},b_reviews:{file:"reviews",replace:!0}},ie={index:"index.php",categories:"rest/routes/CategoryRoutes.php",events:"rest/routes/EventRoutes.php",announcements:"rest/routes/AnnouncementRoutes.php",registrations:"rest/routes/RegistrationRoutes.php",reviews:"rest/routes/ReviewRoutes.php"};function oe(e){const n=/Flight\s*::\s*route\s*\(\s*(['"])GET \/events\1\s*,/.exec(e);if(!n)return null;let t=1,a=null;for(let r=e.indexOf("(",n.index)+1;r<e.length;r++){const s=e[r],i=e[r+1];if(a){s==="\\"?r++:s===a&&(a=null);continue}if(s==='"'||s==="'"){a=s;continue}if(s==="/"&&i==="*"){const c=e.indexOf("*/",r+2);if(c<0)return null;r=c+1;continue}if(s==="/"&&i==="/"||s==="#"){const c=e.indexOf(`
`,r);if(c<0)return null;r=c;continue}if(s==="("&&t++,s===")"&&--t===0){let c=r+1;for(;/\s/.test(e[c]||"")&&c<e.length;)c++;return e[c]===";"&&c++,{start:n.index,end:c}}}return null}function re(e){const n=oe(e);return n?e.slice(0,n.start)+e.slice(n.end):e}function ye(e){const n=oe(e);return n?e.slice(n.start,n.end)+`
`:""}function _e(e,n,t){const a=e.indexOf(n);if(a<0)throw new Error("marker not found: "+n);const r=e.indexOf("*/",a),s=e.indexOf(`
`,r),i=s<0?e.length:s+1;return e.slice(0,i)+t+e.slice(i)}function Te(e){const n=e.indexOf(" */");return e.slice(0,n+4)}function ke(e,n){n={...n},n.s4_2?.trim()&&n.s4_1&&(n.s4_1=re(n.s4_1));const t={};for(const[s,i]of Object.entries(ie))t[s]=e[s];const a=["s2_1","s2_2","s2_3","s3_2","s3_1","s4_1","s4_2","s4_3","s5"];for(const s of a){const i=n[s];if(i==null||i.trim()==="")continue;const c=se[s];t[c.file]=_e(t[c.file],c.marker,`
`+i.replace(/^\s*<\?php\s*/,"").trimEnd()+`
`)}for(const s of["b_registrations","b_reviews"]){if(n[s]==null)continue;const i=se[s];t[i.file]=Te(e[i.file])+`
`+n[s].replace(/^\s*<\?php\s*/,"").trimEnd()+`
`}const r={};for(const[s,i]of Object.entries(ie))r[i]=t[s];return r}new TextDecoder;const we=new Set(["created_at","registered_at","cancelled_at","is_upcoming"]);function I(e){if(Array.isArray(e))return e.map(I);if(e&&typeof e=="object"){const n={};for(const t of Object.keys(e).sort())we.has(t)||(n[t]=I(e[t]));return n}return e}function ae(e,n){return JSON.stringify(I(e))===JSON.stringify(I(n))}function Ee(e){return e?(String(e).split(`
`).map(t=>t.trim()).filter(Boolean).filter(t=>!/^PHP Stack trace|^#\d|^Stack trace|^thrown in/.test(t))[0]||"").replace(/^PHP (Fatal error|Warning|Notice|Deprecated):\s*/,"$1: ").slice(0,400):""}function $e(e,n){return!!e&&!!n&&e.kind===n.kind&&e.tag===n.tag&&e.text===n.text&&(e.kind!=="line"||e.method===n.method&&e.path===n.path&&e.status===n.status&&ae(e.answer,n.answer))}const Q=J.ref;function D(e,n){const t=J.templates[e],a=t.indexOf(n),r=t.lastIndexOf("/*",a);return t.slice(r,t.indexOf("*/",a)+2)}const Fe=Q.s4_1.match(/Flight::route\('GET \/events', function \(\) \{\n[\s\S]*?\n\}\);\n/)[0],q=[{id:"2.1",group:"Task 2 · index.php",name:"Register services",file:"backend/index.php",slot:"s2_1",title:"Register the three missing services",todo:D("index","TODO Task 2.1"),only:["x2.1"],steps:["Look at the four <code>Flight::register(...)</code> lines above the TODO comment in <code>index.php</code>.","Add three lines of the same kind: <code>category_service</code>, <code>event_service</code> and <code>announcement_service</code>.","The first argument is the name the routes call (<code>Flight::event_service()</code>), the second is the class name as a string."],why:"Flight creates the service object only when a route calls it for the first time, and after that it always returns the same object. If a service is not registered, <code>Flight::category_service()</code> throws an error and the API answers 500.",api:["<code>Flight::register('name', 'ClassName')</code>","<code>Flight::name()</code> in a route returns the object of that class"],starter:"",expected:null,expectedNote:"test_tasks.php has no separate output for this part. The trainer requests a category, an event and an announcement. They work only if all three services are registered (the routes are already solved)."},{id:"2.2",group:"Task 2 · index.php",name:"Flight::map('error')",file:"backend/index.php",slot:"s2_2",title:"One error handler for the whole API",todo:D("index","TODO Task 2.2"),only:["2.2","x2.2"],steps:["Write <code>Flight::map('error', function (Throwable $e) { ... });</code>","If <code>$e instanceof HttpException</code>: <code>$status = $e->get_status();</code> and <code>$message = $e->getMessage();</code>","Otherwise: <code>$status = 500;</code>, the message <code>'Something went wrong on the server. Please try again later.'</code> and <code>error_log($e);</code>","Answer with the chain <code>Flight::response()->clearBody()->status(...)->header(...)->write(json_encode([...]))->send();</code>","The JSON has TWO keys: <code>status</code> and <code>error</code>."],why:"The services throw <code>ValidationException</code> (400) and <code>NotFoundException</code> (404). The handler turns them into JSON in one place, so the routes need no <code>try/catch</code> at all. For everything else (PDOException, a bug) the client gets only a generic message. The details go to the log, because a database message can reveal tables, the user or the password.",api:["<code>HttpException</code> → <code>get_status()</code>, <code>getMessage()</code>","<code>Flight::response()->clearBody()</code> removes a half-written answer","<code>error_log($e)</code> writes to the server log"],starter:`Flight::map('error', function (Throwable $e) {

});
`,expected:`=== Task 2 – one error handler for the whole API ===
GET /clubs/999 ............................................. 404  Club not found.
POST /clubs ................................................ 400  Field 'name' must be between 2 and 100 characters long.
GET /clubs ................................................. 500  Something went wrong on the server. Please try again later.
    (the request above used a database that is not running)`},{id:"2.3",group:"Task 2 · index.php",name:"Flight::map('notFound')",file:"backend/index.php",slot:"s2_3",title:"An unknown URL says which endpoint is missing",todo:D("index","TODO Task 2.3"),only:["2.3","x2.3"],steps:["Write <code>Flight::map('notFound', function () { ... });</code>","<code>$request = Flight::request();</code> → <code>$request->method</code> is GET/POST/…, <code>$request->url</code> is the URL without <code>/backend</code>.","Remove the query string: <code>strtok($request->url, '?')</code>.",'Send 404 with the JSON <code>{"status": 404, "error": "Endpoint GET /clubs/abc does not exist."}</code> (the same chain as in 2.2).'],why:"Flight calls <code>notFound</code> when no route matches the URL, for example <code>/clubs/abc</code>, because <code>@id:[0-9]+</code> accepts only numbers. This way the frontend gets JSON even for a wrong URL, not an HTML page.",api:["<code>Flight::request()->method</code>","<code>Flight::request()->url</code>","<code>strtok($url, '?')</code> → the part before <code>?</code>"],starter:`Flight::map('notFound', function () {

});
`,expected:`GET /this-does-not-exist ................................... 404  Endpoint GET /this-does-not-exist does not exist.
DELETE /clubs/abc?force=1 .................................. 404  Endpoint DELETE /clubs/abc does not exist.`},{id:"3.1",group:"Task 3 · CategoryRoutes.php",name:"Five REST routes",file:"backend/rest/routes/CategoryRoutes.php",slot:"s3_1",title:"Five REST routes for categories",todo:D("categories","TODO Task 3.1"),only:["3.1","x3.1"],steps:["Open <code>ClubRoutes.php</code>. It is the same file, only with <code>category</code> instead of <code>club</code>.","<code>GET /categories</code> → <code>get_all()</code>, <code>GET /categories/@id:[0-9]+</code> → <code>get_by_id($id)</code>","<code>POST</code>: <code>$data = Flight::request()->data->getData();</code> then <code>Flight::json(..., 201);</code>","<code>PUT</code> → <code>update($data, $id)</code> (first the data, then the id).","<code>DELETE</code> → <code>delete($id)</code>, then <code>Flight::json(['message' => 'Category deleted.']);</code>"],why:`A route does only three things: it reads the request, calls ONE service method and answers with JSON. The rules ("Field 'name' is required.", a duplicate, a category with events) are already in <code>CategoryService</code> and arrive as exceptions, and the error handler from 2.2 turns them into 400/404.`,api:["<code>Flight::category_service()</code>","<code>Flight::request()->data->getData()</code> → the JSON body as an array","<code>Flight::json($data, $status)</code>"],starter:"",expected:`=== Task 3 – routes for categories ===
GET /categories ............................................ 200  5 item(s): Career, Culture, Music, Sports, Tech
GET /categories/1 .......................................... 200  id 1 – Music
GET /categories/999 ........................................ 404  Category not found.
POST /categories ........................................... 400  Field 'name' is required.
POST /categories ........................................... 400  A category named 'Music' already exists.
POST /categories ........................................... 201  id 6 – Checker Category
PUT /categories/6 .......................................... 200  id 6 – Checker Workshops
PUT /categories/999 ........................................ 404  Category not found.
DELETE /categories/1 ....................................... 400  This category still contains 2 event(s). Move or delete them first.
DELETE /categories/6 ....................................... 200  Category deleted.
GET /categories/6 .......................................... 404  Category not found.`},{id:"3.2",group:"Task 3 · CategoryRoutes.php",name:"Events of a category",file:"backend/rest/routes/CategoryRoutes.php",slot:"s3_2",title:"Nested resource: the events of one category",todo:D("categories","TODO Task 3.2"),only:["3.2","x3.2"],steps:["One route: <code>GET /categories/@id:[0-9]+/events</code>.","It does not call <code>category_service</code> but <code>Flight::event_service()->get_by_category($id)</code>, because it returns EVENTS.",'The service itself throws 404 "Category not found." for a category that does not exist.'],why:'A nested URL means "the events THAT BELONG TO category 2". The resource in the answer is events, so the event service provides it. <code>/clubs/@id/events</code> in Task 4.3 works the same way.',api:["<code>Flight::event_service()->get_by_category($id)</code>"],starter:"",expected:`GET /categories/2/events ................................... 200  3 item(s): Git & GitHub Workshop, Robot Build Day, Hack the Campus – 24h Hackathon
GET /categories/999/events ................................. 404  Category not found.`},{id:"4.1",group:"Task 4 · EventRoutes.php",name:"Five REST routes",file:"backend/rest/routes/EventRoutes.php",slot:"s4_1",title:"Five REST routes for events",todo:D("events","TODO Task 4.1").split(`
 *
 * TODO Task 4.2`)[0]+`
 */`,only:["4.1","x4.1"],fix:{s4_2:""},steps:["The same as 3.1, only with <code>Flight::event_service()</code> and the URL <code>/events</code>.","<code>GET /events</code> only returns <code>get_all()</code> for now (you add the query parameters in 4.2).","<code>DELETE</code> answers with <code>['message' => 'Event deleted.']</code>."],why:'The checker sends <code>available_seats = 999</code>, and the service ignores it on purpose: a new event has all seats free. A route must not "fix" the data. Whatever the client sends goes to the service untouched.',api:["<code>Flight::event_service()</code> → <code>get_all, get_by_id, add, update, delete</code>"],starter:"",expected:`=== Task 4 – routes for events ===
GET /events ................................................ 200  12 item(s)
GET /events/7 .............................................. 200  id 7 – Robot Build Day
GET /events/999 ............................................ 404  Event not found.
POST /events ............................................... 400  Field 'starts_at' must be in the future.
POST /events ............................................... 201  id 13 – Checker Event
    available_seats of the new event: 30
PUT /events/13 ............................................. 200  id 13 – Checker Event
    available_seats after the update: 40
DELETE /events/13 .......................................... 200  Event deleted.`},{id:"4.2",group:"Task 4 · EventRoutes.php",name:"?search= and filters",file:"backend/rest/routes/EventRoutes.php",slot:"s4_2",title:"GET /events with query parameters",todo:`/*
 * TODO Task 4.2`+D("events","TODO Task 4.2").split("TODO Task 4.2")[1],only:["4.2","x4.2"],fix:{s4_1:re(Q.s4_1)},steps:["The editor contains your <code>GET /events</code> route from 4.1. Change it (the other four routes stay the same).","<code>$query = Flight::request()->query;</code>","If <code>isset($query['search'])</code>: answer with <code>search($query['search'])</code> and <code>return;</code>","Otherwise: <code>$filters = array_intersect_key($query->getData(), array_flip([...5 keys...]));</code>","If <code>count($filters) > 0</code> → <code>filter($filters)</code>, otherwise <code>get_all()</code>."],why:"Without <code>return</code> the route would send TWO JSON documents one after the other. <code>array_intersect_key</code> keeps only the keys the service knows, so <code>?color=red</code> does no harm and returns all events. The validation (<code>search=a</code>, <code>min_free_seats=-5</code>) is done by the service, not by the route.",api:["<code>Flight::request()->query['x']</code>","<code>Flight::request()->query->getData()</code> → all query parameters","<code>array_intersect_key($a, array_flip([...]))</code>"],starter:Fe,expected:`GET /events?search=night ................................... 200  4 item(s): Open Mic Night, Chess Blitz Night, Movie Night: Classic Cinema, Startup Pitch Night
GET /events?search=a ....................................... 400  Field 'text' must be between 2 and 50 characters long.
GET /events?category_id=2&only_upcoming=1&min_free_seats=1 . 200  2 item(s): Git & GitHub Workshop, Hack the Campus – 24h Hackathon
GET /events?club_id=999 .................................... 404  Club not found.
GET /events?min_free_seats=-5 .............................. 400  Field 'min_free_seats' must be at least 0.`},{id:"4.3",group:"Task 4 · EventRoutes.php",name:"Nested routes",file:"backend/rest/routes/EventRoutes.php",slot:"s4_3",title:"Reviews of an event and events of a club",todo:D("events","TODO Task 4.3"),only:["4.3","x4.3"],steps:["<code>GET /events/@id:[0-9]+/reviews</code> → <code>Flight::review_service()->get_by_event($id)</code>","<code>GET /clubs/@id:[0-9]+/events</code> → <code>Flight::event_service()->get_by_club($id)</code>","Both go into <code>EventRoutes.php</code>, even though the second one starts with <code>/clubs</code>."],why:"A route belongs to the file of the resource it RETURNS. The second route returns events, so it is in EventRoutes. The services check that the event or club exists and throw 404.",api:["<code>Flight::review_service()->get_by_event($id)</code>","<code>Flight::event_service()->get_by_club($id)</code>"],starter:"",expected:`GET /events/9/reviews ...................................... 200  2 item(s): rating 4, rating 5
GET /events/999/reviews .................................... 404  Event not found.
GET /clubs/2/events ........................................ 200  2 item(s): Git & GitHub Workshop, Hack the Campus – 24h Hackathon
GET /clubs/999/events ...................................... 404  Club not found.`},{id:"5",group:"Task 5 · AnnouncementRoutes.php",name:"Announcement routes",file:"backend/rest/routes/AnnouncementRoutes.php",slot:"s5",title:"All routes for club announcements",todo:D("announcements","TODO Task 5"),only:["5","x5"],steps:["<code>GET /announcements</code>: <code>$limit = Flight::request()->query['limit'] ?? null;</code> If it is not null → <code>get_latest($limit)</code>, otherwise <code>get_all()</code>.","<code>GET /announcements/@id:[0-9]+</code> → <code>get_by_id($id)</code>","<code>GET /clubs/@id:[0-9]+/announcements</code> → <code>get_by_club($id)</code>","<code>POST</code> (201), <code>PUT</code>, <code>DELETE</code> with the message <code>Announcement deleted.</code>"],why:'<code>get_latest()</code> itself checks that the limit is between 1 and 20, so <code>?limit=50</code> gives 400 without a single line in the route. The rule "only one pinned announcement per club" is in the service as well.',api:["<code>Flight::announcement_service()</code> → <code>get_all, get_latest, get_by_id, get_by_club, add, update, delete</code>"],starter:"",expected:`=== Task 5 – routes for announcements ===
GET /announcements ......................................... 200  3 item(s): Band auditions this Friday, Hackathon teams are open, New robot kits have arrived
GET /announcements?limit=2 ................................. 200  2 item(s): Hackathon teams are open, Band auditions this Friday
GET /announcements?limit=50 ................................ 400  Field 'limit' must be at most 20.
GET /announcements/1 ....................................... 200  id 1 – Band auditions this Friday
GET /clubs/1/announcements ................................. 200  1 item(s): Band auditions this Friday
GET /clubs/999/announcements ............................... 404  Club not found.
POST /announcements ........................................ 400  'IBU Music Club' already has a pinned announcement. Unpin it first.
POST /announcements ........................................ 201  id 4 – Checker: debate on Friday
PUT /announcements/4 ....................................... 200  id 4 – Checker: debate moved to Monday
DELETE /announcements/4 .................................... 200  Announcement deleted.
GET /announcements/4 ....................................... 404  Announcement not found.`},{id:"B1",group:"Extra · for the assignment",name:"RegistrationRoutes",file:"backend/rest/routes/RegistrationRoutes.php",slot:"b_registrations",title:"Write RegistrationRoutes.php from memory",todo:`/*
 * EXTRA – write the whole RegistrationRoutes.php (it is finished in the skeleton, here you write it yourself):
 *
 *   GET    /registrations                       -> ?user_id=2 given: get_by_user($user_id)   otherwise: get_all()
 *   GET    /registrations/@id:[0-9]+            -> get_by_id($id)
 *   POST   /registrations                       -> add($data)                                201
 *   PUT    /registrations/@id:[0-9]+/cancel     -> cancel($id)          (an ACTION on one resource)
 *   PUT    /registrations/@id:[0-9]+/attend     -> mark_attended($id)
 *   DELETE /registrations/@id:[0-9]+            -> delete($id), then {"message": "Registration deleted."}
 */`,only:["xB1"],steps:["Six routes, all through <code>Flight::registration_service()</code>.","Read the query parameter as in Task 5: <code>Flight::request()->query['user_id'] ?? null</code>.","The actions (<code>/cancel</code>, <code>/attend</code>) are PUT on a sub-path of one resource and have no body."],why:"In the assignment you often get a new entity with the same patterns: a list with a query filter, CRUD and an action on one resource. This is practice for that without looking at the finished file.",api:["<code>Flight::registration_service()</code> → <code>get_all, get_by_user, get_by_id, add, cancel, mark_attended, delete</code>"],starter:"",expected:null,expectedNote:"This file is not in test_tasks.php. The trainer sends 15 requests (list, filter, 404, registration, sold out, cancelling twice, attend, delete) and compares your answers with the original RegistrationRoutes.php from the skeleton."},{id:"B2",group:"Extra · for the assignment",name:"ReviewRoutes",file:"backend/rest/routes/ReviewRoutes.php",slot:"b_reviews",title:"Write ReviewRoutes.php from memory",todo:`/*
 * EXTRA – write the whole ReviewRoutes.php (it is finished in the skeleton, here you write it yourself):
 *
 *   GET    /reviews                  -> get_all()
 *   GET    /reviews/@id:[0-9]+       -> get_by_id($id)
 *   POST   /reviews                  -> add($data)            201
 *   PUT    /reviews/@id:[0-9]+       -> update($data, $id)
 *   DELETE /reviews/@id:[0-9]+       -> delete($id), then {"message": "Review deleted."}
 */`,only:["xB2"],steps:["Five standard routes through <code>Flight::review_service()</code>.","Try it without looking at ClubRoutes: this is what an exam task looks like."],why:"Five CRUD routes for a new entity are the most common part of the assignment. Once you write this in two minutes without a mistake, Tasks 3 and 4 are routine.",api:["<code>Flight::review_service()</code> → <code>get_all, get_by_id, add, update, delete</code>"],starter:"",expected:null,expectedNote:"This file is not in test_tasks.php. The trainer sends 11 requests (list, 404, duplicate, review without attending, update, rating 9, delete) and compares the answers with the original ReviewRoutes.php."}];q.forEach(e=>{e.solution=Q[e.slot].trim()+`
`});const Oe=`=== Task 1 – the API is running ===
GET / ...................................................... 200  The backend is running.
GET /clubs ................................................. 200  6 item(s)`,xe=[{t:"List and one item",p:"GET without an id returns a list, GET with an id returns one item. @id:[0-9]+ accepts only numbers, so /x/abc goes to notFound.",c:`Flight::route('GET /clubs', function () {
    Flight::json(Flight::club_service()->get_all());
});

Flight::route('GET /clubs/@id:[0-9]+', function ($id) {
    Flight::json(Flight::club_service()->get_by_id($id));
});`},{t:"POST = 201, PUT = data then id",p:"You always read the body the same way. For update() the order is ($data, $id).",c:`Flight::route('POST /clubs', function () {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::club_service()->add($data), 201);
});

Flight::route('PUT /clubs/@id:[0-9]+', function ($id) {
    $data = Flight::request()->data->getData();
    Flight::json(Flight::club_service()->update($data, $id));
});`},{t:"DELETE with a message",p:"delete() returns nothing useful, so the route sends a message itself.",c:`Flight::route('DELETE /clubs/@id:[0-9]+', function ($id) {
    Flight::club_service()->delete($id);
    Flight::json(['message' => 'Club deleted.']);
});`},{t:"Query parameter",p:"?user_id=2 is not part of the URL pattern. Read it from the query, with ?? null if it is missing.",c:`$user_id = Flight::request()->query['user_id'] ?? null;
if ($user_id) {
    Flight::json(Flight::registration_service()->get_by_user($user_id));
} else {
    Flight::json(Flight::registration_service()->get_all());
}`},{t:"Nested resource and action",p:"A nested route returns ANOTHER resource, so it calls that resource's service. An action is a PUT on a sub-path.",c:`Flight::route('GET /clubs/@id:[0-9]+/events', function ($id) {
    Flight::json(Flight::event_service()->get_by_club($id));
});

Flight::route('PUT /registrations/@id:[0-9]+/cancel', function ($id) {
    Flight::json(Flight::registration_service()->cancel($id));
});`},{t:"Error handler (skeleton)",p:"One place for all exceptions. An HttpException carries its own status, everything else is 500 without details.",c:`Flight::map('error', function (Throwable $e) {
    if ($e instanceof HttpException) {
        $status = $e->get_status();
        $message = $e->getMessage();
    } else {
        $status = 500;
        $message = 'Something went wrong ...';
        error_log($e);
    }
    Flight::response()->clearBody()->status($status)
        ->header('Content-Type', 'application/json')
        ->write(json_encode(['status' => $status, 'error' => $message]))
        ->send();
});`},{t:"Most common mistakes",p:"Each of these gives a wrong status or [TODO] in the checker.",c:`Flight::json($result);              // POST without 201 → 200
update($id, $data)                   // reversed order
'GET /events/@id'                    // :[0-9]+ missing → /events/abc gives no 404
try { ... } catch (...) { ... }      // not in routes – the handler does it
echo json_encode(...);               // always Flight::json(...)`}];function Re(e){const n=new TextEncoder,t=[],a=[];let r=0;function s(g){const y=new Uint8Array(g);return[y,new DataView(y.buffer)]}function i(g){let y=4294967295;for(const O of g){y^=O;for(let k=0;k<8;k++)y=y>>>1^(y&1?3988292384:0)}return(y^4294967295)>>>0}for(const[g,y]of Object.entries(e)){const O=n.encode(g),k=n.encode(y),p=i(k),[_,$]=s(30);$.setUint32(0,67324752,!0),$.setUint16(4,20,!0),$.setUint16(6,2048,!0),$.setUint16(12,33,!0),$.setUint32(14,p,!0),$.setUint32(18,k.length,!0),$.setUint32(22,k.length,!0),$.setUint16(26,O.length,!0),t.push(_,O,k);const[G,f]=s(46);f.setUint32(0,33639248,!0),f.setUint16(4,20,!0),f.setUint16(6,20,!0),f.setUint16(8,2048,!0),f.setUint16(14,33,!0),f.setUint32(16,p,!0),f.setUint32(20,k.length,!0),f.setUint32(24,k.length,!0),f.setUint16(28,O.length,!0),f.setUint32(42,r,!0),a.push(G,O),r+=_.length+O.length+k.length}const c=a.reduce((g,y)=>g+y.length,0),[b,F]=s(22);F.setUint32(0,101010256,!0),F.setUint16(8,Object.keys(e).length,!0),F.setUint16(10,Object.keys(e).length,!0),F.setUint32(12,c,!0),F.setUint32(16,r,!0);const d=new Uint8Array(r+c+b.length);let T=0;for(const g of[...t,...a,b])d.set(g,T),T+=g.length;return d}function Se(e){return new Worker(""+new URL("php-worker-BA4GoevR.js",import.meta.url).href,{type:"module",name:e?.name})}const l=e=>document.querySelector(e);function m(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const Pe=/^(public|protected|private|static|function|return|if|else|foreach|as|throw|new|null|true|false|isset|empty|parent|self|fn|echo|class|extends|const|instanceof|try|catch)$/;function V(e){let n="",t=0;const a=e;for(;t<a.length;){const r=a[t],s=a[t+1];if(r==="/"&&s==="/"){const i=a.indexOf(`
`,t),c=i<0?a.length:i;n+='<span class="hl-com">'+m(a.slice(t,c))+"</span>",t=c;continue}if(r==="/"&&s==="*"){const i=a.indexOf("*/",t+2),c=i<0?a.length:i+2;n+='<span class="hl-com">'+m(a.slice(t,c))+"</span>",t=c;continue}if(r==='"'||r==="'"){let i=t+1;for(;i<a.length&&a[i]!==r;)a[i]==="\\"&&i++,i++;n+='<span class="hl-str">'+m(a.slice(t,i+1))+"</span>",t=i+1;continue}if(r==="$"){const i=a.slice(t).match(/^\$\w+/);if(i){n+='<span class="hl-var">'+i[0]+"</span>",t+=i[0].length;continue}}if(/\d/.test(r)&&!/\w/.test(a[t-1]||"")){const i=a.slice(t).match(/^\d+/);n+='<span class="hl-num">'+i[0]+"</span>",t+=i[0].length;continue}if(/[A-Za-z_]/.test(r)){const i=a.slice(t).match(/^\w+/);n+=Pe.test(i[0])?'<span class="hl-kw">'+i[0]+"</span>":m(i[0]),t+=i[0].length;continue}n+=m(r),t++}return n}function U(e){return String(e).replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^:])\/\/.*$/gm,"$1").replace(/#.*$/gm,"")}const De=[{test:e=>/\btry\s*\{/.test(U(e)),msg:"No <code>try/catch</code> in routes. The error handler from Task 2.2 catches the exception."},{test:e=>/["'][^"']*\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i.test(U(e)),msg:"No SQL in routes. Call a service method."},{test:e=>/@id(?!:\[0-9\]\+)/.test(e),msg:"Write the id in a URL as <code>@id:[0-9]+</code>, so that <code>/x/abc</code> goes to notFound (404)."},{test:e=>/\becho\b|\bprint\b|json_encode\s*\(/.test(U(e))&&!/Flight::map/.test(e),msg:"Answer with <code>Flight::json(...)</code>, not with <code>echo json_encode(...)</code>."},{test:e=>/->(\w+_dao|dao)->|new\s+\w+Dao\b/.test(U(e)),msg:"A route never calls a DAO directly. It always goes through a service (<code>Flight::x_service()</code>)."},{test:e=>/\$_(GET|POST|SERVER)\b/.test(U(e)),msg:"Instead of <code>$_GET</code>/<code>$_POST</code> use <code>Flight::request()->query</code> and <code>Flight::request()->data</code>."}],ce="lab05-trainer-en-v1";let u={drafts:{},status:{},mode:"full"};try{const e=localStorage.getItem(ce);e&&(u=Object.assign(u,JSON.parse(e)))}catch{}u.checkVersion!==2&&(delete u.status.full,u.checkVersion=2);let K=0;const R=()=>{try{localStorage.setItem(ce,JSON.stringify(u))}catch{}},j=e=>"t"+e.replace(".","-"),M={};q.forEach(e=>M[j(e.id)]=e);const de=J.ref;function L(e){const n=l("#toast");n.textContent=e,n.hidden=!1,clearTimeout(L.h),L.h=setTimeout(()=>n.hidden=!0,1800)}let N=null,W=!1,qe=0;const B=new Map;function le(){W=!1,N=new Se,N.onmessage=({data:e})=>{if(e.type==="ready"){W=!0,z("ok");return}if(e.type==="boot-error"){z("bad",e.error);return}const n=B.get(e.id);n&&(B.delete(e.id),clearTimeout(n.timer),n.resolve(e))},N.onerror=e=>z("bad",e.message)}function z(e,n){const t=l("#php-badge");t&&(t.className="php-badge "+e,t.textContent=e==="ok"?"PHP 8.4 ready":e==="bad"?"PHP failed to load":"Loading PHP…",t.title=n||"")}function he(e,n=3e4){return new Promise(t=>{const a=++qe,r=setTimeout(()=>{B.delete(a),N.terminate(),le(),t({error:"PHP ran for more than 30 seconds and was stopped. Check for an endless loop (while, for) and try again.",lint:[],ref:[],stu:[]})},n);B.set(a,{resolve:t,timer:r}),N.postMessage({...e,id:a})})}function ue(){const e={...de};return delete e.b_registrations,delete e.b_reviews,e}function je(e,n){return e.replace(/ in \/work\/\w+\/backend\/([\w\/.]+):(\d+)/g,(t,a,r)=>{for(const s of Object.values(n||{}))if(s.file===a&&+r>=s.line)return` (line ${+r-s.line+1+s.skipped} in the editor)`;return` in ${a}:${r}`})}function Le(e,n,t,a){const r=[];for(const s of t){const i=e.filter(b=>b.tag===s&&b.kind!=="blank"&&b.kind!=="title"),c=n.filter(b=>b.tag===s&&b.kind!=="blank"&&b.kind!=="title");i.forEach((b,F)=>{const d=c[F];let T=!!d&&d.text===b.text,g="";if(T&&b.kind==="line"&&!ae(b.answer,d.answer)&&(T=!1,g="Status and summary are the same, but the JSON is different from the original. Do you return exactly what the service returns?"),!d)g="This request was not sent, because the checker stopped earlier (see [TODO] or the error above).";else if(!T&&!g){g="You got: "+d.text.replace(/\s*\.{3,}\s*/," → ");const y=Ee(d.errors);y&&(d.status>=500||d.status===0)?g+=`
PHP error: `+je(y,a):d.kind==="todo"?g+=`
The checker does not see your route. Check the method and the URL pattern.`:typeof d.answer=="string"&&/^\s*[\[{]/.test(d.answer)?g+=`
The answer is TWO JSON documents glued together: the route called Flight::json(...) twice. A return; after the first answer (or an else) is missing.`:d.status===404&&/^Endpoint /.test(d.answer?.error||"")&&!/^Endpoint /.test(b.answer?.error||"")?g+=`
No route matches this URL. Check the method (GET/POST/PUT/DELETE) and the path.`:b.status===404&&/^Endpoint /.test(b.answer?.error||"")&&d.status!==404&&(g+=`
This URL must not match a route. Write the id as @id:[0-9]+, so that /abc goes to notFound.`)}r.push({ok:T,label:b.text,hint:g,extra:s.startsWith("x")})})}return r}function C(e){const n=(s,i,c,b)=>`<a href="#${s}"${e===s?' aria-current="page"':""}><span class="num">${i}</span><span class="nm">${c}</span><span class="dot ${b||""}"></span></a>`;let t=n("overview","★","Patterns")+n("t1","1","Setup and start"),a="";q.forEach(s=>{s.group!==a&&(a=s.group,t+='<div class="rail-group">'+m(a)+"</div>");const i=u.status[s.id];t+=n(j(s.id),s.id,m(s.name),i==="done"?"done":i?"tried":"")}),t+='<div class="rail-group">Final</div>'+n("final","✓","Whole test_tasks.php",u.status.full==="done"?"done":u.status.full?"tried":""),l("#rail").innerHTML=t;const r=q.filter(s=>u.status[s.id]==="done").length;l("#prog-text").textContent=r+" / "+q.length,l("#prog-bar").style.width=r/q.length*100+"%"}function Ce(){l("#main").innerHTML=`
    <section class="overview">
      <div class="hero">
        <span class="eyebrow">Presentation Layer · FlightPHP routes</span>
        <p class="lead">In the assignment you get a skeleton with <code>// TODO Task</code> comments and write the routes and the error handler. Here you read the TODO, write the code in the editor and press <b>Check</b>.</p>
        <p>Every route is one of the seven patterns below. Once you know them, a new entity only means another service name and another URL.</p>
        <p class="note">The check does not look at the text of your code. It runs the real <code>week-05</code> backend in the browser: FlightPHP 3.19 from Composer, your <code>index.php</code> and routes, the original services and DAOs, PHP 8.4. Instead of MySQL it uses SQLite with the same data as <code>campusevents.sql</code>, and the output is the same as that of <code>php rest/routes/test_tasks.php</code>. Every request is compared with the original solution, plus extra requests the official checker does not send.</p>
        <div class="sol-tools"><a class="btn primary" href="#t1">Start with Task 1</a><a class="btn" href="#final">Final check</a><button class="btn" type="button" id="reset-all">Delete all progress</button></div>
      </div>
      <div class="patterns">
        ${xe.map(n=>`<div class="card pattern"><h4>${m(n.t)}</h4><p>${m(n.p)}</p><pre class="code">${V(n.c)}</pre></div>`).join("")}
      </div>
    </section>`;let e=!1;l("#reset-all").onclick=n=>{if(!e){e=!0,n.target.textContent="Click again to confirm",setTimeout(()=>{e=!1,n.target.isConnected&&(n.target.textContent="Delete all progress")},3e3);return}u.drafts={},u.status={},R(),C("overview"),L("Progress deleted"),n.target.textContent="Delete all progress",e=!1}}function Ge(){const e=[["Unzip <code>week-05.zip</code> and open the <code>week-05</code> folder in VS Code.",""],["Install FlightPHP in the <code>backend</code> folder. <code>composer.json</code>, <code>composer.lock</code> and <code>vendor/</code> must appear.",`cd week-05/backend
composer require flightphp/core`],["Import the database: first <code>campusevents.sql</code>, then <code>announcements.sql</code>. If you imported them before, import them again to start from clean data.",`mysql -u root -p < database/campusevents.sql
mysql -u root -p campusevents < database/announcements.sql`],["Copy the config and set your MySQL password and port.","cp backend/config/config.example.php backend/config/config.php"],["Start the server in the <code>week-05</code> folder and open <code>/backend/</code> and <code>/backend/clubs</code>. In Postman, send <code>GET /backend/clubs/1</code>.",`php -S localhost:8000 server.php
# http://localhost:8000/backend/
# http://localhost:8000/backend/clubs`],["Run the checker from the <code>backend</code> folder. It starts its own server on port 8765.",`cd week-05/backend
php rest/routes/test_tasks.php`]];u.t1=u.t1||{},l("#main").innerHTML=`
    <div class="task-head">
      <h2><span class="tn">Task 1</span>Install FlightPHP and start the API</h2>
      <div class="chips"><span class="chip">backend/composer.json</span><span class="chip">backend/config/config.php</span></div>
    </div>
    <div class="bench single">
      <div class="brief">
        <div class="card">
          <h3>Steps on your computer</h3>
          <ol class="setup">${e.map(([n,t],a)=>`<li><label><input type="checkbox" data-i="${a}" ${u.t1[a]?"checked":""}> <span>${n}</span></label>${t?`<pre class="code">${m(t)}</pre>`:""}</li>`).join("")}</ol>
        </div>
        <div class="card">
          <h3>Never commit</h3>
          <p class="why"><code>backend/config/config.php</code> (the database password) and <code>backend/vendor/</code> (Composer builds it from <code>composer.json</code>). Both are in the skeleton's <code>.gitignore</code>. <code>composer.json</code> and <code>composer.lock</code> are committed.</p>
        </div>
        <div class="card">
          <h3>Expected checker output (only Task 1 works, [TODO] is correct for now)</h3>
          <pre class="code out">${m(Oe+`

=== Task 2 – one error handler for the whole API ===
[TODO] Task 2.2 – Flight::map('error') is not implemented yet
[TODO] Task 2.3 – Flight::map('notFound') is not implemented yet
...`)}</pre>
        </div>
        <div class="card">
          <h3>If something does not work</h3>
          <ul class="api">
            <li><code>Missing backend/config/config.php</code>: you did not copy config.example.php to config.php.</li>
            <li><code>Failed opening required '.../vendor/autoload.php'</code>: <code>composer require</code> was not run in the <code>backend</code> folder.</li>
            <li>500 on <code>/clubs</code>: wrong password or port in config.php, or the database is not imported.</li>
            <li>HTML instead of JSON on <code>/clubs/999</code>: this is normal until Task 2.2.</li>
            <li><code>Could not start the web server on port 8765</code>: the port is busy. Close the old checker or server.</li>
          </ul>
        </div>
      </div>
    </div>`,document.querySelectorAll(".setup input").forEach(n=>n.onchange=()=>{u.t1[n.dataset.i]=n.checked,R()})}function Ae(e){if(u.mode==="full")return e.todo;const n=e.todo.split(`
`);return`/*
`+(n.find(a=>/TODO|EXTRA/.test(a))||n[1])+`
 */`}function ge(e){const n=u.mode==="exam";l("#main").innerHTML=`
    <div class="task-head">
      <h2><span class="tn">${/^\d$/.test(e.id)?"Task "+e.id:e.id}</span>${m(e.title)}</h2>
      <div class="chips"><span class="chip">${m(e.file)}</span><span class="chip">FlightPHP 3.19 · PHP 8.4 · real HTTP requests</span></div>
    </div>
    <div class="bench">
      <div class="brief">
        <div class="card">
          <h3>TODO from the skeleton</h3>
          <pre class="code todo">${m(Ae(e))}</pre>
        </div>
        ${n?'<div class="card"><h3>Exam mode</h3><p class="why">The instructions are hidden. Write the code from memory, then check it. Switch back to detailed instructions in the top right.</p></div>':`
        <div class="card">
          <h3>What you write</h3>
          <ol class="steps">${e.steps.map(o=>"<li>"+o+"</li>").join("")}</ol>
        </div>
        <div class="card"><h3>Why</h3><p class="why">${e.why}</p></div>
        <div class="card"><h3>Available</h3><ul class="api">${e.api.map(o=>"<li>"+o+"</li>").join("")}</ul></div>`}
        <div class="card">
          <h3>${e.expected?"Expected checker output":"What the trainer checks"}</h3>
          ${e.expected?`<pre class="code out">${m(e.expected)}</pre>`:`<p class="why">${m(e.expectedNote)}</p>`}
        </div>
      </div>
      <div class="splitter" id="splitter" role="separator" aria-orientation="vertical" aria-label="Editor width (left and right arrows, double-click resets)" tabindex="0" title="Drag to change the editor width · double-click resets"></div>
      <div class="brief">
        <div class="card editor-card">
          <div class="ed-bar"><span class="file">${m(e.file.split("/").pop())}</span>
            <span class="ed-tools">
              <button class="ed-btn" type="button" id="btn-font-down" aria-label="Smaller text">A−</button>
              <button class="ed-btn" type="button" id="btn-font-up" aria-label="Larger text">A+</button>
              <button class="ed-btn" type="button" id="btn-wide" aria-pressed="false">Wide editor</button>
            </span>
          </div>
          <div class="editor" id="editor-scroll">
            <div class="gutter" id="gutter" aria-hidden="true">1</div>
            <textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Your PHP code" placeholder="// Write the code that goes under the TODO comment of ${m(e.file.split("/").pop())}.&#10;// No <?php needed at the top."></textarea>
          </div>
          <div class="actions">
            <button class="btn primary" type="button" id="btn-check">Check</button>
            <button class="btn" type="button" id="btn-reset">Reset to starter code</button>
            <span class="kbd">Ctrl + Enter = Check · Esc then Tab = leave the editor · drag the bottom-right corner to change the height</span>
          </div>
          ${n?'<div class="solution"><button class="btn" type="button" id="btn-help">Small hint</button><div id="help-content"></div></div>':`
          <details class="solution" id="sol">
            <summary>Solution</summary>
            <div class="sol-body">
              <pre class="code">${V(e.solution)}</pre>
              <div class="sol-tools">
                <button class="btn" type="button" id="btn-copy">Copy</button>
                <button class="btn" type="button" id="btn-load">Put into editor</button>
              </div>
            </div>
          </details>`}
        </div>
        <div class="card results" id="results">
          <h3>Check result</h3>
          <p class="empty-res">Write the code that goes under the TODO comment and press Check. The trainer puts it into ${m(e.file.split("/").pop())}, starts the API and sends it the same requests as test_tasks.php, plus a few extra ones. The other parts of the backend are already solved.</p>
        </div>
      </div>
    </div>`;const t=l("#code"),a=l("#gutter"),r=e.id==="4.2"&&ye(u.drafts["4.1"]||"")||e.starter;t.value=u.drafts[e.id]??r;const s=l("#editor-scroll"),i=l(".bench"),c=l("#splitter"),b=l(".editor-card"),F=()=>{const o=t.value.split(`
`).length;a.textContent=Array.from({length:o},(w,h)=>h+1).join(`
`),t.style.height="auto",t.style.height=Math.max(s.clientHeight,t.scrollHeight+(t.offsetHeight-t.clientHeight))+"px"},d=u.ui=Object.assign({fs:13.5},u.ui),T=()=>{i.classList.toggle("wide",!!d.wide),d.briefW?i.style.setProperty("--brief-w",d.briefW+"px"):i.style.removeProperty("--brief-w"),d.edH&&(s.style.height=d.edH+"px"),b.style.setProperty("--ed-fs",d.fs+"px"),l("#btn-wide").textContent=d.wide?"Narrow editor":"Wide editor",l("#btn-wide").setAttribute("aria-pressed",String(!!d.wide)),F()},g=o=>{d.briefW=Math.round(Math.min(Math.max(o,240),i.clientWidth-380)),T()};c.addEventListener("pointerdown",o=>{o.preventDefault(),c.setPointerCapture(o.pointerId),c.classList.add("dragging");const w=i.getBoundingClientRect().left,h=P=>g(P.clientX-w-10),x=()=>{c.classList.remove("dragging"),c.removeEventListener("pointermove",h),c.removeEventListener("pointerup",x),R()};c.addEventListener("pointermove",h),c.addEventListener("pointerup",x)}),c.addEventListener("dblclick",()=>{delete d.briefW,T(),R()}),c.addEventListener("keydown",o=>{o.key!=="ArrowLeft"&&o.key!=="ArrowRight"||(o.preventDefault(),g((d.briefW||i.firstElementChild.getBoundingClientRect().width)+(o.key==="ArrowLeft"?-24:24)),R())}),l("#btn-wide").onclick=()=>{d.wide=!d.wide,T(),R()},l("#btn-font-up").onclick=()=>{d.fs=Math.min(20,d.fs+1),T(),R()},l("#btn-font-down").onclick=()=>{d.fs=Math.max(11,d.fs-1),T(),R()};let y=null;const O=new ResizeObserver(()=>{const o=Math.round(s.getBoundingClientRect().height);y!==null&&o!==y&&(d.edH=o,R()),y=o,F()});O.observe(s),H=()=>O.disconnect(),T();let k=!1,p=!1;t.addEventListener("input",()=>{u.drafts[e.id]=t.value,K++,delete u.status.full,u.status[e.id]==="done"&&(u.status[e.id]="tried"),C(j(e.id));const o=l("#results");o&&!p&&(o.innerHTML='<h3>Check result</h3><p class="empty-res">The code changed. Press Check to run the tests.</p>'),R(),F()}),t.addEventListener("keydown",o=>{if(o.key==="Escape"){k=!0;return}if((o.ctrlKey||o.metaKey)&&o.key==="Enter"){o.preventDefault(),_();return}const w=t.value,h=t.selectionStart,x=t.selectionEnd,P=E=>{t.setRangeText(E,h,x,"end"),t.dispatchEvent(new Event("input"))};if(o.key==="Tab"&&!k){if(o.preventDefault(),o.shiftKey){const E=w.lastIndexOf(`
`,h-1)+1,S=w.slice(E).match(/^ {1,4}/);S&&(t.setRangeText("",E,E+S[0].length,"end"),t.selectionStart=t.selectionEnd=Math.max(E,h-S[0].length),t.dispatchEvent(new Event("input")))}else P("    ");return}if(k=!1,o.key==="Enter"){o.preventDefault();const E=w.lastIndexOf(`
`,h-1)+1,S=w.slice(E,h);let A=S.match(/^\s*/)[0];/[{(\[]\s*$/.test(S)&&(A+="    "),P(`
`+A);return}if(o.key==="}"||o.key===")"){const E=w.lastIndexOf(`
`,h-1)+1,S=w.slice(E,h);/^ {4,}$/.test(S)&&(o.preventDefault(),t.setRangeText(S.slice(4)+o.key,E,x,"end"),t.dispatchEvent(new Event("input")))}});async function _(){if(p)return;const o=l("#results"),w=l("#btn-check"),h=t.value;if(!h.trim()){o.innerHTML='<h3>Check result</h3><div class="verdict bad">The editor is empty.</div><p class="note">Write the code that goes under the TODO comment.</p>';return}p=!0,w.disabled=!0,o.setAttribute("aria-busy","true"),o.innerHTML=`<h3>Starting the API...</h3><p>${W?"Sending requests to your routes.":"Loading PHP (the first time takes a few seconds)."}</p>`;const x={...ue(),...e.fix||{}};e.slot.startsWith("b_")&&(x[e.slot]=de[e.slot]);const P={...x,[e.slot]:h},E=await he({type:"check",lint:[h],ref:x,stu:P,only:e.only});if(p=!1,w.disabled=!1,o.removeAttribute("aria-busy"),!!o.isConnected){if(t.value!==h){o.innerHTML="<h3>The code changed during the check</h3><p>Press Check for the new version of the code.</p>";return}$(e,h,E,o)}}function $(o,w,h,x){const P=(v,fe,ne="",ve="")=>`<li class="${v?"pass":"fail"} ${ve}"><span class="mark">${v?"✓":"✗"}</span><span class="lbl"><code class="req">${m(fe)}</code>${ne?'<span class="hint">'+m(ne)+"</span>":""}</span></li>`;if(h.error){u.status[o.id]="tried",R(),C(j(o.id)),x.innerHTML=`<h3>Check result</h3><div class="verdict bad">The check did not finish.</div><pre class="code out">${m(h.error)}</pre>`;return}if(h.lint.length){const v=h.lint[0];u.status[o.id]="tried",R(),C(j(o.id)),x.innerHTML=`<h3>Check result</h3>
        <div class="verdict bad">PHP syntax error on line ${v.line}.</div>
        <ul class="checks"><li class="fail"><span class="mark">✗</span><span class="lbl">${m(v.message)}<span class="hint">Line ${v.line} in the editor (or the line before it). Usually a ; at the end of a line, or a closing } or ) after function () { ... }, is missing.</span></span></li></ul>`,G(v.line);return}const E=Le(h.ref,h.stu,o.only,h.lines),S=E.filter(v=>!v.extra),A=E.filter(v=>v.extra),Z=E.filter(v=>v.ok).length,Y=E.length>0&&Z===E.length;u.status[o.id]=Y?"done":"tried",R(),C(j(o.id));const ee=De.filter(v=>v.test(w)),te=h.stu.filter(v=>o.only.includes(v.tag)&&!v.tag.startsWith("x")||v.kind==="title"&&!1).map(v=>v.text).join(`
`);x.setAttribute("aria-live","polite"),x.innerHTML=`<h3>Check result</h3>
      <div class="verdict ${Y?"ok":"bad"}">${Y?"Every request gives the same answer as the original solution.":"Fix the requests marked with ✗."}<span class="score">${Z}/${E.length}</span></div>
      ${S.length?`<h4 class="sub">From test_tasks.php</h4><ul class="checks">${S.map(v=>P(v.ok,v.label,v.hint)).join("")}</ul>`:""}
      ${A.length?`<h4 class="sub">Extra requests of the trainer</h4><ul class="checks">${A.map(v=>P(v.ok,v.label,v.hint)).join("")}</ul>`:""}
      ${ee.length?`<h4 class="sub">Notes</h4><ul class="checks">${ee.map(v=>`<li class="warn"><span class="mark">!</span><span class="lbl">${v.msg}</span></li>`).join("")}</ul>`:""}
      ${te?`<details class="solution"><summary>Your output (as in the terminal)</summary><pre class="code out">${m(te)}</pre></details>`:""}
      <p class="note">The trainer compares the status and the JSON of every answer with the original solution (time fields are ignored). For the final confirmation, run test_tasks.php in the real project.${h.ms?` · ${Math.round(h.ms)} ms`:""}</p>`}function G(o){const w=t.value.split(`
`),h=w.slice(0,o-1).join(`
`).length+(o>1?1:0);t.focus(),t.setSelectionRange(h,h+(w[o-1]||"").length)}l("#btn-check").onclick=_,l("#btn-reset").onclick=()=>{t.value=r,t.dispatchEvent(new Event("input")),t.focus()};function f(){l("#btn-load").onclick=()=>{t.value=e.solution,t.dispatchEvent(new Event("input")),L("The solution is in the editor")},l("#btn-copy").onclick=()=>{const o=navigator.clipboard&&navigator.clipboard.writeText(e.solution);o?o.then(()=>L("Copied"),()=>L("Select the text and copy it by hand")):L("Select the text and copy it by hand")}}if(!n)f();else{let o=0;l("#btn-help").onclick=()=>{o++;const w=l("#help-content"),h=l("#btn-help");o===1?(w.innerHTML=`<p class="why">${e.why}</p>`,h.textContent="Show the pattern"):o===2?(w.innerHTML+=`<h4>Pattern and available methods</h4><pre class="code">${m(r||`Flight::route('METHOD /resource', function () {
    // Read the request, call the service, send JSON.
});`)}</pre><ul class="api">${e.api.map(x=>"<li>"+x+"</li>").join("")}</ul>`,h.textContent="Show the whole solution"):(w.innerHTML+=`<h4>Solution</h4><pre class="code">${V(e.solution)}</pre><div class="sol-tools"><button class="btn" id="btn-copy">Copy</button><button class="btn" id="btn-load">Put into editor</button></div>`,h.hidden=!0,f())}}}function Ue(){const e=q.filter(t=>!t.slot.startsWith("b_")),n=e.filter(t=>(u.drafts[t.id]||"").trim());l("#main").innerHTML=`
    <div class="task-head">
      <h2><span class="tn">✓</span>Final check: the whole test_tasks.php</h2>
      <div class="chips"><span class="chip">php rest/routes/test_tasks.php</span><span class="chip">all your files together</span></div>
    </div>
    <div class="bench single">
      <div class="brief">
        <div class="card">
          <h3>What runs</h3>
          <p class="why">The trainer puts ALL your code from Tasks 2.1–5 into <code>index.php</code>, <code>CategoryRoutes.php</code>, <code>EventRoutes.php</code> and <code>AnnouncementRoutes.php</code>, as in the real project, and runs the whole checker without any reference code. A task you did not write stays an empty TODO, so the checker prints [TODO] for it.</p>
          <p class="why">Written: ${n.length} / ${e.length} (${n.map(t=>t.id).join(", ")||"nothing yet"}).</p>
          <div class="actions"><button class="btn primary" type="button" id="btn-full">Run test_tasks.php</button><button class="btn" type="button" id="btn-download">Download my PHP files</button></div>
        </div>
        <div class="card results" id="results"><h3>Output</h3><p class="empty-res">Press the button. Green lines are the same as in the lab document, red lines are different.</p></div>
      </div>
    </div>`,l("#btn-download").onclick=()=>{const t={};for(const i of e)u.drafts[i.id]?.trim()&&(t[i.slot]=u.drafts[i.id]);const a=Object.fromEntries(Object.entries(ke(J.templates,t)).filter(([i])=>["index.php","rest/routes/CategoryRoutes.php","rest/routes/EventRoutes.php","rest/routes/AnnouncementRoutes.php"].includes(i)).map(([i,c])=>["backend/"+i,c]));a["README.txt"]=`Your files for Lab 05. Copy backend/ into your week-05 skeleton.
Empty tasks stay TODO. The finished services, DAOs and the config stay from the skeleton.
Check in the real project: cd week-05/backend, then php rest/routes/test_tasks.php
`;const r=URL.createObjectURL(new Blob([Re(a)],{type:"application/zip"})),s=document.createElement("a");s.href=r,s.download="Lab05-my-solution.zip",document.body.append(s),s.click(),s.remove(),setTimeout(()=>URL.revokeObjectURL(r),1e4)},l("#btn-full").onclick=async()=>{const t=l("#results"),a=l("#btn-full");a.disabled=!0,t.innerHTML=`<h3>Running...</h3><p>${W?"Sending 47 requests.":"Loading PHP (the first time takes a few seconds)."}</p>`;const r=K,s={},i=[];for(const p of e){const _=u.drafts[p.id];_&&_.trim()&&(s[p.slot]=_,i.push(_))}const c=await he({type:"check",lint:i,ref:ue(),stu:s,extra:!1},6e4);if(a.disabled=!1,!t.isConnected)return;if(r!==K){t.innerHTML="<h3>The code changed during the check. Run it again.</h3>";return}if(c.error){t.innerHTML=`<h3>Output</h3><pre class="code out">${m(c.error)}</pre>`;return}if(c.lint.length){const p=Object.keys(s)[c.lint[0].index],_=e.find($=>$.slot===p);t.innerHTML=`<h3>Output</h3><div class="verdict bad">Syntax error in Task ${_.id}, line ${c.lint[0].line}: ${m(c.lint[0].message)}</div><p><a class="btn" href="#${j(_.id)}">Open Task ${_.id}</a></p>`;return}const b=c.stu,F={},d={};for(const p of c.ref)p.kind!=="title"&&p.kind!=="blank"&&(F[p.tag]||=[]).push(p);let T=0,g=0;const y=b.map(p=>{if(p.kind==="title"||p.kind==="blank")return`<span class="ln plain">${m(p.text)}</span>`;g++;const _=d[p.tag]=(d[p.tag]??-1)+1,$=$e((F[p.tag]||[])[_],p)&&p.kind!=="todo";return $&&T++,`<span class="ln ${$?"good":"bad"}">${m(p.text)}</span>`}).join(`
`),O=c.ref.filter(p=>p.kind==="line"||p.kind==="text").length,k=T===O&&g===O;u.status.full=k?"done":"tried",R(),C("final"),t.innerHTML=`<h3>Output</h3>
      <div class="verdict ${k?"ok":"bad"}">${k?"The statuses and JSON answers match the solution. Now run the checker in the real project too.":"Some lines are different or missing."}<span class="score">${T}/${O}</span></div>
      <pre class="code out term">${y}</pre>
      ${k?"":'<p class="note">Open the red lines in their task: there you get the exact reason and the PHP error.</p>'}`}}let H=()=>{};function pe(){H(),H=()=>{};const e=location.hash.replace("#",""),n=M[e];C(n||e==="t1"||e==="final"?e:"overview"),n?ge(n):e==="t1"?Ge():e==="final"?Ue():Ce(),window.scrollTo(0,0)}function X(e){u.mode=e,R(),l("#mode-full").setAttribute("aria-pressed",e==="full"),l("#mode-exam").setAttribute("aria-pressed",e==="exam");const n=location.hash.replace("#","");M[n]&&(H(),H=()=>{},ge(M[n]))}l("#mode-full").onclick=()=>X("full");l("#mode-exam").onclick=()=>X("exam");(function(){const n=document.documentElement,t=f=>{try{return localStorage.getItem(f)}catch{return null}},a=(f,o)=>{try{localStorage.setItem(f,o)}catch{}},r=document.getElementById("bg-grid"),s="http://www.w3.org/2000/svg",i=56,c=1600,b=1e3;let F=5;const d=()=>(F=F*16807%2147483647)/2147483647;let T="";for(let f=0;f<=c;f+=i)T+=`M${f} 0V${b}`;for(let f=0;f<=b;f+=i)T+=`M0 ${f}H${c}`;const g=document.createElementNS(s,"path");g.setAttribute("d",T),g.setAttribute("stroke","var(--grid)"),g.setAttribute("stroke-width","1"),g.setAttribute("fill","none"),r.appendChild(g);const y=["var(--cell1)","var(--cell2)","var(--cell3)"];for(let f=0;f<46;f++){const o=document.createElementNS(s,"rect");o.setAttribute("x",Math.floor(d()*c/i)*i+4),o.setAttribute("y",Math.floor(d()*b/i)*i+4),o.setAttribute("width",i-8),o.setAttribute("height",i-8),o.setAttribute("rx",10),o.setAttribute("fill",y[f%3]),r.appendChild(o)}const O=t("ibu-theme");O&&(n.dataset.theme=O),document.getElementById("theme").onclick=()=>{const f=n.dataset.theme?n.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;n.dataset.theme=f?"light":"dark",a("ibu-theme",n.dataset.theme)};const k="lab05-trainer-battery-saver",p=t(k);let _=p===null?matchMedia("(prefers-reduced-transparency: reduce)").matches:p==="true";const $=document.getElementById("battery-saver"),G=()=>{n.dataset.batterySaver=String(_),$.setAttribute("aria-pressed",String(_)),$.querySelector(".lbl").textContent="Battery saver: "+(_?"on":"off")};G(),$.onclick=()=>{_=!_,a(k,String(_)),G()}})();le();X(u.mode);window.addEventListener("hashchange",pe);pe();
