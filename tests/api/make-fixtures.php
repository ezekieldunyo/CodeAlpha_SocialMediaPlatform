<?php
// Generates the upload test files into the given directory, so no binary
// fixtures need to be committed.  php tests/api/make-fixtures.php <dir>
$dir = rtrim($argv[1] ?? '', '/\\');
if ($dir === '' || !is_dir($dir)) {
    fwrite(STDERR, "usage: php make-fixtures.php <existing-dir>\n");
    exit(1);
}

// Small real images in each accepted format.
$img = imagecreatetruecolor(64, 48);
for ($x = 0; $x < 64; $x++) {
    imageline($img, $x, 0, $x, 47, imagecolorallocate($img, 10, 26 + $x * 2, 51 + $x * 3));
}
imagepng($img, "$dir/real.png");
imagejpeg($img, "$dir/real.jpg", 90);
imagegif($img, "$dir/real.gif");
imagewebp($img, "$dir/real.webp", 90);

// A real PNG of about 4.7 MB (random pixels don't compress): above PHP's 2 MB
// default upload limit, below the API's 5 MB limit.
mt_srand(42);
$big = imagecreatetruecolor(1250, 1250);
for ($y = 0; $y < 1250; $y++) {
    for ($x = 0; $x < 1250; $x++) {
        imagesetpixel($big, $x, $y, mt_rand(0, 0xFFFFFF));
    }
}
imagepng($big, "$dir/big-under-limit.png", 0);

// A real, decodable PNG padded past 5 MB (bytes after IEND are ignored by
// decoders), so it fails on size alone.
file_put_contents("$dir/too-large.png", file_get_contents("$dir/real.png") . str_repeat("\0", 5 * 1024 * 1024 + 1024));

// Not images: a text file with an image extension, a PNG signature and header
// followed by junk, an SVG (XML, not a raster image) and a PHP script
// pretending to be a GIF.
file_put_contents("$dir/not-an-image.png", "This is plain text, not a picture.\n");
file_put_contents("$dir/fake-header.png", substr(file_get_contents("$dir/real.png"), 0, 33) . str_repeat('junk', 200));
file_put_contents("$dir/drawing.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
file_put_contents("$dir/polyglot.gif", "GIF89a\x0a\x00\x0a\x00\x80\x00\x00<?php echo 'pwned'; ?>");
file_put_contents("$dir/empty.png", '');

foreach (glob("$dir/*") as $f) {
    printf("  %-22s %9d bytes\n", basename($f), filesize($f));
}
