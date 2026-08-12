#!/usr/bin/env bash
set -e

FILE="server.ts"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run this from the repo root."
  exit 1
fi

BACKUP="${FILE}.bak-$(date +%s)"
cp "$FILE" "$BACKUP"
echo "Backup saved: $BACKUP"

if grep -q "X-Total-Count" "$FILE"; then
  echo "SKIP: X-Total-Count already exposed in $FILE"
  exit 0
fi

PERL_SCRIPT="$(mktemp /tmp/cors_patch.XXXXXX.pl)"

cat > "$PERL_SCRIPT" <<'PERLEOF'
use strict;
use warnings;

my $file = shift @ARGV;
open(my $fh, '<', $file) or die "Cannot open $file: $!";
local $/;
my $content = <$fh>;
close($fh);

my $anchor = "exposedHeaders: ['Content-Range', 'X-Content-Range'],";
my $replacement = "exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],";

if (index($content, $anchor) == -1) {
    die "ASSERTION FAILED: anchor not found. Open server.ts and add 'X-Total-Count' to exposedHeaders manually.\n";
}

$content =~ s/\Q$anchor\E/$replacement/;

open(my $out, '>', $file) or die "Cannot write $file: $!";
print $out $content;
close($out);

print "Applied: added X-Total-Count to exposedHeaders\n";
PERLEOF

perl "$PERL_SCRIPT" "$FILE"
rm -f "$PERL_SCRIPT"

echo "CORS header patch complete: $FILE"
