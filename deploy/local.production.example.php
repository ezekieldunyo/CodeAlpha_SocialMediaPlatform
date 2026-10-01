<?php
// Live settings for the deployed site (InfinityFree).
//
// Copy this file to deploy/local.production.php (gitignored, never committed)
// and replace every value. `node deploy/build.mjs` then puts it into the upload
// folder as config/local.php.
//
// Where the values come from, in the InfinityFree control panel:
//   MySQL Databases -> "MySQL Hostname", the database name and "MySQL Username"
//   Account details  -> the hosting account password is the MySQL password
return [
    'DB_HOST' => 'sqlXXX.infinityfree.com',
    'DB_NAME' => 'if0_XXXXXXXX_wavelink',
    'DB_USER' => 'if0_XXXXXXXX',
    'DB_PASS' => 'YOUR_HOSTING_ACCOUNT_PASSWORD',

    // Signs login tokens. Any long random text; generate one with:
    //   php -r "echo bin2hex(random_bytes(32));"
    // Changing it later logs everyone out.
    'JWT_SECRET' => 'PASTE_64_RANDOM_CHARACTERS_HERE',

    // The live site's address, no trailing slash. Use https:// once the free
    // SSL certificate is active, http:// until then.
    'CORS_ORIGINS' => 'https://YOUR-SITE.infinityfreeapp.com',
    'UPLOADS_URL' => 'https://YOUR-SITE.infinityfreeapp.com/uploads',
];
