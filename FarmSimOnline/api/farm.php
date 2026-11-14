<?php
/**
 * FarmSim Online – pelitilojen tallennus.
 *
 * Tietosuoja: tallentaa vain nimimerkin, salakoodin tiivisteen (password_hash), istuntotunnisteiden
 * SHA-256-tiivisteet, pelitilan, naapurilistan tiedot (tilan nimi, alue, pelivuosi, varallisuus) ja aikaleimat.
 * IP-osoitteita tai muita tunnistetietoja EI tallenneta. Pelaaja voi poistaa tilansa (a=delete).
 *
 * Vaatimukset: PHP 7.0 tai uudempi ja kirjoitusoikeus kansioon api/data/.
 *
 * Rajapinta:
 *   GET  farm.php?a=check                → { ok }
 *   GET  farm.php?a=top[&me=<nimi>]      → { ok, entries: [{ r, n, f, g, y, w, me? }] }
 *   POST farm.php (JSON)
 *     { a:'create', name }               → { ok, code, token, now }
 *     { a:'login', name, code }          → { ok, token, state, savedAt, now }
 *     { a:'save', name, token, state, meta:{worth,year,farm,region} } → { ok, savedAt }
 *     { a:'delete', name, code }         → { ok, deleted }
 */

@ini_set('display_errors', '0'); // varoitukset eivät saa rikkoa JSON-vastausta
ob_start();

define('FA_DIR', __DIR__ . '/data');
define('FA_FARMS', FA_DIR . '/farms');
define('FA_INDEX', FA_DIR . '/index.json');
define('FA_LOCK', FA_DIR . '/farm.lock');
define('FA_MAX_BODY', 800000);     // pyynnön enimmäiskoko tavuina
define('FA_MAX_STATE', 700000);    // pelitilan enimmäiskoko
define('FA_MAX_FARMS', 5000);      // tilojen enimmäismäärä palvelimella
define('FA_NEW_PER_MIN', 20);      // uusia nimimerkkejä enintään minuutissa (roskapostisuoja ilman IP-osoitteita)
define('FA_MAX_FAILS', 8);         // väärät salakoodit ennen lukitusta
define('FA_LOCK_SECS', 300);       // lukituksen kesto
define('FA_TOKENS', 3);            // samanaikaiset istunnot (laitteet)
define('FA_TOP', 50);

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: same-origin');

function fa_out($data, $code = 200)
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fa_fail($error, $code = 400)
{
    fa_out(array('ok' => false, 'error' => $error), $code);
}

function fa_lock()
{
    if (!is_dir(FA_FARMS) && !@mkdir(FA_FARMS, 0755, true)) {
        fa_fail('storage', 500);
    }
    $fh = @fopen(FA_LOCK, 'c');
    if ($fh === false) {
        fa_fail('storage', 500);
    }
    @flock($fh, LOCK_EX);
    return $fh;
}

function fa_unlock($fh)
{
    @flock($fh, LOCK_UN);
    @fclose($fh);
}

function fa_read($file, $default)
{
    if (!is_file($file)) {
        return $default;
    }
    $raw = @file_get_contents($file);
    $j = $raw === false ? null : json_decode($raw, true);
    return is_array($j) ? $j : $default;
}

function fa_write($file, $data)
{
    $tmp = $file . '.tmp';
    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0);
    $json = json_encode($data, $flags);
    if ($json === false || @file_put_contents($tmp, $json, LOCK_EX) === false || !@rename($tmp, $file)) {
        @unlink($tmp);
        fa_fail('storage', 500);
    }
}

function fa_name($raw)
{
    $n = trim(preg_replace('/\s+/u', ' ', (string)$raw));
    if (!preg_match('/^[\p{L}\p{N} ._\-]{2,20}$/u', $n)) {
        fa_fail('name');
    }
    return $n;
}

function fa_key($name)
{
    $lower = function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
    return hash('sha256', $lower);
}

function fa_sub($s, $len)
{
    $s = preg_replace('/[\x00-\x1f<>]/u', '', $s);
    return function_exists('mb_substr') ? mb_substr($s, 0, $len, 'UTF-8') : substr($s, 0, $len);
}

function fa_file($name)
{
    return FA_FARMS . '/' . fa_key($name) . '.json';
}

function fa_code()
{
    $words = array('KANA', 'LEHMA', 'SIKA', 'PELTO', 'VILJA', 'HEINA', 'SIILO', 'LAMMAS', 'OHRA', 'KAURA', 'NAURIS', 'PERUNA', 'TRAKTORI', 'AURA', 'POUTA', 'SATO');
    return $words[random_int(0, count($words) - 1)] . '-' . str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
}

function fa_token(&$farm)
{
    $token = bin2hex(random_bytes(16));
    $list = isset($farm['tokens']) && is_array($farm['tokens']) ? $farm['tokens'] : array();
    array_unshift($list, hash('sha256', $token));
    $farm['tokens'] = array_slice($list, 0, FA_TOKENS);
    return $token;
}

function fa_index_update($name, $meta)
{
    $idx = fa_read(FA_INDEX, array('farms' => array(), 'newMin' => 0, 'newCount' => 0));
    $k = fa_key($name);
    if ($meta === null) {
        unset($idx['farms'][$k]);
    } else {
        $idx['farms'][$k] = array(
            'n' => $name,
            'f' => fa_sub((string)(isset($meta['farm']) ? $meta['farm'] : ''), 24),
            'g' => preg_replace('/[^a-z]/', '', (string)(isset($meta['region']) ? $meta['region'] : '')),
            'y' => max(1, min(9999, (int)(isset($meta['year']) ? $meta['year'] : 1))),
            'w' => max(-1e9, min(1e12, (float)(isset($meta['worth']) ? $meta['worth'] : 0))),
            't' => time()
        );
    }
    fa_write(FA_INDEX, $idx);
}

