<?php
require_once __DIR__ . '/BaseService.php';
require_once __DIR__ . '/../dao/EventDao.php';

class EventService extends BaseService
{
    protected $entity_name = 'Event';

    public function __construct($dao = null)
    {
        parent::__construct($dao ?? new EventDao());
    }

    protected function validate($event, $id = null)
    {
        Validator::required($event, ['club_id', 'title', 'location', 'starts_at']);
        Validator::datetime($event['starts_at'], 'starts_at');
    }
}
