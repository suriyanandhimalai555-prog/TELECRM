#!/usr/bin/env bash
set -e

FILE="src/views/whatsapp/WhatsAppInbox.tsx"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run this from the repo root."
  exit 1
fi

BACKUP="${FILE}.bak-$(date +%s)"
cp "$FILE" "$BACKUP"
echo "Backup saved: $BACKUP"

PERL_SCRIPT="./whatsapp_windowing_patch.pl"
rm -f "$PERL_SCRIPT"

cat > "$PERL_SCRIPT" <<'PERLEOF'
use strict;
use warnings;

my $file = shift @ARGV;
open(my $fh, '<', $file) or die "Cannot open $file: $!";
local $/;
my $content = <$fh>;
close($fh);

my $applied = 0;

sub apply_change {
    my ($content_ref, $label, $anchor, $replacement) = @_;
    if (index($$content_ref, $replacement) != -1) {
        print "SKIP (already applied): $label\n";
        return 0;
    }
    if (index($$content_ref, $anchor) == -1) {
        die "ASSERTION FAILED: anchor not found for: $label\n";
    }
    my $quoted_anchor = quotemeta($anchor);
    $$content_ref =~ s/$quoted_anchor/$replacement/;
    print "Applied: $label\n";
    return 1;
}

# 1. Add visibleMessageCount state
my $anchor1 = "  const [messages, setMessages] = useState<Message[]>([]);";
my $replacement1 = "  const [messages, setMessages] = useState<Message[]>([]);\n  const [visibleMessageCount, setVisibleMessageCount] = useState(50);";
$applied += apply_change(\$content, "add visibleMessageCount state", $anchor1, $replacement1);

# 2. Reset visibleMessageCount on new fetch
my $anchor2 = <<'ANCHOR2';
  const fetchMessages = useCallback(async (phone: string) => {
    try {
      const res = await api.get(`/whatsapp/history/${phone}?account=${accountIndex}`);
      setMessages(Array.isArray(res.data) ? res.data : (res.data.messages || []));
    } catch { }
  }, [accountIndex]);
ANCHOR2
chomp $anchor2;

my $replacement2 = <<'REPL2';
  const fetchMessages = useCallback(async (phone: string) => {
    try {
      const res = await api.get(`/whatsapp/history/${phone}?account=${accountIndex}`);
      setMessages(Array.isArray(res.data) ? res.data : (res.data.messages || []));
      setVisibleMessageCount(50);
    } catch { }
  }, [accountIndex]);
REPL2
chomp $replacement2;

$applied += apply_change(\$content, "reset visibleMessageCount on fetch", $anchor2, $replacement2);

# 3. Derive displayedMessages window
my $anchor3 = <<'ANCHOR3';
  // Deduplicate messages before display
  const deduplicatedMessages = messages.filter((msg, index, self) =>
    index === self.findIndex(m => 
      m.message_id === msg.message_id || 
      (m.message_text === msg.message_text && 
       m.direction === msg.direction &&
       Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 60000)
    )
  );
ANCHOR3
chomp $anchor3;

my $replacement3 = <<'REPL3';
  // Deduplicate messages before display
  const deduplicatedMessages = messages.filter((msg, index, self) =>
    index === self.findIndex(m => 
      m.message_id === msg.message_id || 
      (m.message_text === msg.message_text && 
       m.direction === msg.direction &&
       Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 60000)
    )
  );

  const displayedMessages = deduplicatedMessages.slice(-visibleMessageCount);
  const hasOlderMessages = deduplicatedMessages.length > visibleMessageCount;
REPL3
chomp $replacement3;

$applied += apply_change(\$content, "derive displayedMessages window", $anchor3, $replacement3);

# 4. Render displayedMessages with a Load Earlier Messages button
my $anchor4 = <<'ANCHOR4';
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#f0f2f5]">
              {deduplicatedMessages.map((m, idx) => {
                const isOut = m.direction === 'outbound';
                const parsed = parseMessage(m.message_text);
                const showDate = idx === 0 || new Date(m.timestamp).toDateString() !== new Date(deduplicatedMessages[idx-1].timestamp).toDateString();
ANCHOR4
chomp $anchor4;

my $replacement4 = <<'REPL4';
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#f0f2f5]">
              {hasOlderMessages && (
                <div className="flex justify-center pb-2">
                  <button
                    onClick={() => setVisibleMessageCount(c => c + 50)}
                    className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50"
                  >
                    Load Earlier Messages
                  </button>
                </div>
              )}
              {displayedMessages.map((m, idx) => {
                const isOut = m.direction === 'outbound';
                const parsed = parseMessage(m.message_text);
                const showDate = idx === 0 || new Date(m.timestamp).toDateString() !== new Date(displayedMessages[idx-1].timestamp).toDateString();
REPL4
chomp $replacement4;

$applied += apply_change(\$content, "render displayedMessages + Load Earlier button", $anchor4, $replacement4);

open(my $out, '>', $file) or die "Cannot write $file: $!";
print $out $content;
close($out);

print "Done. Changes applied: $applied\n";
PERLEOF

perl "$PERL_SCRIPT" "$FILE"
rm -f "$PERL_SCRIPT"

echo "WhatsApp message windowing patch complete: $FILE"