/* ---------- GET ---------- */

$a = isset($_GET['a']) ? $_GET['a'] : '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($a === 'check') {
        fa_out(array('ok' => true));
    }
    if ($a === 'top') {
        $idx = fa_read(FA_INDEX, array('farms' => array()));
        $rows = isset($idx['farms']) && is_array($idx['farms']) ? array_values($idx['farms']) : array();
        usort($rows, function ($x, $y) { return $y['w'] <=> $x['w']; });
        $me = isset($_GET['me']) ? fa_key(trim((string)$_GET['me'])) : '';
        $out = array();
        foreach (array_slice($rows, 0, FA_TOP) as $i => $r) {
            $e = array('r' => $i + 1, 'n' => $r['n'], 'f' => $r['f'], 'g' => $r['g'], 'y' => $r['y'], 'w' => round($r['w']));
            if ($me !== '' && fa_key($r['n']) === $me) {
                $e['me'] = true;
            }
            $out[] = $e;
        }
        fa_out(array('ok' => true, 'entries' => $out, 'total' => count($rows)));
    }
    fa_fail('action');
}

/* ---------- POST ---------- */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fa_fail('method', 405);
}
$raw = file_get_contents('php://input', false, null, 0, FA_MAX_BODY + 1);
if ($raw === false || strlen($raw) > FA_MAX_BODY) {
    fa_fail('size', 413);
}
$in = json_decode($raw, true);
if (!is_array($in)) {
    fa_fail('json');
}
$a = isset($in['a']) ? $in['a'] : '';
$name = fa_name(isset($in['name']) ? $in['name'] : '');
$file = fa_file($name);
$now = time();

$lock = fa_lock();

if ($a === 'create') {
    if (is_file($file)) {
        fa_unlock($lock);
        fa_fail('taken', 409);
    }
    $idx = fa_read(FA_INDEX, array('farms' => array(), 'newMin' => 0, 'newCount' => 0));
    $min = (int)floor($now / 60);
    if (!isset($idx['newMin']) || (int)$idx['newMin'] !== $min || !isset($idx['newCount'])) {
        $idx['newMin'] = $min;
        $idx['newCount'] = 0;
    }
    if ($idx['newCount'] >= FA_NEW_PER_MIN || count(glob(FA_FARMS . '/*.json')) >= FA_MAX_FARMS) {
        fa_unlock($lock);
        fa_fail('busy', 429);
    }
    $idx['newCount']++;
    fa_write(FA_INDEX, $idx);
    $code = fa_code();
    $farm = array('name' => $name, 'codeHash' => password_hash($code, PASSWORD_DEFAULT), 'created' => $now, 'savedAt' => 0, 'state' => null, 'fails' => 0, 'lockUntil' => 0);
    $token = fa_token($farm);
    fa_write($file, $farm);
    fa_unlock($lock);
    fa_out(array('ok' => true, 'code' => $code, 'token' => $token, 'now' => $now));
}

$farm = fa_read($file, null);

if ($a === 'login' || $a === 'delete') {
    $code = strtoupper(trim((string)(isset($in['code']) ? $in['code'] : '')));
    if (!$farm) {
        fa_unlock($lock);
        fa_fail('auth', 403);
    }
    if ($farm['lockUntil'] > $now) {
        fa_unlock($lock);
        fa_fail('locked', 429);
    }
    if (!password_verify($code, $farm['codeHash'])) {
        $farm['fails'] = (int)$farm['fails'] + 1;
        if ($farm['fails'] >= FA_MAX_FAILS) {
            $farm['fails'] = 0;
            $farm['lockUntil'] = $now + FA_LOCK_SECS;
        }
        fa_write($file, $farm);
        fa_unlock($lock);
        fa_fail('auth', 403);
    }
    $farm['fails'] = 0;
    if ($a === 'delete') {
        @unlink($file);
        fa_index_update($name, null);
        fa_unlock($lock);
        fa_out(array('ok' => true, 'deleted' => true));
    }
    $token = fa_token($farm);
    fa_write($file, $farm);
    fa_unlock($lock);
    fa_out(array('ok' => true, 'token' => $token, 'state' => $farm['state'], 'savedAt' => $farm['savedAt'], 'now' => $now));
}

if ($a === 'save') {
    $token = (string)(isset($in['token']) ? $in['token'] : '');
    if (!$farm || !preg_match('/^[0-9a-f]{32}$/', $token) || !in_array(hash('sha256', $token), (array)$farm['tokens'], true)) {
        fa_unlock($lock);
        fa_fail('token', 403);
    }
    $state = isset($in['state']) ? $in['state'] : null;
    if (!is_string($state) || strlen($state) > FA_MAX_STATE || $state === '' || $state[0] !== '{') {
        fa_unlock($lock);
        fa_fail('size', 413);
    }
    $farm['state'] = $state;
    $farm['savedAt'] = $now;
    fa_write($file, $farm);
    fa_index_update($farm['name'], isset($in['meta']) && is_array($in['meta']) ? $in['meta'] : array());
    fa_unlock($lock);
    fa_out(array('ok' => true, 'savedAt' => $now));
}

fa_unlock($lock);
fa_fail('action');
