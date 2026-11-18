<?php
require_once __DIR__ . '/BaseDao.php';

class ClubDao extends BaseDao
{
    public function __construct()
    {
        parent::__construct('clubs', ['name', 'description']);
    }
}
