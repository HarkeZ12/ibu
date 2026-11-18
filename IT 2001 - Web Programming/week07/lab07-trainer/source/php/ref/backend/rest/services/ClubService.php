<?php
require_once __DIR__ . '/BaseService.php';
require_once __DIR__ . '/../dao/ClubDao.php';

class ClubService extends BaseService
{
    protected $entity_name = 'Club';

    public function __construct($dao = null)
    {
        parent::__construct($dao ?? new ClubDao());
    }

    protected function validate($club, $id = null)
    {
        Validator::required($club, ['name']);
        Validator::length($club['name'], 'name', 2, 100);
    }
}
